'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import ReceiptModal from '@/components/ReceiptModal';
import CheckoutModal from '@/components/CheckoutModal';
import { useCart, Transaction } from '@/context/CartContext';

export default function POSPage() {
  const { 
    cart, 
    menuItems,
    isMenuLoading,
    addToCart, 
    removeFromCart, 
    updateQuantity, 
    updateNotes, 
    clearCart,
    loadMenu,
    isDbConnected
  } = useCart();

  const [activeCategory, setActiveCategory] = useState<'all' | 'pizza' | 'sides' | 'beverage'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cashierName] = useState<string>('Gilang');
  
  // Draft state sementara ketika kasir sedang mengetik manual angka kuantitas di keranjang
  const [qtyDrafts, setQtyDrafts] = useState<Record<string, string>>({});

  // Ref untuk input pencarian (Hotkey Ctrl+K atau '/')
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Checkout & Payment Modal State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Receipt Modal State
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [completedTx, setCompletedTx] = useState<Transaction | null>(null);

  // 3. Hotkey Pencarian Global: "Ctrl+K" atau "/" untuk langsung fokus ke input pencarian
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Abaikan jika modal sedang terbuka
      if (isCheckoutOpen || isReceiptOpen) return;

      const activeTag = (document.activeElement as HTMLElement)?.tagName?.toLowerCase();
      const isTypingInInput =
        activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select';

      // Shortcut Ctrl+K atau Cmd+K (berfungsi kapan saja)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      // Shortcut "/" (berfungsi saat tidak sedang mengetik di input lain)
      if (e.key === '/' && !isTypingInInput) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCheckoutOpen, isReceiptOpen]);

  // Filter menu items berdasarkan kategori dan kolom pencarian
  const filteredItems = menuItems.filter((item) => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Hitung Subtotal, Pajak, Layanan, dan Total
  const subtotal = cart.reduce((acc, curr) => acc + curr.item.price * curr.quantity, 0);
  const tax = Math.round(subtotal * 0.1); // Pajak 10%
  const serviceCharge = Math.round(subtotal * 0.05); // Biaya Layanan 5%
  const grandTotal = subtotal + tax + serviceCharge;

  // Handler Sukses Checkout dari Modal
  const handleCheckoutSuccess = (tx: Transaction) => {
    setCompletedTx(tx);
    setIsReceiptOpen(true);
  };

  // Handler input manual kuantitas cepat di Keranjang Belanja
  const handleQuantityInputChange = (productId: string, rawValue: string) => {
    setQtyDrafts((prev) => ({ ...prev, [productId]: rawValue }));

    if (rawValue === '') {
      // Biarkan kosong sementara saat kasir sedang menghapus/mengetik angka baru
      return;
    }

    const parsed = parseInt(rawValue, 10);
    if (!isNaN(parsed) && parsed > 0) {
      updateQuantity(productId, parsed);
    }
  };

  const handleQuantityInputBlur = (productId: string, currentQty: number) => {
    const draft = qtyDrafts[productId];
    if (draft !== undefined) {
      const parsed = parseInt(draft, 10);
      if (isNaN(parsed) || parsed <= 0) {
        // Jika dikosongkan atau diisi 0 lalu blur, kembalikan ke kuantitas sebelumnya (minimal 1)
        updateQuantity(productId, Math.max(1, currentQty));
      }
      setQtyDrafts((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
    }
  };

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="d-flex flex-column flex-md-row text-slate-900 bg-slate-50 min-vh-100">
      {/* Sidebar Navigasi */}
      <Sidebar />

      {/* Main Container POS - Latar Belakang Utama bg-slate-50 */}
      <main className="flex-grow-1 p-3 p-md-4 bg-slate-50 main-content-responsive">
        
        {/* Header POS */}
        <header className="d-flex justify-content-between align-items-center mb-3 gap-3 flex-wrap">
          <div>
            <h1 className="h4 font-bold m-0 text-slate-900">Kasir (Point of Sale)</h1>
            <p className="text-slate-500 m-0" style={{ fontSize: '0.82rem' }}>
              Klik kartu produk untuk input cepat • Tekan <kbd className="bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded" style={{ fontSize: '0.72rem' }}>Ctrl+K</kbd> atau <kbd className="bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded" style={{ fontSize: '0.72rem' }}>/</kbd> untuk cari
            </p>
          </div>
          
          {/* Controls: Search & CRUD Button */}
          <div className="d-flex align-items-center gap-2 flex-wrap" style={{ maxWidth: '100%' }}>
            <Link 
              href="/admin/products" 
              className="btn bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold d-flex align-items-center gap-2 py-2 px-3 shadow-sm border-0"
              style={{ borderRadius: '12px', fontSize: '0.82rem' }}
            >
              <i className="bi bi-egg-fried fs-6 text-slate-900"></i>
              <span>Kelola Produk (CRUD)</span>
            </Link>

            <div className="position-relative" style={{ width: '300px', maxWidth: '100%' }}>
              <span className="position-absolute top-50 start-0 translate-middle-y ps-3 text-slate-400">
                <i className="bi bi-search"></i>
              </span>
              <input 
                ref={searchInputRef}
                type="text" 
                className="form-control bg-white border border-slate-200 text-slate-900 shadow-sm ps-5 pe-5 py-2" 
                placeholder="Cari pizza... (Ctrl+K atau /)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ borderRadius: '12px', fontSize: '0.85rem' }}
              />
              {searchQuery ? (
                <button 
                  className="btn position-absolute top-50 end-0 translate-middle-y pe-3 text-slate-400 hover:text-slate-700 border-0"
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                >
                  <i className="bi bi-x-circle-fill"></i>
                </button>
              ) : (
                <span 
                  className="position-absolute top-50 end-0 translate-middle-y me-2.5 px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-500 rounded font-semibold d-none d-sm-inline-block"
                  style={{ fontSize: '0.68rem', pointerEvents: 'none' }}
                >
                  Ctrl+K
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Layout Grid 2 Kolom (Menu & Keranjang) */}
        <div className="row g-3">
          
          {/* Kolom Kiri: Compact Menu Grid */}
          <div className="col-lg-8 col-md-7">
            
            {/* Category Filter Tabs */}
            <div className="d-flex gap-2 mb-3 category-tabs-scroll pb-1">
              <button 
                className={`btn category-tab py-1.5 px-3 ${
                  activeCategory === 'all'
                    ? 'active bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold border-yellow-400'
                    : 'bg-white border-slate-200 text-slate-500 shadow-sm'
                }`}
                style={{ fontSize: '0.82rem' }}
                onClick={() => setActiveCategory('all')}
              >
                <i className="bi bi-grid-fill me-1.5"></i>Semua Menu
              </button>
              <button 
                className={`btn category-tab py-1.5 px-3 ${
                  activeCategory === 'pizza'
                    ? 'active bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold border-yellow-400'
                    : 'bg-white border-slate-200 text-slate-500 shadow-sm'
                }`}
                style={{ fontSize: '0.82rem' }}
                onClick={() => setActiveCategory('pizza')}
              >
                <i className="bi bi-pie-chart-fill me-1.5"></i>Pizza
              </button>
              <button 
                className={`btn category-tab py-1.5 px-3 ${
                  activeCategory === 'sides'
                    ? 'active bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold border-yellow-400'
                    : 'bg-white border-slate-200 text-slate-500 shadow-sm'
                }`}
                style={{ fontSize: '0.82rem' }}
                onClick={() => setActiveCategory('sides')}
              >
                <i className="bi bi-egg-fried me-1.5"></i>Sampingan (Sides)
              </button>
              <button 
                className={`btn category-tab py-1.5 px-3 ${
                  activeCategory === 'beverage'
                    ? 'active bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold border-yellow-400'
                    : 'bg-white border-slate-200 text-slate-500 shadow-sm'
                }`}
                style={{ fontSize: '0.82rem' }}
                onClick={() => setActiveCategory('beverage')}
              >
                <i className="bi bi-cup-straw me-1.5"></i>Minuman
              </button>
            </div>

            {/* Status koneksi database */}
            {!isDbConnected && (
              <div className="alert alert-warning d-flex align-items-center gap-2 mb-3 py-2" role="alert" style={{ fontSize: '0.8rem' }}>
                <i className="bi bi-exclamation-triangle-fill"></i>
                <span>Tidak terhubung ke Supabase. Pastikan tabel <strong>products</strong> sudah dibuat dan data produk sudah diisi.</span>
              </div>
            )}

            {/* 1. Optimasi Kartu Produk (Compact Grid: grid-cols-4 / grid-cols-5 di layar besar) */}
            {isMenuLoading ? (
              /* Loading Skeleton Compact */
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                  <div key={i} className="card pizza-card bg-white border border-slate-200 shadow-sm placeholder-glow">
                    <div className="pizza-card-img-wrapper" style={{ height: '92px' }}>
                      <span className="placeholder w-100 h-100 d-block"></span>
                    </div>
                    <div className="card-body p-2.5">
                      <h6 className="card-title mb-1"><span className="placeholder col-9"></span></h6>
                      <p className="card-text mb-2"><span className="placeholder col-12"></span></p>
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="placeholder col-5"></span>
                        <span className="placeholder col-2 rounded-circle"></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredItems.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
                {filteredItems.map((item) => {
                  const inCartItem = cart.find((c) => c.item.id === item.id);
                  return (
                    /* Seluruh area kartu clickable + efek hover border kuning & shadow membesar */
                    <div 
                      key={item.id}
                      onClick={() => addToCart(item)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          addToCart(item);
                        }
                      }}
                      className={`card pizza-card bg-white border cursor-pointer hover:border-yellow-400 hover:shadow-md ${
                        inCartItem ? 'border-yellow-400' : 'border-slate-200 shadow-sm'
                      }`}
                    >
                      {/* Gambar Produk Pipih & Ringkas */}
                      <div className="pizza-card-img-wrapper" style={{ height: '92px' }}>
                        <span className="pizza-category-badge">{item.category}</span>
                        {inCartItem && (
                          <span 
                            className="position-absolute top-0 start-0 m-1.5 px-2 py-0.5 rounded-pill bg-yellow-400 text-slate-900 font-bold shadow-sm"
                            style={{ fontSize: '0.68rem', zIndex: 2 }}
                          >
                            {inCartItem.quantity}x
                          </span>
                        )}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          className="pizza-card-img"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/images/placeholder.png';
                          }}
                        />
                      </div>

                      {/* Body Kartu Padat */}
                      <div className="card-body d-flex flex-column justify-content-between p-2.5 bg-white">
                        <div className="overflow-hidden">
                          {/* Judul/Nama Pizza: text-slate-900, 1 baris truncate */}
                          <h6 
                            className="card-title font-bold text-slate-900 mb-0.5 truncate" 
                            style={{ fontSize: '0.86rem', lineHeight: 1.25 }}
                            title={item.name}
                          >
                            {item.name}
                          </h6>
                          {/* Deskripsi Topping: text-slate-500, maksimal 1 baris (truncate) */}
                          <p 
                            className="card-text text-slate-500 mb-2 truncate" 
                            style={{ fontSize: '0.73rem' }}
                            title={item.description}
                          >
                            {item.description}
                          </p>
                        </div>

                        <div className="d-flex justify-content-between align-items-center pt-1 border-top border-slate-100">
                          {/* Harga: font-bold text-slate-800 */}
                          <span className="font-bold text-slate-800" style={{ fontSize: '0.88rem' }}>
                            {formatPrice(item.price)}
                          </span>
                          {/* Visual Tombol '+': bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold */}
                          <span 
                            className="btn bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold btn-sm rounded-circle d-flex align-items-center justify-content-center shadow-sm border-0 shrink-0" 
                            style={{ width: '26px', height: '26px', padding: 0 }}
                          >
                            <i className="bi bi-plus text-slate-900 font-bold" style={{ fontSize: '0.95rem' }}></i>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <i className="bi bi-inbox text-slate-400 fs-1 mb-3 d-block"></i>
                {menuItems.length === 0 ? (
                  <div className="d-flex flex-column align-items-center p-3">
                    <h5 className="font-bold text-slate-900">Belum Ada Produk</h5>
                    <p className="text-slate-500 small mb-3">Database Supabase Anda sudah tersambung, tetapi tabel produk masih kosong.</p>
                    <Link 
                      href="/admin/products"
                      className="btn bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold btn-sm d-flex align-items-center gap-2 py-2 px-3 shadow-sm border-0"
                      style={{ borderRadius: '10px' }}
                    >
                      <i className="bi bi-plus-circle text-slate-900"></i>
                      <span>Kelola & Tambah Produk</span>
                    </Link>
                  </div>
                ) : (
                  <>
                    <h5 className="font-bold text-slate-900">Menu Tidak Ditemukan</h5>
                    <p className="text-slate-500 small">Coba ubah filter kategori atau kata kunci pencarian Anda</p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Kolom Kanan: Panel Keranjang Belanja (Fast Quantity Input) */}
          <div className="col-lg-4 col-md-5">
            <div className="card bg-white border border-slate-200 shadow-sm h-100 d-flex flex-column" style={{ minHeight: 'calc(100vh - 135px)', borderRadius: '16px' }}>
              
              {/* Cart Header */}
              <div className="card-header border-bottom border-slate-200 bg-white p-3 d-flex justify-content-between align-items-center" style={{ borderRadius: '16px 16px 0 0' }}>
                <div className="d-flex align-items-center gap-2">
                  <h5 className="font-bold m-0 text-slate-900" style={{ fontSize: '1rem' }}>
                    <i className="bi bi-cart3 me-2 text-slate-900"></i>Keranjang Belanja
                  </h5>
                  {cart.length > 0 && (
                    <span className="badge bg-yellow-400 text-slate-900 font-bold rounded-pill" style={{ fontSize: '0.72rem' }}>
                      {cart.reduce((sum, i) => sum + i.quantity, 0)} item
                    </span>
                  )}
                </div>
                {cart.length > 0 && (
                  <button 
                    className="btn btn-outline-danger btn-sm border-0 font-semibold py-1 px-2" 
                    onClick={clearCart}
                    style={{ fontSize: '0.78rem' }}
                  >
                    Hapus Semua
                  </button>
                )}
              </div>

              {/* Cart Items Area */}
              <div className="card-body p-3 flex-grow-1 cart-scroll-area bg-white">
                {cart.length > 0 ? (
                  cart.map((cartItem, idx) => {
                    const productId = cartItem.item.id;
                    const displayQty =
                      qtyDrafts[productId] !== undefined
                        ? qtyDrafts[productId]
                        : String(cartItem.quantity);

                    return (
                      <div key={`${productId}-${idx}`} className="cart-item border-bottom border-slate-200 py-2.5">
                        <div className="d-flex justify-content-between align-items-start gap-2">
                          <div className="flex-grow-1 overflow-hidden">
                            <span className="font-bold text-slate-900 d-block truncate" style={{ fontSize: '0.9rem' }}>
                              {cartItem.item.name}
                            </span>
                            <div className="d-flex align-items-center gap-2">
                              <span className="text-slate-500" style={{ fontSize: '0.76rem' }}>
                                {formatPrice(cartItem.item.price)} / item
                              </span>
                              <span className="font-bold text-slate-800" style={{ fontSize: '0.82rem' }}>
                                • {formatPrice(cartItem.item.price * cartItem.quantity)}
                              </span>
                            </div>
                          </div>
                          <button 
                            className="btn btn-link text-danger border-0 p-0 fs-6 lh-1" 
                            onClick={() => updateQuantity(productId, 0)}
                            title="Hapus item"
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>

                        {/* 2. Optimasi Keranjang Belanja: Fast Quantity Input (<input type="number" />) & Notes */}
                        <div className="d-flex justify-content-between align-items-center mt-2 gap-2">
                          {/* Quantity Counter dengan Input Number Manual */}
                          <div className="d-flex align-items-center bg-slate-50 rounded-lg border border-slate-200 p-0.5 shrink-0">
                            <button 
                              type="button"
                              className="btn btn-sm text-slate-700 hover:bg-slate-200 border-0 py-0.5 px-2 rounded"
                              onClick={() => {
                                setQtyDrafts((prev) => {
                                  const next = { ...prev };
                                  delete next[productId];
                                  return next;
                                });
                                removeFromCart(productId);
                              }}
                              aria-label="Kurangi jumlah"
                            >
                              <i className="bi bi-dash"></i>
                            </button>

                            <input
                              type="number"
                              min="1"
                              value={displayQty}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => handleQuantityInputChange(productId, e.target.value)}
                              onBlur={() => handleQuantityInputBlur(productId, cartItem.quantity)}
                              aria-label={`Kuantitas ${cartItem.item.name}`}
                              className="bg-white border border-slate-200 rounded text-center font-bold text-slate-900 mx-1 focus:outline-none focus:ring-yellow-400 focus:border-yellow-400"
                              style={{
                                width: '48px',
                                height: '26px',
                                fontSize: '0.85rem',
                                padding: '0 4px',
                              }}
                            />

                            <button 
                              type="button"
                              className="btn btn-sm bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold border-0 py-0.5 px-2 rounded"
                              onClick={() => {
                                setQtyDrafts((prev) => {
                                  const next = { ...prev };
                                  delete next[productId];
                                  return next;
                                });
                                addToCart(cartItem.item);
                              }}
                              aria-label="Tambah jumlah"
                            >
                              <i className="bi bi-plus"></i>
                            </button>
                          </div>

                          {/* Note Input */}
                          <input 
                            type="text"
                            className="form-control bg-slate-50 border border-slate-200 text-slate-900 px-2 py-1 flex-grow-1"
                            placeholder="Catatan..."
                            value={cartItem.notes || ''}
                            onChange={(e) => updateNotes(productId, e.target.value)}
                            style={{ fontSize: '0.74rem', height: '28px', borderRadius: '8px' }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-5 d-flex flex-column align-items-center justify-content-center h-100" style={{ minHeight: '220px' }}>
                    <div className="bg-slate-50 rounded-circle p-3 mb-3 border border-slate-200">
                      <i className="bi bi-cart-x text-slate-400 fs-1"></i>
                    </div>
                    <h6 className="font-bold text-slate-900">Keranjang Belanja Kosong</h6>
                    <p className="text-slate-500 small px-3">Klik kartu produk di sebelah kiri untuk menambahkan pesanan dengan cepat.</p>
                  </div>
                )}
              </div>

              {/* Cart Footer & Checkout Calculator */}
              <div className="card-footer bg-white border-top border-slate-200 p-3 mt-auto" style={{ borderRadius: '0 0 16px 16px' }}>
                
                {/* Rincian Harga */}
                <div className="small mb-3">
                  <div className="d-flex justify-content-between mb-1 text-slate-500">
                    <span>Subtotal:</span>
                    <span className="font-medium text-slate-700">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-1 text-slate-500">
                    <span>Pajak (10%):</span>
                    <span className="font-medium text-slate-700">{formatPrice(tax)}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2 text-slate-500">
                    <span>Biaya Layanan (5%):</span>
                    <span className="font-medium text-slate-700">{formatPrice(serviceCharge)}</span>
                  </div>
                  <div className="d-flex justify-content-between font-bold text-slate-900 fs-5 border-top border-slate-200 pt-2 mt-2">
                    <span>Total Belanja:</span>
                    <span className="font-bold text-slate-800">{formatPrice(grandTotal)}</span>
                  </div>
                </div>

                {/* Tombol Aksi Utama: Buka Modal Checkout / Pembayaran */}
                <button 
                  className="btn bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold w-100 py-3 d-flex align-items-center justify-content-center gap-2 shadow-sm border-0"
                  style={{ borderRadius: '14px', fontSize: '1rem' }}
                  disabled={cart.length === 0}
                  onClick={() => setIsCheckoutOpen(true)}
                >
                  <i className="bi bi-wallet2 fs-5 text-slate-900"></i>
                  <span>Bayar Sekarang ({formatPrice(grandTotal)})</span>
                </button>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* Modal Dialog Checkout & Pembayaran */}
      <CheckoutModal 
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cart={cart}
        subtotal={subtotal}
        tax={tax}
        serviceCharge={serviceCharge}
        totalAmount={grandTotal}
        cashierName={cashierName}
        onSuccess={handleCheckoutSuccess}
        clearCart={clearCart}
        loadMenu={loadMenu}
      />

      {/* Modal Cetak Struk Transaksi */}
      <ReceiptModal 
        isOpen={isReceiptOpen}
        transaction={completedTx}
        onClose={() => {
          setIsReceiptOpen(false);
          setCompletedTx(null);
        }}
      />
    </div>
  );
}
