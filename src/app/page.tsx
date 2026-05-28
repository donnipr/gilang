'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import ReceiptModal from '@/components/ReceiptModal';
import { useCart, PizzaItem, Transaction } from '@/context/CartContext';

export default function POSPage() {
  const { 
    cart, 
    menuItems,
    isMenuLoading,
    addToCart, 
    removeFromCart, 
    updateQuantity, 
    updateNotes, 
    checkout, 
    clearCart,
    isDbConnected
  } = useCart();

  const [activeCategory, setActiveCategory] = useState<'all' | 'pizza' | 'sides' | 'beverage'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [changeAmount, setChangeAmount] = useState<number>(0);
  const [cashierName] = useState<string>('Gilang');
  
  // Receipt State
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [completedTx, setCompletedTx] = useState<Transaction | null>(null);

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

  // Hitung kembalian secara otomatis saat nominal pembayaran berubah
  useEffect(() => {
    const payment = parseFloat(paymentAmount) || 0;
    if (payment >= grandTotal && grandTotal > 0) {
      setChangeAmount(payment - grandTotal);
    } else {
      setChangeAmount(0);
    }
  }, [paymentAmount, grandTotal]);

  // Shortcut pembayaran cepat (quick cash helpers)
  const handleQuickPay = (amount: number) => {
    setPaymentAmount(amount.toString());
  };

  const handlePayExact = () => {
    setPaymentAmount(grandTotal.toString());
  };

  // Proses Simpan Transaksi
  const handleCheckout = async () => {
    const payment = parseFloat(paymentAmount) || 0;
    if (payment < grandTotal) {
      alert('Uang pembayaran kurang dari total belanja!');
      return;
    }

    const tx = await checkout(payment, cashierName);
    if (tx) {
      setCompletedTx(tx);
      setIsReceiptOpen(true);
      // Reset form pembayaran
      setPaymentAmount('');
      setChangeAmount(0);
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
    <div className="d-flex flex-column flex-md-row text-white min-vh-100">
      {/* Sidebar Navigasi */}
      <Sidebar />

      {/* Main Container POS */}
      <main className="flex-grow-1 p-4 bg-pizza-bg main-content-responsive">
        
        {/* Header POS */}
        <header className="d-flex justify-content-between align-items-center mb-4 gap-3 flex-wrap">
          <div>
            <h1 className="h3 fw-bold m-0 text-white">Kasir (Point of Sale)</h1>
            <p className="text-muted m-0" style={{ fontSize: '0.9rem' }}>Pilih menu makanan dan minuman pizza terbaik untuk pelanggan</p>
          </div>
          
          {/* Controls: Search & CRUD Button */}
          <div className="d-flex align-items-center gap-2 flex-wrap" style={{ maxWidth: '100%' }}>
            <Link 
              href="/admin/products" 
              className="btn btn-pizza-primary d-flex align-items-center gap-2 py-2 px-3 shadow-sm"
              style={{ borderRadius: '12px', fontSize: '0.85rem' }}
            >
              <i className="bi bi-egg-fried fs-5 text-white"></i>
              <span>Kelola Produk (CRUD)</span>
            </Link>

            <div className="position-relative" style={{ width: '280px', maxWidth: '100%' }}>
              <span className="position-absolute top-50 start-0 translate-middle-y ps-3 text-muted">
                <i className="bi bi-search"></i>
              </span>
              <input 
                type="text" 
                className="form-control bg-pizza-card border-pizza text-white ps-5 py-2" 
                placeholder="Cari pizza, minuman, snack..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ borderRadius: '12px' }}
              />
              {searchQuery && (
                <button 
                  className="btn position-absolute top-50 end-0 translate-middle-y pe-3 text-muted border-0"
                  onClick={() => setSearchQuery('')}
                >
                  <i className="bi bi-x-circle-fill"></i>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Layout Grid 2 Kolom (Menu & Keranjang) */}
        <div className="row g-4">
          
          {/* Kolom Kiri: Menu Grid (70%) */}
          <div className="col-lg-8 col-md-7">
            
            {/* Category Filter Tabs */}
            <div className="d-flex gap-2 mb-4 category-tabs-scroll pb-1">
              <button 
                className={`btn category-tab ${activeCategory === 'all' ? 'active' : ''}`}
                onClick={() => setActiveCategory('all')}
              >
                <i className="bi bi-grid-fill me-2"></i>Semua Menu
              </button>
              <button 
                className={`btn category-tab ${activeCategory === 'pizza' ? 'active' : ''}`}
                onClick={() => setActiveCategory('pizza')}
              >
                <i className="bi bi-pie-chart-fill me-2"></i>Pizza
              </button>
              <button 
                className={`btn category-tab ${activeCategory === 'sides' ? 'active' : ''}`}
                onClick={() => setActiveCategory('sides')}
              >
                <i className="bi bi-egg-fried me-2"></i>Sampingan (Sides)
              </button>
              <button 
                className={`btn category-tab ${activeCategory === 'beverage' ? 'active' : ''}`}
                onClick={() => setActiveCategory('beverage')}
              >
                <i className="bi bi-cup-straw me-2"></i>Minuman
              </button>
            </div>

            {/* Status koneksi database */}
            {!isDbConnected && (
              <div className="alert alert-warning d-flex align-items-center gap-2 mb-3" role="alert" style={{ fontSize: '0.85rem' }}>
                <i className="bi bi-exclamation-triangle-fill"></i>
                <span>Tidak terhubung ke Supabase. Pastikan tabel <strong>products</strong> sudah dibuat dan data produk sudah diisi.</span>
              </div>
            )}

            {/* Menu Cards Grid */}
            {isMenuLoading ? (
              /* Loading Skeleton */
              <div className="row row-cols-1 row-cols-sm-2 row-cols-md-2 row-cols-xl-3 g-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="col">
                    <div className="card pizza-card placeholder-glow">
                      <div className="pizza-card-img-wrapper">
                        <span className="placeholder w-100 h-100" style={{ minHeight: '140px', display: 'block', borderRadius: '12px 12px 0 0' }}></span>
                      </div>
                      <div className="card-body p-3">
                        <h5 className="card-title"><span className="placeholder col-8"></span></h5>
                        <p className="card-text"><span className="placeholder col-12"></span></p>
                        <div className="d-flex justify-content-between">
                          <span className="placeholder col-4"></span>
                          <span className="placeholder col-2 rounded-circle"></span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredItems.length > 0 ? (
              <div className="row row-cols-1 row-cols-sm-2 row-cols-md-2 row-cols-xl-3 g-3">
                {filteredItems.map((item) => (
                  <div key={item.id} className="col">
                    <div 
                      className="card pizza-card" 
                      onClick={() => addToCart(item)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="pizza-card-img-wrapper">
                        {/* Pizza category badge */}
                        <span className="pizza-category-badge">{item.category}</span>
                        {/* Pizza/Item image illustration */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          className="pizza-card-img"
                          onError={(e) => {
                            // Fallback jika gambar tidak ditemukan
                            (e.target as HTMLImageElement).src = '/images/placeholder.png';
                          }}
                        />
                      </div>
                      <div className="card-body d-flex flex-column justify-content-between p-3">
                        <div>
                          <h5 className="card-title fw-bold text-white mb-1" style={{ fontSize: '1.05rem' }}>{item.name}</h5>
                          <p className="card-text text-muted mb-3" style={{ fontSize: '0.85rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '36px' }}>
                            {item.description}
                          </p>
                        </div>
                        <div className="d-flex justify-content-between align-items-center mt-2">
                          <span className="text-orange fw-bold fs-5">{formatPrice(item.price)}</span>
                          <span className="btn btn-pizza-primary btn-sm rounded-circle d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px', padding: 0 }}>
                            <i className="bi bi-plus-lg text-white"></i>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-5 rounded bg-pizza-card border border-pizza">
                <i className="bi bi-inbox text-muted fs-1 mb-3 d-block"></i>
                {menuItems.length === 0 ? (
                  <div className="d-flex flex-column align-items-center p-3">
                    <h5 className="fw-semibold text-white">Belum Ada Produk</h5>
                    <p className="text-muted small mb-3">Database Supabase Anda sudah tersambung, tetapi tabel produk masih kosong.</p>
                    <Link 
                      href="/admin/products"
                      className="btn btn-pizza-primary btn-sm d-flex align-items-center gap-2 py-2 px-3 shadow"
                      style={{ borderRadius: '10px' }}
                    >
                      <i className="bi bi-plus-circle text-white"></i>
                      <span>Kelola & Tambah Produk</span>
                    </Link>
                  </div>
                ) : (
                  <>
                    <h5 className="fw-semibold">Menu Tidak Ditemukan</h5>
                    <p className="text-muted small">Coba ubah filter kategori atau kata kunci pencarian Anda</p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Kolom Kanan: Keranjang Belanja (30%) */}
          <div className="col-lg-4 col-md-5">
            <div className="card bg-pizza-card border-pizza h-100 d-flex flex-column" style={{ minHeight: 'calc(100vh - 150px)', borderRadius: '16px' }}>
              
              {/* Cart Header */}
              <div className="card-header border-bottom border-pizza bg-transparent p-3 d-flex justify-content-between align-items-center">
                <h5 className="fw-bold m-0 text-white">
                  <i className="bi bi-cart3 me-2 text-orange"></i>Keranjang Belanja
                </h5>
                {cart.length > 0 && (
                  <button 
                    className="btn btn-outline-danger btn-sm border-0" 
                    onClick={clearCart}
                    style={{ fontSize: '0.85rem' }}
                  >
                    Hapus Semua
                  </button>
                )}
              </div>

              {/* Cart Items Area */}
              <div className="card-body p-3 flex-grow-1 cart-scroll-area">
                {cart.length > 0 ? (
                  cart.map((cartItem, idx) => (
                    <div key={`${cartItem.item.id}-${idx}`} className="cart-item">
                      <div className="d-flex justify-content-between align-items-start gap-2">
                        <div className="flex-grow-1">
                          <span className="fw-bold text-white d-block" style={{ fontSize: '0.95rem' }}>{cartItem.item.name}</span>
                          <span className="text-orange fw-medium small">{formatPrice(cartItem.item.price)}</span>
                        </div>
                        <button 
                          className="btn btn-link text-danger border-0 p-0 fs-5 lh-1" 
                          onClick={() => updateQuantity(cartItem.item.id, 0)}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>

                      {/* Quantity Controls & Notes */}
                      <div className="d-flex justify-content-between align-items-center mt-2 flex-wrap gap-2">
                        {/* Quantity Counter */}
                        <div className="d-flex align-items-center bg-dark bg-opacity-50 rounded border border-pizza p-1">
                          <button 
                            className="btn btn-sm text-white border-0 py-0 px-2"
                            onClick={() => removeFromCart(cartItem.item.id)}
                          >
                            <i className="bi bi-dash"></i>
                          </button>
                          <span className="px-3 fw-bold" style={{ fontSize: '0.9rem' }}>{cartItem.quantity}</span>
                          <button 
                            className="btn btn-sm text-white border-0 py-0 px-2"
                            onClick={() => addToCart(cartItem.item)}
                          >
                            <i className="bi bi-plus"></i>
                          </button>
                        </div>

                        {/* Note Input */}
                        <input 
                          type="text"
                          className="form-control bg-transparent border-0 border-bottom border-pizza text-white p-0"
                          placeholder="Catatan tambahan (saus, dll)..."
                          value={cartItem.notes || ''}
                          onChange={(e) => updateNotes(cartItem.item.id, e.target.value)}
                          style={{ fontSize: '0.75rem', width: '130px', borderRadius: 0 }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-5 d-flex flex-column align-items-center justify-content-center h-100" style={{ minHeight: '220px' }}>
                    <div className="bg-dark bg-opacity-25 rounded-circle p-3 mb-3 border border-pizza">
                      <i className="bi bi-cart-x text-muted fs-1"></i>
                    </div>
                    <h6 className="fw-semibold">Keranjang Belanja Kosong</h6>
                    <p className="text-muted small px-3">Klik item makanan di kolom kiri untuk memasukkan ke keranjang.</p>
                  </div>
                )}
              </div>

              {/* Cart Footer & Checkout Calculator */}
              <div className="card-footer bg-transparent border-top border-pizza p-3 mt-auto">
                
                {/* Rincian Harga */}
                <div className="small mb-3">
                  <div className="d-flex justify-content-between mb-1 text-muted">
                    <span>Subtotal:</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-1 text-muted">
                    <span>Pajak (10%):</span>
                    <span>{formatPrice(tax)}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2 text-muted">
                    <span>Biaya Layanan (5%):</span>
                    <span>{formatPrice(serviceCharge)}</span>
                  </div>
                  <div className="d-flex justify-content-between fw-bold text-white fs-5 border-top border-pizza pt-2 mt-2">
                    <span>Total Belanja:</span>
                    <span className="text-yellow">{formatPrice(grandTotal)}</span>
                  </div>
                </div>

                {/* Form Input Pembayaran */}
                {cart.length > 0 && (
                  <div className="mb-3 bg-dark bg-opacity-50 p-3 rounded border border-pizza">
                    <label className="form-label small text-muted fw-semibold">NOMINAL BAYAR (TUNAI)</label>
                    <div className="input-group mb-2">
                      <span className="input-group-text border-pizza px-2">Rp</span>
                      <input 
                        type="number" 
                        className="form-control bg-transparent border-pizza text-white fw-bold text-end"
                        placeholder="0"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        min={grandTotal}
                      />
                    </div>

                    {/* Predefined Quick Payment Buttons */}
                    <div className="d-flex gap-1 mb-2 overflow-auto py-1">
                      <button className="btn btn-sm btn-outline-secondary border-pizza flex-grow-1" style={{ fontSize: '0.75rem' }} onClick={handlePayExact}>
                        Pas
                      </button>
                      <button className="btn btn-sm btn-outline-secondary border-pizza flex-grow-1" style={{ fontSize: '0.75rem' }} onClick={() => handleQuickPay(50000)}>
                        50rb
                      </button>
                      <button className="btn btn-sm btn-outline-secondary border-pizza flex-grow-1" style={{ fontSize: '0.75rem' }} onClick={() => handleQuickPay(100000)}>
                        100rb
                      </button>
                      <button className="btn btn-sm btn-outline-secondary border-pizza flex-grow-1" style={{ fontSize: '0.75rem' }} onClick={() => handleQuickPay(200000)}>
                        200rb
                      </button>
                    </div>

                    {/* Kembalian */}
                    <div className="d-flex justify-content-between align-items-center mt-2">
                      <span className="small text-muted fw-semibold">KEMBALIAN:</span>
                      <span className={`fw-bold fs-6 ${changeAmount > 0 ? 'text-success' : 'text-danger'}`}>
                        {formatPrice(changeAmount)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <button 
                  className="btn btn-pizza-primary w-100 py-3 d-flex align-items-center justify-content-center gap-2"
                  disabled={cart.length === 0 || !paymentAmount || parseFloat(paymentAmount) < grandTotal}
                  onClick={handleCheckout}
                >
                  <i className="bi bi-wallet2"></i>
                  <span>Simpan Transaksi & Cetak Struk</span>
                </button>
              </div>

            </div>
          </div>

        </div>
      </main>

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
