'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/utils/supabaseClient';

export type InventoryCategory = 'Bahan Baku' | 'Packaging' | 'Lainnya';

export interface InventoryItem {
  id: string | number;
  item_name: string;
  category: InventoryCategory | string;
  stock_quantity: number;
  unit: string;
  min_stock_alert: number;
  last_restock_date: string | null;
}

export default function InventoryPage() {
  // Data & Loading States
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filter & Pencarian
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // State Loading per Baris saat Quick Update (+ / -)
  const [updatingId, setUpdatingId] = useState<string | number | null>(null);

  // Modal Tambah Barang State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    item_name: '',
    category: 'Bahan Baku' as InventoryCategory,
    stock_quantity: '',
    unit: 'kg',
    min_stock_alert: '5',
  });

  // Helper tampilkan notifikasi singkat
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3000);
  };

  // =========================================================================
  // 1. FETCH DATA INVENTARIS DARI TABEL `inventory` SUPABASE
  // =========================================================================
  const fetchInventory = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    if (!supabase) {
      setErrorMessage('Koneksi Supabase belum dikonfigurasi. Periksa file .env.local Anda.');
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .order('item_name', { ascending: true });

      if (error) {
        console.error('Supabase error saat memuat inventory:', error);
        throw new Error(error.message || 'Gagal memuat data dari tabel inventory.');
      }

      const formatted: InventoryItem[] = (data || []).map((row: any) => ({
        id: row.id,
        item_name: row.item_name || '',
        category: row.category || 'Bahan Baku',
        stock_quantity: Number(row.stock_quantity ?? 0),
        unit: row.unit || 'pcs',
        min_stock_alert: Number(row.min_stock_alert ?? 0),
        last_restock_date: row.last_restock_date || null,
      }));

      setItems(formatted);
    } catch (err: any) {
      console.error('Terjadi kesalahan saat mengambil data inventaris:', err);
      setErrorMessage(err.message || 'Gagal memuat data inventaris dari database.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // =========================================================================
  // 2. TAMBAH BARANG BARU (INSERT KE TABEL `inventory`)
  // =========================================================================
  const handleOpenAddModal = () => {
    setFormError(null);
    setFormData({
      item_name: '',
      category: 'Bahan Baku',
      stock_quantity: '',
      unit: 'kg',
      min_stock_alert: '5',
    });
    setIsAddModalOpen(true);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!supabase) {
      setFormError('Koneksi Supabase belum terkonfigurasi.');
      return;
    }

    const trimmedName = formData.item_name.trim();
    const trimmedUnit = formData.unit.trim();
    const initialStock = Number(formData.stock_quantity);
    const minAlert = Number(formData.min_stock_alert);

    if (!trimmedName) {
      setFormError('Nama barang wajib diisi.');
      return;
    }
    if (!trimmedUnit) {
      setFormError('Satuan barang (unit) wajib diisi (misal: kg, pcs, box).');
      return;
    }
    if (isNaN(initialStock) || initialStock < 0) {
      setFormError('Stok awal harus berupa angka 0 atau lebih.');
      return;
    }
    if (isNaN(minAlert) || minAlert < 0) {
      setFormError('Batas stok minimum harus berupa angka 0 atau lebih.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        item_name: trimmedName,
        category: formData.category,
        stock_quantity: initialStock,
        unit: trimmedUnit,
        min_stock_alert: minAlert,
        last_restock_date: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('inventory')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error('Supabase error saat insert inventory:', error);
        throw new Error(error.message || 'Gagal menambahkan barang baru ke database.');
      }

      if (data) {
        const newItem: InventoryItem = {
          id: data.id,
          item_name: data.item_name,
          category: data.category,
          stock_quantity: Number(data.stock_quantity ?? 0),
          unit: data.unit,
          min_stock_alert: Number(data.min_stock_alert ?? 0),
          last_restock_date: data.last_restock_date,
        };
        setItems((prev) =>
          [...prev, newItem].sort((a, b) => a.item_name.localeCompare(b.item_name))
        );
      } else {
        await fetchInventory();
      }

      setIsAddModalOpen(false);
      showToast(`Barang "${trimmedName}" berhasil ditambahkan!`);
    } catch (err: any) {
      console.error('Gagal menyimpan barang baru:', err);
      setFormError(err.message || 'Terjadi kesalahan saat menyimpan ke Supabase.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // =========================================================================
  // 3. UPDATE STOK CEPAT ("+" RESTOCK / "-" PAKAI) KE SUPABASE
  // =========================================================================
  const handleQuickStockUpdate = async (item: InventoryItem, delta: number) => {
    if (!supabase) {
      alert('Koneksi Supabase belum terkonfigurasi.');
      return;
    }

    const newStock = Math.max(0, Number(item.stock_quantity) + delta);
    if (newStock === item.stock_quantity && delta < 0) {
      return; // Stok sudah 0, tidak bisa dikurangi lagi
    }

    setUpdatingId(item.id);
    setErrorMessage(null);

    try {
      const isRestock = delta > 0;
      const nowIso = new Date().toISOString();

      // Jika penambahan stok (+), perbarui juga `last_restock_date` menjadi now()
      const updatePayload: Record<string, any> = {
        stock_quantity: newStock,
      };
      if (isRestock) {
        updatePayload.last_restock_date = nowIso;
      }

      const { data, error } = await supabase
        .from('inventory')
        .update(updatePayload)
        .eq('id', item.id)
        .select()
        .single();

      if (error) {
        console.error('Supabase error saat update stok inventory:', error);
        throw new Error(error.message || 'Gagal memperbarui jumlah stok di database.');
      }

      setItems((prev) =>
        prev.map((row) =>
          row.id === item.id
            ? {
                ...row,
                stock_quantity: data ? Number(data.stock_quantity) : newStock,
                last_restock_date: isRestock
                  ? data?.last_restock_date || nowIso
                  : row.last_restock_date,
              }
            : row
        )
      );

      showToast(
        isRestock
          ? `Restock +${delta} ${item.unit} untuk "${item.item_name}" berhasil!`
          : `Stok "${item.item_name}" dikurangi ${Math.abs(delta)} ${item.unit}.`
      );
    } catch (err: any) {
      console.error('Gagal mengupdate stok barang:', err);
      const msg = err.message || 'Terjadi kesalahan saat mengupdate stok di Supabase.';
      setErrorMessage(msg);
      alert(`Gagal Update Stok!\n\n${msg}`);
    } finally {
      setUpdatingId(null);
    }
  };

  // Format tanggal restock terakhir
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // Filter item berdasarkan pencarian & kategori
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.unit.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Ringkasan Statistik Cepat
  const totalItemsCount = items.length;
  const lowStockCount = items.filter((i) => i.stock_quantity <= i.min_stock_alert).length;
  const safeStockCount = totalItemsCount - lowStockCount;

  return (
    <div className="d-flex flex-column flex-md-row text-slate-900 bg-slate-50 min-vh-100">
      {/* Sidebar Navigasi */}
      <Sidebar />

      {/* Toast Notifikasi Sukses */}
      {toastMessage && (
        <div
          className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-3 bg-slate-900 text-slate-50 border-l-4 border-yellow-400 rounded-xl shadow-xl text-sm font-bold"
          style={{ zIndex: 1100 }}
        >
          <i className="bi bi-check-circle-fill text-yellow-400"></i>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Content Area - Background utama bg-slate-50 */}
      <main className="flex-grow-1 p-4 bg-slate-50 main-content-responsive">
        
        {/* Header Halaman */}
        <header className="d-flex justify-content-between align-items-center mb-4 gap-3 flex-wrap">
          <div>
            <h1 className="h3 font-bold m-0 text-slate-900">Manajemen Stok & Inventaris</h1>
            <p className="text-slate-500 m-0" style={{ fontSize: '0.9rem' }}>
              Pantau ketersediaan bahan baku pizza, kemasan (packaging), dan kelola restock harian
            </p>
          </div>

          <div className="d-flex align-items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={fetchInventory}
              disabled={isLoading}
              className="btn bg-white border border-slate-200 text-slate-900 hover:bg-slate-100 d-flex align-items-center gap-2 py-2 px-3 shadow-sm"
              style={{ borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600 }}
            >
              <i className="bi bi-arrow-clockwise text-slate-900"></i>
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAddModal}
              className="btn bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold d-flex align-items-center gap-2 py-2 px-3.5 shadow-sm border-0"
              style={{ borderRadius: '12px', fontSize: '0.88rem' }}
            >
              <i className="bi bi-plus-lg text-slate-900 font-bold"></i>
              <span>Tambah Barang Baru</span>
            </button>
          </div>
        </header>

        {/* Kartu Ringkasan Inventaris */}
        <div className="row g-3 mb-4">
          <div className="col-md-4">
            <div className="card bg-white border border-slate-200 shadow-sm p-3 h-100" style={{ borderRadius: '14px' }}>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <span className="text-slate-500 small font-semibold d-block">TOTAL ITEM INVENTARIS</span>
                  <h3 className="font-bold text-slate-800 m-0 mt-1">{totalItemsCount} Barang</h3>
                </div>
                <div className="bg-slate-100 text-slate-900 p-2.5 rounded-xl">
                  <i className="bi bi-box-seam fs-4"></i>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card bg-white border border-slate-200 shadow-sm p-3 h-100" style={{ borderRadius: '14px' }}>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <span className="text-slate-500 small font-semibold d-block">STATUS STOK AMAN</span>
                  <h3 className="font-bold text-slate-800 m-0 mt-1">{safeStockCount} Barang</h3>
                </div>
                <div className="bg-emerald-50 text-emerald-700 p-2.5 rounded-xl border border-emerald-200">
                  <i className="bi bi-check2-circle fs-4"></i>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card bg-white border border-slate-200 shadow-sm p-3 h-100" style={{ borderRadius: '14px' }}>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <span className="text-slate-500 small font-semibold d-block">PERLU RESTOCK (MENIPIS)</span>
                  <h3 className="font-bold text-red-700 m-0 mt-1">{lowStockCount} Barang</h3>
                </div>
                <div className="bg-red-50 text-red-700 p-2.5 rounded-xl border border-red-200">
                  <i className="bi bi-exclamation-triangle fs-4"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Banner Error jika ada masalah koneksi / query */}
        {errorMessage && (
          <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 d-flex align-items-center justify-content-between gap-3">
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-exclamation-octagon-fill fs-5 text-red-600"></i>
              <div>
                <span className="font-bold">Terjadi Kesalahan Database: </span>
                <span>{errorMessage}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={fetchInventory}
              className="btn btn-sm bg-white border border-red-200 text-red-700 font-semibold px-3 py-1 rounded-lg"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* Filter Bar & Pencarian */}
        <div className="card bg-white border border-slate-200 shadow-sm p-3 mb-4" style={{ borderRadius: '16px' }}>
          <div className="row g-3 align-items-center">
            {/* Kolom Pencarian */}
            <div className="col-md-5">
              <div className="position-relative">
                <span className="position-absolute top-50 start-0 translate-middle-y ps-3 text-slate-400">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control bg-white border border-slate-200 text-slate-900 ps-5 py-2"
                  placeholder="Cari nama barang, kategori, atau satuan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ borderRadius: '12px', fontSize: '0.88rem' }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="btn position-absolute top-50 end-0 translate-middle-y pe-3 text-slate-400 hover:text-slate-700 border-0"
                    onClick={() => setSearchQuery('')}
                  >
                    <i className="bi bi-x-circle-fill"></i>
                  </button>
                )}
              </div>
            </div>

            {/* Filter Kategori */}
            <div className="col-md-7">
              <div className="d-flex gap-2 justify-content-md-end flex-wrap">
                {(['all', 'Bahan Baku', 'Packaging', 'Lainnya'] as const).map((cat) => {
                  const isActive = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`btn category-tab py-1.5 px-3 ${
                        isActive
                          ? 'active bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold border-yellow-400'
                          : 'bg-white border-slate-200 text-slate-500 shadow-sm'
                      }`}
                      style={{ fontSize: '0.82rem' }}
                    >
                      {cat === 'all' ? 'Semua Kategori' : cat}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* WADAH TABEL DATA INVENTARIS: bg-white, border-slate-200, shadow-sm */}
        <div className="card bg-white border border-slate-200 shadow-sm overflow-hidden" style={{ borderRadius: '16px' }}>
          {isLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-yellow-500 mb-3" role="status">
                <span className="visually-hidden">Memuat data inventaris...</span>
              </div>
              <p className="text-slate-500 font-medium m-0">Memuat data inventaris dari Supabase...</p>
            </div>
          ) : filteredItems.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-hover align-middle m-0">
                <thead className="bg-slate-50 border-bottom border-slate-200">
                  <tr>
                    <th scope="col" className="py-3.5 ps-4 font-bold text-slate-900" style={{ fontSize: '0.82rem', letterSpacing: '0.3px' }}>
                      NAMA BARANG
                    </th>
                    <th scope="col" className="py-3.5 font-bold text-slate-900" style={{ fontSize: '0.82rem', letterSpacing: '0.3px' }}>
                      KATEGORI
                    </th>
                    <th scope="col" className="py-3.5 text-end font-bold text-slate-900" style={{ fontSize: '0.82rem', letterSpacing: '0.3px' }}>
                      SISA STOK
                    </th>
                    <th scope="col" className="py-3.5 font-bold text-slate-900" style={{ fontSize: '0.82rem', letterSpacing: '0.3px' }}>
                      SATUAN
                    </th>
                    <th scope="col" className="py-3.5 text-center font-bold text-slate-900" style={{ fontSize: '0.82rem', letterSpacing: '0.3px' }}>
                      STATUS
                    </th>
                    <th scope="col" className="py-3.5 pe-4 text-center font-bold text-slate-900" style={{ width: '190px', fontSize: '0.82rem', letterSpacing: '0.3px' }}>
                      AKSI CEPAT
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => {
                    const isLowStock = item.stock_quantity <= item.min_stock_alert;
                    const isRowUpdating = updatingId === item.id;

                    return (
                      <tr key={item.id} className="border-bottom border-slate-200 bg-white">
                        {/* Nama Barang & Info Restock Terakhir */}
                        <td className="py-3 ps-4">
                          <div className="font-bold text-slate-900" style={{ fontSize: '0.95rem' }}>
                            {item.item_name}
                          </div>
                          <div className="text-slate-500 d-flex align-items-center gap-2 mt-0.5" style={{ fontSize: '0.75rem' }}>
                            <span>Min. Stok: <strong>{item.min_stock_alert} {item.unit}</strong></span>
                            <span>•</span>
                            <span>Restock Terakhir: {formatDate(item.last_restock_date)}</span>
                          </div>
                        </td>

                        {/* Kategori */}
                        <td className="py-3">
                          <span
                            className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-semibold"
                            style={{ fontSize: '0.76rem' }}
                          >
                            {item.category}
                          </span>
                        </td>

                        {/* Sisa Stok */}
                        <td className="py-3 text-end">
                          <span
                            className={`font-bold fs-5 ${
                              isLowStock ? 'text-red-700' : 'text-slate-800'
                            }`}
                          >
                            {item.stock_quantity}
                          </span>
                        </td>

                        {/* Satuan */}
                        <td className="py-3">
                          <span className="text-slate-500 font-medium" style={{ fontSize: '0.88rem' }}>
                            {item.unit}
                          </span>
                        </td>

                        {/* Status Badge Otomatis */}
                        <td className="py-3 text-center">
                          {isLowStock ? (
                            <span
                              className="d-inline-flex align-items-center gap-1.5 px-3 py-1 rounded-pill bg-red-100 text-red-700 border border-red-200 font-bold"
                              style={{ fontSize: '0.75rem' }}
                            >
                              <span
                                className="d-inline-block rounded-circle"
                                style={{ width: '7px', height: '7px', backgroundColor: '#b91c1c' }}
                              ></span>
                              Stok Menipis
                            </span>
                          ) : (
                            <span
                              className="d-inline-flex align-items-center gap-1.5 px-3 py-1 rounded-pill bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold"
                              style={{ fontSize: '0.75rem' }}
                            >
                              <span
                                className="d-inline-block rounded-circle"
                                style={{ width: '7px', height: '7px', backgroundColor: '#047857' }}
                              ></span>
                              Aman
                            </span>
                          )}
                        </td>

                        {/* Tombol Aksi Cepat: "-" (Pakai/Kurangi Stok) dan "+" (Restock/Tambah Stok) */}
                        <td className="py-3 pe-4 text-center">
                          <div className="d-inline-flex align-items-center justify-content-center gap-2">
                            {/* Tombol "-" (Pakai / Kurangi Stok) */}
                            <button
                              type="button"
                              disabled={isRowUpdating || item.stock_quantity <= 0}
                              onClick={() => handleQuickStockUpdate(item, -1)}
                              title="Pakai / Kurangi 1 Stok"
                              className="btn btn-sm bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold border border-slate-200 d-flex align-items-center justify-content-center gap-1 px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50"
                              style={{ minWidth: '68px', fontSize: '0.78rem' }}
                            >
                              <i className="bi bi-dash-lg"></i>
                              <span>Pakai</span>
                            </button>

                            {/* Tombol "+" (Restock / Tambah Stok) */}
                            <button
                              type="button"
                              disabled={isRowUpdating}
                              onClick={() => handleQuickStockUpdate(item, 1)}
                              title="Restock / Tambah 1 Stok"
                              className="btn btn-sm bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold border-0 shadow-sm d-flex align-items-center justify-content-center gap-1 px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50"
                              style={{ minWidth: '80px', fontSize: '0.78rem' }}
                            >
                              {isRowUpdating ? (
                                <span className="spinner-border spinner-border-sm text-slate-900" role="status" aria-hidden="true"></span>
                              ) : (
                                <>
                                  <i className="bi bi-plus-lg text-slate-900 font-bold"></i>
                                  <span>Restock</span>
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-5 px-3">
              <div className="bg-slate-50 border border-slate-200 rounded-circle d-inline-flex align-items-center justify-content-center p-3 mb-3">
                <i className="bi bi-box-seam text-slate-400 fs-2"></i>
              </div>
              <h5 className="font-bold text-slate-900 mb-1">
                {items.length === 0 ? 'Belum Ada Data Inventaris' : 'Barang Tidak Ditemukan'}
              </h5>
              <p className="text-slate-500 small mb-3">
                {items.length === 0
                  ? 'Tabel inventory masih kosong. Tambahkan bahan baku atau kemasan pertama Anda.'
                  : 'Coba ubah kata kunci pencarian atau pilih filter kategori lainnya.'}
              </p>
              {items.length === 0 && (
                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  className="btn bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold py-2 px-4 rounded-xl shadow-sm border-0"
                  style={{ fontSize: '0.85rem' }}
                >
                  <i className="bi bi-plus-lg me-1.5 text-slate-900"></i>
                  Tambah Barang Pertama
                </button>
              )}
            </div>
          )}

          {/* Footer Tabel */}
          <div className="px-4 py-3 bg-slate-50 border-top border-slate-200 d-flex justify-content-between align-items-center flex-wrap gap-2 text-slate-500" style={{ fontSize: '0.78rem' }}>
            <span>
              Menampilkan <strong>{filteredItems.length}</strong> dari <strong>{items.length}</strong> barang inventaris
            </span>
            <span>
              Klik <strong>+ Restock</strong> untuk menambah stok & memperbarui waktu restock secara otomatis
            </span>
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* MODAL TAMBAH BARANG BARU */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
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
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(4px)',
            zIndex: 1055,
          }}
          role="dialog"
          aria-modal="true"
          onClick={() => !isSubmitting && setIsAddModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-6 relative mx-auto my-auto"
            style={{
              maxWidth: '28rem',
              backgroundColor: '#ffffff',
              borderRadius: '1rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="pb-3 border-bottom border-slate-200 d-flex justify-content-between align-items-center">
              <div>
                <h4 className="font-bold text-slate-900 m-0" style={{ fontSize: '1.15rem' }}>
                  Tambah Barang Inventaris
                </h4>
                <p className="text-slate-500 m-0 mt-0.5" style={{ fontSize: '0.78rem' }}>
                  Masukkan detail bahan baku atau kemasan baru
                </p>
              </div>
              <button
                type="button"
                className="btn-close"
                disabled={isSubmitting}
                onClick={() => setIsAddModalOpen(false)}
                aria-label="Tutup"
              ></button>
            </div>

            {/* Form Input Barang */}
            <form onSubmit={handleAddItem} className="mt-3">
              {formError && (
                <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                  <i className="bi bi-exclamation-circle-fill me-1.5"></i>
                  {formError}
                </div>
              )}

              {/* Nama Barang */}
              <div className="mb-3">
                <label className="form-label small font-bold text-slate-900 mb-1">
                  Nama Barang <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Contoh: Keju Mozzarella, Tepung Terigu, Box Pizza Large"
                  value={formData.item_name}
                  onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                  className="form-control bg-white border border-slate-200 text-slate-900 py-2"
                />
              </div>

              {/* Kategori (Dropdown) */}
              <div className="mb-3">
                <label className="form-label small font-bold text-slate-900 mb-1">
                  Kategori <span className="text-danger">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value as InventoryCategory })
                  }
                  className="form-select bg-white border border-slate-200 text-slate-900 py-2"
                >
                  <option value="Bahan Baku">Bahan Baku</option>
                  <option value="Packaging">Packaging</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              {/* Row: Stok Awal & Satuan */}
              <div className="row g-2.5 mb-3">
                <div className="col-6">
                  <label className="form-label small font-bold text-slate-900 mb-1">
                    Stok Awal <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    placeholder="0"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                    className="form-control bg-white border border-slate-200 text-slate-900 py-2 font-bold"
                  />
                </div>

                <div className="col-6">
                  <label className="form-label small font-bold text-slate-900 mb-1">
                    Satuan (Unit) <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="kg / pcs / box / pack"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="form-control bg-white border border-slate-200 text-slate-900 py-2"
                  />
                </div>
              </div>

              {/* Batas Minimum Stok Alert */}
              <div className="mb-4">
                <label className="form-label small font-bold text-slate-900 mb-1">
                  Batas Peringatan Stok Menipis (`min_stock_alert`) <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  placeholder="Contoh: 5"
                  value={formData.min_stock_alert}
                  onChange={(e) => setFormData({ ...formData, min_stock_alert: e.target.value })}
                  className="form-control bg-white border border-slate-200 text-slate-900 py-2"
                />
                <span className="text-slate-500 d-block mt-1" style={{ fontSize: '0.73rem' }}>
                  Jika sisa stok &le; angka ini, status otomatis berubah menjadi merah (<strong>Stok Menipis</strong>).
                </span>
              </div>

              {/* Tombol Aksi Modal */}
              <div className="d-flex justify-content-end align-items-center gap-2 pt-3 border-top border-slate-200">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 px-4 py-2 rounded-xl font-medium"
                  style={{ fontSize: '0.85rem' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold px-4 py-2 rounded-xl shadow-sm border-0 d-flex align-items-center gap-2"
                  style={{ fontSize: '0.85rem' }}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm text-slate-900" role="status" aria-hidden="true"></span>
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check2-circle text-slate-900 font-bold"></i>
                      <span>Simpan Barang</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

