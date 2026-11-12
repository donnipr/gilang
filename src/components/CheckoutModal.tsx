'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { CartItem, Transaction } from '@/context/CartContext';

export type PaymentMethod = 'tunai' | 'qris' | 'gofood' | 'grabfood';

export interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  subtotal: number;
  tax: number;
  serviceCharge: number;
  totalAmount: number;
  cashierName?: string;
  onSuccess: (tx: Transaction) => void;
  clearCart: () => void;
  loadMenu?: () => Promise<void>;
}

export default function CheckoutModal({
  isOpen,
  onClose,
  cart,
  subtotal,
  tax,
  serviceCharge,
  totalAmount,
  cashierName = 'Gilang',
  onSuccess,
  clearCart,
  loadMenu,
}: CheckoutModalProps) {
  // 1. State Metode Pembayaran
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('tunai');

  // 2. State Input Pembayaran
  const [amountReceivedInput, setAmountReceivedInput] = useState<string>(''); // Tunai
  const [referenceId, setReferenceId] = useState<string>(''); // GoFood / GrabFood

  // UI State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Helper format Rupiah
  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Reset form setiap kali modal dibuka
  useEffect(() => {
    if (isOpen) {
      setPaymentMethod('tunai');
      setAmountReceivedInput('');
      setReferenceId('');
      setErrorMessage(null);
      setToastMessage(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Kalkulasi Real-time Kembalian Tunai
  const numericReceived = parseFloat(amountReceivedInput) || 0;
  const changeAmount = numericReceived - totalAmount;
  const isCashInsufficient = numericReceived < totalAmount;

  // Nonaktifkan tombol "Bayar" jika Uang Diterima kurang dari Total Belanja
  const isBayarDisabled = useMemo(() => {
    if (isSubmitting) return true;
    if (cart.length === 0 || totalAmount <= 0) return true;
    if (paymentMethod === 'tunai') {
      return !amountReceivedInput || isCashInsufficient;
    }
    return false;
  }, [isSubmitting, cart.length, totalAmount, paymentMethod, amountReceivedInput, isCashInsufficient]);

  // Shortcut nominal cepat
  const handleQuickAmount = (amount: number) => setAmountReceivedInput(amount.toString());
  const handleAddQuickAmount = (extra: number) => {
    const current = parseFloat(amountReceivedInput) || 0;
    setAmountReceivedInput((current + extra).toString());
  };

  // 1. PERBAIKAN LOGIKA DATABASE (SUPABASE) SESUAI SKEMA ASLI
  const handleBayar = async () => {
    if (isBayarDisabled) return;

    if (!supabase) {
      const errMsg = 'Koneksi ke Supabase belum terkonfigurasi. Periksa NEXT_PUBLIC_SUPABASE_URL dan KEY di file .env.local.';
      console.error(errMsg);
      setErrorMessage(errMsg);
      alert(`Error: ${errMsg}`);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // 1. Persiapan Data sesuai Skema Tabel `transactions`
      const receiptNo = `TRX-${Date.now()}`;
      const totalItems = cart.reduce((acc, curr) => acc + curr.quantity, 0);
      const calculatedSubtotal = totalAmount;
      const paymentAmount = paymentMethod === 'tunai' ? numericReceived : totalAmount;
      const calculatedChange = paymentMethod === 'tunai' ? Math.max(0, changeAmount) : 0;
      const activeCashier = cashierName || 'Kasir Utama';

      const formattedItems = cart.map((c) => ({
        productId: c.item.id,
        productName: c.item.name,
        quantity: c.quantity,
        price: Number(c.item.price),
        notes: c.notes || '',
      }));

      // =========================================================================
      // LANGKAH 1: INSERT KE TABEL `transactions`
      // Catatan: Kolom `payment_method` dan `reference_id` diabaikan sementara
      // karena belum tersedia pada skema database asli.
      // =========================================================================
      const txPayload = {
        receipt_no: receiptNo,
        total_items: totalItems,
        subtotal: calculatedSubtotal,
        tax: 0,
        service_charge: 0,
        total_amount: calculatedSubtotal,
        payment_amount: paymentAmount,
        change_amount: calculatedChange,
        cashier: activeCashier,
        items: formattedItems,
      };

      const { data: trx, error: trxErr } = await supabase
        .from('transactions')
        .insert([txPayload])
        .select()
        .single();

      if (trxErr) {
        console.error('Supabase error saat insert transactions:', trxErr);
        throw new Error(trxErr.message || 'Gagal menyimpan transaksi utama ke tabel transactions.');
      }

      // =========================================================================
      // LANGKAH 2: INSERT KE TABEL `transaction_details`
      // Menggunakan `receipt_no` yang di-generate di Langkah 1
      // =========================================================================
      const detailsPayload = cart.map((cartItem) => ({
        receipt_no: receiptNo,
        product_id: cartItem.item.id,
        product_name: cartItem.item.name,
        quantity: Number(cartItem.quantity),
        price: Number(cartItem.item.price),
      }));

      const { error: detailsErr } = await supabase
        .from('transaction_details')
        .insert(detailsPayload);

      if (detailsErr) {
        console.error('Supabase error saat insert transaction_details:', detailsErr);
        throw new Error(`Gagal menyimpan rincian produk ke transaction_details: ${detailsErr.message}`);
      }

      // =========================================================================
      // LANGKAH 3: JIKA SUKSES — BERI NOTIFIKASI, KOSONGKAN KERANJANG & TUTUP MODAL
      // =========================================================================
      const refId =
        (paymentMethod === 'gofood' || paymentMethod === 'grabfood') && referenceId.trim()
          ? referenceId.trim()
          : undefined;

      const completedTransaction: Transaction = {
        id: trx?.receipt_no || receiptNo,
        timestamp: trx?.created_at || new Date().toISOString(),
        cashier: activeCashier,
        items: formattedItems,
        totalItems,
        subtotal: calculatedSubtotal,
        tax: 0,
        serviceCharge: 0,
        total: calculatedSubtotal,
        payment: paymentAmount,
        change: calculatedChange,
        paymentMethod,
        referenceId: refId,
        isSynced: true,
      };

      // Simpan riwayat transaksi ke localStorage sebagai cadangan lokal
      try {
        const stored = localStorage.getItem('pizza_pos_transactions');
        const list = stored ? JSON.parse(stored) : [];
        localStorage.setItem('pizza_pos_transactions', JSON.stringify([completedTransaction, ...list]));
      } catch (e) {
        console.error('Error saving local backup:', e);
      }

      // Reload menu jika prop tersedia
      if (loadMenu) {
        try {
          await loadMenu();
        } catch (e) {
          console.warn('Gagal reload menu:', e);
        }
      }

      // Notifikasi sukses
      setToastMessage('Transaksi Berhasil Disimpan!');

      // Kosongkan keranjang dan tutup modal
      setTimeout(() => {
        clearCart();
        onClose();
        onSuccess(completedTransaction);
      }, 600);

    } catch (err: any) {
      console.error('Terjadi kesalahan saat memproses pembayaran:', err);
      const message = err.message || 'Terjadi kesalahan sistem saat menyimpan ke database Supabase.';
      setErrorMessage(message);
      alert(`Gagal Menyimpan Transaksi!\n\n${message}`);
      setIsSubmitting(false);
      // Keranjang Belanja TIDAK dikosongkan dan Modal TIDAK ditutup jika error
    }
  };

  if (!isOpen) return null;

  return (
    /* Layout Modal & Overlay: Center vertikal dan horizontal, backdrop gelap transparan */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        zIndex: 1050,
      }}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      {/* Toast Notifikasi Sukses */}
      {toastMessage && (
        <div
          className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-3 bg-slate-900 text-slate-50 border-l-4 border-yellow-400 rounded-xl shadow-xl animate-bounce text-sm font-bold"
          style={{ zIndex: 1100 }}
        >
          <svg className="w-5 h-5 text-yellow-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modal Card Utama */}
      <div
        className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-xl p-6 sm:p-7 relative mx-auto my-auto max-h-[92vh] overflow-y-auto"
        style={{
          maxWidth: '32rem',
          backgroundColor: '#ffffff',
          borderRadius: '1rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="pb-3 border-b border-slate-200">
          <h3 className="text-xl font-bold text-slate-900 leading-tight">
            Pembayaran
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Pilih metode pembayaran dan selesaikan transaksi kasir
          </p>
        </div>

        {/* Total Belanja */}
        <div className="mt-3 mb-3.5 py-2.5 px-4 rounded-xl bg-slate-50 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Total Tagihan
            </span>
            <div className="text-xl sm:text-2xl font-bold text-slate-800 leading-tight">
              {formatIDR(totalAmount)}
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg shadow-sm">
            {cart.reduce((sum, item) => sum + item.quantity, 0)} Item
          </span>
        </div>

        {/* Tombol Metode Pembayaran */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
            Metode Pembayaran
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            
            {/* Tunai */}
            <button
              type="button"
              onClick={() => setPaymentMethod('tunai')}
              className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all text-center ${
                paymentMethod === 'tunai'
                  ? 'bg-yellow-400 border-2 border-yellow-500 text-slate-900 font-bold shadow-sm'
                  : 'bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {/* Ikon Cash / Banknote (Heroicons) */}
              <svg className="w-5 h-5 mb-1.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <circle cx="12" cy="12" r="2.5" />
                <path d="M6 12h.01M18 12h.01" />
              </svg>
              <span className="text-xs">Tunai</span>
            </button>

            {/* QRIS */}
            <button
              type="button"
              onClick={() => setPaymentMethod('qris')}
              className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all text-center ${
                paymentMethod === 'qris'
                  ? 'bg-yellow-400 border-2 border-yellow-500 text-slate-900 font-bold shadow-sm'
                  : 'bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {/* Ikon QR Code (Heroicons) */}
              <svg className="w-5 h-5 mb-1.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <path d="M14 14h3v3h-3zM18 18h3v3h-3zM14 18v3M18 14v3" />
              </svg>
              <span className="text-xs">QRIS</span>
            </button>

            {/* GoFood */}
            <button
              type="button"
              onClick={() => setPaymentMethod('gofood')}
              className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all text-center ${
                paymentMethod === 'gofood'
                  ? 'bg-yellow-400 border-2 border-yellow-500 text-slate-900 font-bold shadow-sm'
                  : 'bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {/* Ikon Shopping Bag / Food Delivery (Heroicons) */}
              <svg className="w-5 h-5 mb-1.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <span className="text-xs">GoFood</span>
            </button>

            {/* GrabFood */}
            <button
              type="button"
              onClick={() => setPaymentMethod('grabfood')}
              className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all text-center ${
                paymentMethod === 'grabfood'
                  ? 'bg-yellow-400 border-2 border-yellow-500 text-slate-900 font-bold shadow-sm'
                  : 'bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {/* Ikon Fast Delivery / Utensils (Heroicons) */}
              <svg className="w-5 h-5 mb-1.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M12 2a5 5 0 00-5 5v3H5a2 2 0 00-2 2v2a2 2 0 002 2h14a2 2 0 002-2v-2a2 2 0 00-2-2h-2V7a5 5 0 00-5-5zM9 10V7a3 3 0 016 0v3H9z" />
              </svg>
              <span className="text-xs">GrabFood</span>
            </button>

          </div>
        </div>

        {/* Form Berdasarkan Metode Pembayaran */}

        {/* JIKA METODE TUNAI */}
        {paymentMethod === 'tunai' && (
          <div className="space-y-3.5">
            {/* Input "Uang Diterima" tanpa spinner bawaan browser */}
            <div>
              <label className="block text-xs font-semibold text-slate-900 mb-1.5">
                Uang Diterima
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-base">
                  Rp
                </span>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="0"
                  value={amountReceivedInput}
                  onChange={(e) => setAmountReceivedInput(e.target.value)}
                  autoFocus
                  className="w-full h-11 sm:h-12 pl-12 pr-4 bg-white border border-slate-200 shadow-sm rounded-xl text-xl font-bold text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-yellow-400 focus:border-yellow-400 text-right transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>

            {/* Tombol Nominal Cepat (Grid 3 Kolom) */}
            <div>
              <span className="block text-xs font-medium text-slate-500 mb-1.5">Pilihan Cepat:</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickAmount(totalAmount)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold py-2 px-3 rounded-lg text-xs sm:text-sm transition-colors text-center"
                >
                  Uang Pas
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAmount(50000)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold py-2 px-3 rounded-lg text-xs sm:text-sm transition-colors text-center"
                >
                  50.000
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAmount(100000)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold py-2 px-3 rounded-lg text-xs sm:text-sm transition-colors text-center"
                >
                  100.000
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAmount(200000)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold py-2 px-3 rounded-lg text-xs sm:text-sm transition-colors text-center"
                >
                  200.000
                </button>
                <button
                  type="button"
                  onClick={() => handleAddQuickAmount(10000)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold py-2 px-3 rounded-lg text-xs sm:text-sm transition-colors text-center"
                >
                  +10.000
                </button>
                <button
                  type="button"
                  onClick={() => handleAddQuickAmount(50000)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold py-2 px-3 rounded-lg text-xs sm:text-sm transition-colors text-center"
                >
                  +50.000
                </button>
              </div>
            </div>

            {/* Kembalian Real-time */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Kembalian:
              </span>
              <span
                className={`text-lg font-bold ${
                  numericReceived === 0
                    ? 'text-slate-400'
                    : isCashInsufficient
                    ? 'text-red-500'
                    : 'text-slate-800'
                }`}
              >
                {numericReceived === 0
                  ? 'Rp 0'
                  : isCashInsufficient
                  ? `Kurang ${formatIDR(Math.abs(changeAmount))}`
                  : formatIDR(changeAmount)}
              </span>
            </div>
          </div>
        )}

        {/* JIKA METODE QRIS */}
        {paymentMethod === 'qris' && (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center text-center space-y-3">
            <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-sm">
              <svg className="w-36 h-36 text-slate-900" viewBox="0 0 200 200" fill="none">
                <rect width="200" height="200" fill="white" />
                <rect x="15" y="15" width="50" height="50" rx="6" fill="#0f172a" />
                <rect x="23" y="23" width="34" height="34" rx="3" fill="white" />
                <rect x="31" y="31" width="18" height="18" rx="2" fill="#facc15" />

                <rect x="135" y="15" width="50" height="50" rx="6" fill="#0f172a" />
                <rect x="143" y="23" width="34" height="34" rx="3" fill="white" />
                <rect x="151" y="31" width="18" height="18" rx="2" fill="#facc15" />

                <rect x="15" y="135" width="50" height="50" rx="6" fill="#0f172a" />
                <rect x="23" y="143" width="34" height="34" rx="3" fill="white" />
                <rect x="31" y="151" width="18" height="18" rx="2" fill="#facc15" />

                <rect x="75" y="20" width="10" height="10" fill="#0f172a" />
                <rect x="95" y="20" width="10" height="10" fill="#0f172a" />
                <rect x="115" y="20" width="10" height="10" fill="#0f172a" />
                <rect x="75" y="75" width="50" height="50" rx="8" fill="#0f172a" />
                <path d="M100 86L112 108H88L100 86Z" fill="#facc15" />
                <circle cx="97" cy="100" r="2.5" fill="#ef4444" />
                <circle cx="104" cy="98" r="2" fill="#ef4444" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Silakan scan kode QR ini</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Scan kode QR menggunakan aplikasi m-Banking atau E-Wallet pelanggan
              </p>
            </div>
          </div>
        )}

        {/* JIKA METODE GOFOOD / GRABFOOD */}
        {(paymentMethod === 'gofood' || paymentMethod === 'grabfood') && (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-900 mb-1.5">
                ID Pesanan / Nomor Resi <span className="text-slate-500 font-normal">(Opsional)</span>
              </label>
              <input
                type="text"
                placeholder={paymentMethod === 'gofood' ? 'Contoh: GF-202611-8910' : 'Contoh: GRB-202611-5432'}
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                className="w-full h-11 px-3.5 bg-white border border-slate-200 shadow-sm rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-yellow-400"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Catat nomor pesanan kurir ojol untuk pencatatan dan rekonsiliasi kasir.
              </p>
            </div>
          </div>
        )}

        {/* Pesan Kesalahan / Banner Error */}
        {errorMessage && (
          <div className="mt-3.5 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
            <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <span className="font-bold">Gagal Menyimpan ke Supabase: </span>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {/* 4. Tombol Aksi: Sejajar ke kanan */}
        <div className="flex justify-end items-center gap-3 mt-5 pt-3.5 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-500 hover:text-slate-900 hover:bg-slate-100 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleBayar}
            disabled={isBayarDisabled}
            className="bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold px-6 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin w-4 h-4 text-slate-900" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Menyimpan ke Database...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-slate-900 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
                <span>Bayar</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
