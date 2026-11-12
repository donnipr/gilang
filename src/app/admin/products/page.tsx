'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { useCart, PizzaItem } from '@/context/CartContext';

export default function ProductsCRUDPage() {
  const {
    menuItems,
    isMenuLoading,
    loadMenu,
    isDbConnected,
    addProduct,
    updateProduct,
    deleteProduct,
    resetMenuToDefault
  } = useCart();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'pizza' | 'sides' | 'beverage'>('all');
  const [mounted, setMounted] = useState(false);

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    price: '',
    category: 'pizza' as 'pizza' | 'sides' | 'beverage',
    image: '/images/margherita.png',
    description: ''
  });

  // Custom image preset picker state
  const [customImage, setCustomImage] = useState(false);

  // Status & Validation State
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Presets untuk gambar agar testing CRUD sangat mudah & rapi
  const imagePresets = [
    { name: 'Pizza Margherita', url: '/images/margherita.png' },
    { name: 'Pizza Pepperoni', url: '/images/pepperoni.png' },
    { name: 'Garlic Bread', url: '/images/garlic_bread.png' },
    { name: 'Iced Lemon Tea', url: '/images/lemon_tea.png' },
    { name: 'Placeholder standard', url: '/images/placeholder.png' }
  ];

  useEffect(() => {
    setMounted(true);
    loadMenu();
  }, [loadMenu]);

  if (!mounted) return null;

  // Filter menuItems berdasarkan pencarian & kategori
  const filteredProducts = menuItems.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'all' ? true : product.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Handler membuka modal tambah produk baru
  const handleOpenCreate = () => {
    setFormError('');
    setFormData({
      id: '',
      name: '',
      price: '',
      category: 'pizza',
      image: '/images/margherita.png',
      description: ''
    });
    setCustomImage(false);
    setModalMode('create');
    setIsModalOpen(true);
  };

  // Handler membuka modal edit produk
  const handleOpenEdit = (product: PizzaItem) => {
    setFormError('');
    setFormData({
      id: product.id,
      name: product.name,
      price: String(product.price),
      category: product.category,
      image: product.image,
      description: product.description || ''
    });

    // Periksa apakah gambar yang digunakan merupakan salah satu dari preset
    const isPreset = imagePresets.some(p => p.url === product.image);
    setCustomImage(!isPreset);

    setModalMode('edit');
    setIsModalOpen(true);
  };

  // Handler submit Form (Create / Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    const { id, name, price, category, image, description } = formData;

    // Validasi input
    if (!id.trim()) {
      setFormError('ID Produk wajib diisi (misal: "meat-feast", "thai-tea").');
      setIsSubmitting(false);
      return;
    }
    // Validasi ID regex format: hanya boleh huruf, angka, dan strip (-)
    if (!/^[a-zA-Z0-9-]+$/.test(id)) {
      setFormError('ID Produk hanya boleh berisi huruf, angka, dan tanda hubung (-). Tanpa spasi.');
      setIsSubmitting(false);
      return;
    }
    if (!name.trim()) {
      setFormError('Nama Produk wajib diisi.');
      setIsSubmitting(false);
      return;
    }
    const numericPrice = Number(price);
    if (isNaN(numericPrice) || numericPrice <= 0) {
      setFormError('Harga harus berupa angka positif.');
      setIsSubmitting(false);
      return;
    }

    try {
      if (modalMode === 'create') {
        // Cek dulu apakah ID sudah digunakan
        const isIdTaken = menuItems.some(p => p.id === id.trim().toLowerCase());
        if (isIdTaken) {
          setFormError(`ID Produk "${id}" sudah digunakan. Gunakan ID yang unik.`);
          setIsSubmitting(false);
          return;
        }

        const newProduct: PizzaItem = {
          id: id.trim().toLowerCase(),
          name: name.trim(),
          price: numericPrice,
          category,
          image,
          description: description.trim()
        };

        const success = await addProduct(newProduct);
        if (!success) {
          setIsSubmitting(false);
          return;
        }
      } else {
        const updatedProd: PizzaItem = {
          id,
          name: name.trim(),
          price: numericPrice,
          category,
          image,
          description: description.trim()
        };

        const success = await updateProduct(updatedProd);
        if (!success) {
          setIsSubmitting(false);
          return;
        }
      }

      // Sukses! Tutup modal
      setIsModalOpen(false);
      alert(`Produk berhasil ${modalMode === 'create' ? 'ditambahkan' : 'diperbarui'}!`);
    } catch (err: any) {
      console.error('Error saat menyimpan produk:', err);
      setFormError(err.message || 'Terjadi kesalahan sistem saat menyimpan produk.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler Hapus Produk
  const handleDeleteProduct = async (id: string) => {
    try {
      const success = await deleteProduct(id);
      if (success) {
        setDeleteConfirmId(null);
        alert('Produk berhasil dihapus!');
      }
    } catch (err: any) {
      console.error('Gagal menghapus produk:', err);
      alert(`Gagal menghapus produk: ${err.message}`);
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
    <>
      <div className="d-flex flex-column flex-md-row text-slate-900 bg-slate-50 min-vh-100">
        {/* Sidebar Navigasi */}
        <Sidebar />

        {/* Main Container CRUD */}
        <main className="flex-grow-1 p-4 bg-slate-50 main-content-responsive">

          {/* Header Modul */}
          <header className="d-flex justify-content-between align-items-center mb-4 gap-3 flex-wrap">
            <div>
              <h1 className="h3 font-bold m-0 text-slate-900">Kelola Daftar Menu & Produk</h1>
              <p className="text-slate-500 m-0" style={{ fontSize: '0.9rem' }}>
                Tambah, edit, dan hapus item produk kasir {isDbConnected ? 'yang tersinkronisasi ke Supabase' : 'dalam mode Local Storage'}
              </p>
            </div>

            <div className="d-flex gap-2 align-items-center flex-wrap">
              <button
                className="btn bg-white border border-slate-200 text-slate-900 hover:bg-slate-100 d-flex align-items-center gap-2 py-2 px-3 shadow-sm"
                onClick={async () => {
                  if (confirm('Apakah Anda yakin ingin mengatur ulang seluruh menu ke daftar Pizza & Toppings Gilang yang baru? Ini akan menghapus data menu kustom Anda saat ini.')) {
                    const ok = await resetMenuToDefault();
                    if (ok) alert('Seluruh daftar menu Gilang Pizza berhasil diisi!');
                  }
                }}
                style={{ borderRadius: '12px', fontSize: '0.9rem' }}
              >
                <i className="bi bi-arrow-counterclockwise fs-5 text-slate-900"></i>
                <span>Reset ke Menu Gilang</span>
              </button>

              <button
                className="btn bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold d-flex align-items-center gap-2 py-2 px-3 shadow-sm border-0"
                onClick={handleOpenCreate}
                style={{ borderRadius: '12px', fontSize: '0.9rem' }}
              >
                <i className="bi bi-plus-lg fs-5 text-slate-900"></i>
                <span>Tambah Produk Baru</span>
              </button>
            </div>
          </header>

          {/* Database Status Banner */}
          {!isDbConnected && (
            <div className="alert alert-info border-info border-opacity-25 d-flex align-items-center gap-3 mb-4 rounded-3 shadow-sm py-3" role="alert">
              <i className="bi bi-info-circle-fill fs-3 text-info"></i>
              <div>
                <h6 className="alert-heading fw-bold m-0 text-info" style={{ fontSize: '0.95rem' }}>
                  Mode Penyimpanan Lokal (Offline Fallback) Aktif
                </h6>
                <p className="m-0 small text-muted">
                  Koneksi Supabase terputus. Semua perubahan data produk (tambah, edit, hapus) saat ini disimpan secara aman di <strong>Local Storage Browser</strong> Anda dan langsung tampil di halaman Kasir.
                </p>
              </div>
            </div>
          )}

          {/* CONTROLS (PENCARIAN & FILTER KATEGORI) */}
          <div className="card bg-pizza-card border-pizza p-3 mb-4" style={{ borderRadius: '16px' }}>
            <div className="row g-3 align-items-center">

              {/* Input Pencarian */}
              <div className="col-md-4">
                <div className="input-group">
                  <span className="input-group-text bg-transparent border-end-0">
                    <i className="bi bi-search text-muted"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0 ps-0"
                    placeholder="Cari ID, Nama, atau Deskripsi..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Tab Filter Kategori */}
              <div className="col-md-8">
                <div className="d-flex gap-2 justify-content-md-end flex-wrap">
                  <button
                    className={`category-tab ${selectedCategory === 'all' ? 'active' : ''}`}
                    onClick={() => setSelectedCategory('all')}
                  >
                    Semua Menu
                  </button>
                  <button
                    className={`category-tab ${selectedCategory === 'pizza' ? 'active' : ''}`}
                    onClick={() => setSelectedCategory('pizza')}
                  >
                    <i className="bi bi-pie-chart me-2"></i>Pizza
                  </button>
                  <button
                    className={`category-tab ${selectedCategory === 'sides' ? 'active' : ''}`}
                    onClick={() => setSelectedCategory('sides')}
                  >
                    <i className="bi bi-egg-fried me-2"></i>Sides
                  </button>
                  <button
                    className={`category-tab ${selectedCategory === 'beverage' ? 'active' : ''}`}
                    onClick={() => setSelectedCategory('beverage')}
                  >
                    <i className="bi bi-cup-hot me-2"></i>Beverages
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* TABEL DAFTAR PRODUK */}
          <div className="card bg-pizza-card border-pizza p-4 shadow-sm" style={{ borderRadius: '16px' }}>

            {isMenuLoading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-orange mb-3" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="text-muted">Memuat data produk...</p>
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-dark table-hover align-middle border-pizza m-0">
                  <thead>
                    <tr className="text-muted border-bottom border-pizza">
                      <th scope="col" style={{ width: '80px' }} className="py-3">Gambar</th>
                      <th scope="col" className="py-3">ID Produk</th>
                      <th scope="col" className="py-3">Nama Produk</th>
                      <th scope="col" className="py-3">Kategori</th>
                      <th scope="col" className="py-3 text-end">Harga</th>
                      <th scope="col" className="py-3">Deskripsi</th>
                      <th scope="col" style={{ width: '150px' }} className="py-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => (
                      <tr key={product.id} className="border-bottom border-pizza-dark">
                        {/* Gambar Preview */}
                        <td className="py-3">
                          <div
                            className="rounded overflow-hidden border border-pizza d-flex align-items-center justify-content-center bg-pizza-bg"
                            style={{ width: '50px', height: '50px' }}
                          >
                            <img
                              src={product.image}
                              alt={product.name}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/images/placeholder.png';
                              }}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </div>
                        </td>

                        {/* ID */}
                        <td className="py-3 fw-bold text-orange text-monospace">{product.id}</td>

                        {/* Nama */}
                        <td className="py-3 fw-semibold text-white">{product.name}</td>

                        {/* Kategori */}
                        <td className="py-3">
                          <span className={`badge ${product.category === 'pizza'
                              ? 'bg-pizza-primary bg-opacity-15 text-orange'
                              : product.category === 'sides'
                                ? 'bg-warning bg-opacity-15 text-yellow'
                                : 'bg-success bg-opacity-15 text-success'
                            } border border-pizza`} style={{ fontSize: '0.75rem', textTransform: 'capitalize' }}>
                            {product.category}
                          </span>
                        </td>

                        {/* Harga */}
                        <td className="py-3 text-end fw-bold text-yellow">{formatPrice(product.price)}</td>

                        {/* Deskripsi */}
                        <td className="py-3 text-muted small" style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {product.description || '-'}
                        </td>

                        {/* Tombol Aksi */}
                        <td className="py-3 text-center">
                          <div className="d-flex gap-2 justify-content-center">
                            {/* Button Edit */}
                            <button
                              className="btn btn-sm btn-outline-secondary d-flex align-items-center justify-content-center p-2"
                              onClick={() => handleOpenEdit(product)}
                              title="Edit Produk"
                              style={{ borderRadius: '8px', width: '34px', height: '34px' }}
                            >
                              <i className="bi bi-pencil-square text-orange fs-6"></i>
                            </button>

                            {/* Button Hapus */}
                            {deleteConfirmId === product.id ? (
                              <div className="d-flex align-items-center gap-1">
                                <button
                                  className="btn btn-sm btn-danger text-white py-1 px-2 fw-bold"
                                  onClick={() => handleDeleteProduct(product.id)}
                                  style={{ fontSize: '0.75rem', borderRadius: '6px' }}
                                >
                                  Ya
                                </button>
                                <button
                                  className="btn btn-sm btn-secondary py-1 px-2"
                                  onClick={() => setDeleteConfirmId(null)}
                                  style={{ fontSize: '0.75rem', borderRadius: '6px' }}
                                >
                                  Batal
                                </button>
                              </div>
                            ) : (
                              <button
                                className="btn btn-sm btn-outline-secondary d-flex align-items-center justify-content-center p-2"
                                onClick={() => setDeleteConfirmId(product.id)}
                                title="Hapus Produk"
                                style={{ borderRadius: '8px', width: '34px', height: '34px' }}
                              >
                                <i className="bi bi-trash3 text-danger fs-6"></i>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-5 text-muted">
                <i className="bi bi-egg-fried fs-1 text-pizza-primary opacity-50 mb-3 d-block"></i>
                <h5 className="text-white">Produk Tidak Ditemukan</h5>
                <p className="small">Tidak ada data produk yang cocok dengan pencarian atau filter Anda.</p>
              </div>
            )}

            {/* Footer Info */}
            <div className="d-flex justify-content-between align-items-center mt-3 text-muted" style={{ fontSize: '0.8rem' }}>
              <span>Menampilkan {filteredProducts.length} dari total {menuItems.length} produk</span>
              <span>Mode: {isDbConnected ? 'Tersambung ke Supabase' : 'Penyimpanan Lokal (Offline)'}</span>
            </div>

          </div>

        </main>
      </div>

      {/* ================= MODAL TAMBAH / EDIT PRODUK ================= */}
      {isModalOpen && (
        <div
          className="modal show d-block"
          tabIndex={-1}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999
          }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border" style={{ borderRadius: '20px', borderColor: 'var(--pizza-border)', backgroundColor: '#fff' }}>

              {/* Header Modal */}
              <div className="modal-header border-bottom py-3 px-4" style={{ borderColor: 'var(--pizza-border)' }}>
                <h5 className="fw-bold" style={{ color: 'var(--pizza-text)' }}>
                  {modalMode === 'create' ? 'Tambah Produk Menu Baru' : 'Edit Detail Produk'}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={() => setIsModalOpen(false)}
                ></button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSubmit}>
                <div className="modal-body p-4">

                  {/* Alert Error jika ada */}
                  {formError && (
                    <div className="alert alert-danger py-2 px-3 small border-danger border-opacity-25 text-danger rounded-3 mb-3 d-flex align-items-center gap-2">
                      <i className="bi bi-exclamation-circle-fill"></i>
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* ID Produk (Hanya bisa diinput saat Create) */}
                  <div className="mb-3">
                    <label htmlFor="productIdInput" className="form-label small fw-bold text-muted mb-1">
                      ID Produk <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      id="productIdInput"
                      className="form-control py-2"
                      placeholder="Contoh: meat-lovers, thai-tea, onion-rings"
                      value={formData.id}
                      onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                      disabled={modalMode === 'edit'}
                      required
                    />
                    {modalMode === 'create' && (
                      <div className="form-text text-muted" style={{ fontSize: '0.75rem' }}>
                        ID unik produk. Gunakan huruf kecil, angka, dan tanda hubung (-). Tanpa spasi.
                      </div>
                    )}
                  </div>

                  {/* Nama Produk */}
                  <div className="mb-3">
                    <label htmlFor="productNameInput" className="form-label small fw-bold text-muted mb-1">
                      Nama Produk <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      id="productNameInput"
                      className="form-control py-2"
                      placeholder="Contoh: Meat Lovers Pizza Premium"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  {/* Row Kategori & Harga */}
                  <div className="row g-3 mb-3">
                    {/* Kategori */}
                    <div className="col-md-6">
                      <label htmlFor="categorySelect" className="form-label small fw-bold text-muted mb-1">
                        Kategori <span className="text-danger">*</span>
                      </label>
                      <select
                        id="categorySelect"
                        className="form-select py-2"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                        required
                      >
                        <option value="pizza">Pizza</option>
                        <option value="sides">Sides (Camilan)</option>
                        <option value="beverage">Beverage (Minuman)</option>
                      </select>
                    </div>

                    {/* Harga */}
                    <div className="col-md-6">
                      <label htmlFor="priceInput" className="form-label small fw-bold text-muted mb-1">
                        Harga (IDR) <span className="text-danger">*</span>
                      </label>
                      <div className="input-group">
                        <span className="input-group-text text-muted" style={{ fontSize: '0.85rem' }}>Rp</span>
                        <input
                          type="number"
                          id="priceInput"
                          className="form-control py-2"
                          placeholder="75000"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                          min="0"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* PILIHAN GAMBAR PRESET */}
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-muted mb-1 d-flex justify-content-between">
                      <span>Gambar Produk</span>
                      <span
                        className="text-orange fw-bold"
                        onClick={() => setCustomImage(!customImage)}
                        style={{ fontSize: '0.75rem', textDecoration: 'underline', cursor: 'pointer' }}
                      >
                        {customImage ? 'Pilih dari Preset' : 'Gunakan URL Kustom'}
                      </span>
                    </label>

                    {customImage ? (
                      <input
                        type="text"
                        className="form-control py-2"
                        placeholder="Masukkan URL Gambar kustom (HTTPS/lokal)..."
                        value={formData.image}
                        onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      />
                    ) : (
                      <div className="d-flex flex-wrap gap-2 p-2 rounded border" style={{ backgroundColor: '#f8fafc', borderColor: 'var(--pizza-border)' }}>
                        {imagePresets.map((preset, idx) => {
                          const isSelected = formData.image === preset.url;
                          return (
                            <div
                              key={idx}
                              onClick={() => setFormData({ ...formData, image: preset.url })}
                              className="d-flex flex-column align-items-center p-1 rounded"
                              style={{
                                width: '76px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                border: isSelected ? '2px solid var(--pizza-primary)' : '2px solid transparent',
                                backgroundColor: isSelected ? '#f0fdfa' : 'transparent'
                              }}
                              title={preset.name}
                            >
                              <img
                                src={preset.url}
                                alt={preset.name}
                                style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '/images/placeholder.png';
                                }}
                              />
                              <span className="text-muted text-center text-truncate mt-1 w-100" style={{ fontSize: '0.65rem' }}>
                                {preset.name}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Deskripsi */}
                  <div className="mb-1">
                    <label htmlFor="descriptionTextarea" className="form-label small fw-bold text-muted mb-1">
                      Deskripsi Produk
                    </label>
                    <textarea
                      id="descriptionTextarea"
                      className="form-control py-2"
                      rows={3}
                      placeholder="Masukkan penjelasan singkat tentang rasa, porsi, bahan, atau promo produk..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    ></textarea>
                  </div>

                </div>

                {/* Footer Modal Buttons */}
                <div className="modal-footer border-top py-3 px-4" style={{ borderColor: 'var(--pizza-border)' }}>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setIsModalOpen(false)}
                    disabled={isSubmitting}
                    style={{ borderRadius: '10px' }}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="btn btn-pizza-primary d-flex align-items-center gap-2"
                    disabled={isSubmitting}
                    style={{ borderRadius: '10px' }}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-save"></i>
                        <span>Simpan Produk</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

            </div>
          </div>
        </div>
      )}
    </>
  );
}
