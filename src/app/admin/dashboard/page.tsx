'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { useCart, Transaction } from '@/context/CartContext';

export default function DashboardPage() {
  const { transactions, menuItems, loadTransactions, isDbConnected } = useCart();
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month'>('month');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadTransactions();
  }, [loadTransactions]);

  if (!mounted) return null;

  // Filter waktu transaksi helper
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfThisWeek = startOfToday - 7 * 24 * 60 * 60 * 1000;
  const startOfThisMonth = startOfToday - 30 * 24 * 60 * 60 * 1000;

  // Filter Transaksi berdasarkan Rentang Waktu & Kolom Pencarian
  const filteredTxs = transactions.filter((tx) => {
    const txTime = new Date(tx.timestamp).getTime();
    
    // 1. Filter Waktu
    let matchesTime = false;
    if (timeFilter === 'today') {
      matchesTime = txTime >= startOfToday;
    } else if (timeFilter === 'week') {
      matchesTime = txTime >= startOfThisWeek;
    } else if (timeFilter === 'month') {
      matchesTime = txTime >= startOfThisMonth;
    }

    // 2. Filter Pencarian
    const matchesSearch = tx.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          tx.cashier.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTime && matchesSearch;
  });

  // -------------------- KALKULASI METRIK UTAMA --------------------
  
  // Hitung Pendapatan Berdasarkan Filter yang Aktif
  const getRevenueByFilter = (filterType: 'today' | 'week' | 'month') => {
    const minTime = filterType === 'today' ? startOfToday : filterType === 'week' ? startOfThisWeek : startOfThisMonth;
    return transactions
      .filter(tx => new Date(tx.timestamp).getTime() >= minTime)
      .reduce((acc, curr) => acc + curr.total, 0);
  };

  const revenueToday = getRevenueByFilter('today');
  const revenueWeek = getRevenueByFilter('week');
  const revenueMonth = getRevenueByFilter('month');

  // Hitung Pizza Terjual – menggunakan menuItems dari database
  const totalPizzasSold = transactions
    .filter(tx => new Date(tx.timestamp).getTime() >= startOfThisMonth)
    .reduce((acc, curr) => {
      const pizzaItemsCount = curr.items
        .filter(item => {
          // Check jika id menu ada di kategori pizza
          const menuItem = menuItems.find(m => m.id === item.productId);
          return menuItem?.category === 'pizza';
        })
        .reduce((sum, item) => sum + item.quantity, 0);
      return acc + pizzaItemsCount;
    }, 0);

  // -------------------- GRAFIK & ANALISIS TREN --------------------

  // 1. Data Tren Penjualan Harian 7 Hari Terakhir
  const last7DaysData = Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date();
    d.setDate(now.getDate() - (6 - idx));
    const label = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    
    const dailyTotal = transactions
      .filter(tx => {
        const time = new Date(tx.timestamp).getTime();
        return time >= dayStart && time < dayEnd;
      })
      .reduce((acc, curr) => acc + curr.total, 0);

    return { label, total: dailyTotal };
  });

  const maxDailyRevenue = Math.max(...last7DaysData.map(d => d.total), 1);

  // 2. Top 3 Produk Terlaris (semua kategori)
  const productSalesStats: { [key: string]: { name: string; qty: number; sales: number } } = {};
  
  transactions
    .filter(tx => new Date(tx.timestamp).getTime() >= startOfThisMonth)
    .forEach((tx) => {
      tx.items.forEach((item) => {
        if (!productSalesStats[item.productId]) {
          productSalesStats[item.productId] = {
            name: item.productName,
            qty: 0,
            sales: 0
          };
        }
        productSalesStats[item.productId].qty += item.quantity;
        productSalesStats[item.productId].sales += item.price * item.quantity;
      });
    });

  const topProducts = Object.values(productSalesStats)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 3);

  const maxProductQty = topProducts[0]?.qty || 1;

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  };

  const handleExportExcel = () => {
    if (filteredTxs.length === 0) {
      alert('Tidak ada data transaksi untuk diekspor!');
      return;
    }

    const headers = [
      'No. Struk',
      'Waktu Transaksi',
      'Nama Kasir',
      'Total Item',
      'Subtotal (IDR)',
      'Pajak 10% (IDR)',
      'Service 5% (IDR)',
      'Total Bayar (IDR)',
      'Item Dipesan & Catatan'
    ];

    const rows = filteredTxs.map((tx) => {
      const itemsFormatted = tx.items
        .map((item) => `${item.productName} (x${item.quantity})${item.notes ? ` [Catatan: ${item.notes}]` : ''}`)
        .join('; ');

      return [
        tx.id,
        new Date(tx.timestamp).toLocaleString('id-ID'),
        tx.cashier,
        tx.totalItems,
        tx.subtotal,
        tx.tax,
        tx.serviceCharge,
        tx.total,
        `"${itemsFormatted}"`
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Set appropriate filename based on filter
    const reportType = timeFilter === 'today' ? 'Harian' : timeFilter === 'week' ? 'Mingguan' : 'Bulanan';
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', `Laporan_Penjualan_${reportType}_${dateStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    if (filteredTxs.length === 0) {
      alert('Tidak ada data transaksi untuk diekspor!');
      return;
    }

    const reportType = timeFilter === 'today' ? 'HARIAN' : timeFilter === 'week' ? 'MINGGUAN' : 'BULANAN';
    const reportDate = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    // Hitung total ringkasan
    const totalTransactions = filteredTxs.length;
    const totalRevenue = filteredTxs.reduce((sum, tx) => sum + tx.total, 0);
    const totalItemsCount = filteredTxs.reduce((sum, tx) => sum + tx.totalItems, 0);

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Gagal membuka jendela cetak. Pastikan pop-up diperbolehkan di browser Anda.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Laporan Penjualan ${reportType} - Gilang Pizza POS</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          body {
            font-family: 'Inter', sans-serif;
            color: #1e293b;
            margin: 0;
            padding: 30px;
            background-color: #fff;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #0d9488;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .logo-area {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .logo-circle {
            background-color: #0d9488;
            color: white;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
            font-weight: bold;
            font-size: 20px;
          }
          .logo-text {
            font-weight: 800;
            font-size: 20px;
            letter-spacing: 0.5px;
            color: #0f172a;
          }
          .logo-subtext {
            color: #0d9488;
            font-size: 10px;
            font-weight: 600;
            display: block;
            margin-top: -3px;
          }
          .title-area {
            text-align: right;
          }
          .report-title {
            font-size: 24px;
            font-weight: 700;
            color: #0d9488;
            margin: 0;
          }
          .report-subtitle {
            font-size: 12px;
            color: #64748b;
            margin: 4px 0 0 0;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-bottom: 30px;
          }
          .stat-card {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 16px;
            text-align: left;
          }
          .stat-label {
            font-size: 11px;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
          }
          .stat-value {
            font-size: 20px;
            font-weight: 700;
            color: #0f172a;
          }
          .table-container {
            margin-bottom: 30px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            text-align: left;
          }
          th {
            background-color: #f1f5f9;
            color: #475569;
            font-weight: 600;
            padding: 12px 10px;
            border-bottom: 2px solid #e2e8f0;
          }
          td {
            padding: 12px 10px;
            border-bottom: 1px solid #f1f5f9;
            color: #334155;
          }
          tr:nth-child(even) td {
            background-color: #f8fafc;
          }
          .price-column {
            text-align: right;
            font-weight: 600;
          }
          .items-cell {
            max-width: 320px;
            line-height: 1.4;
          }
          .notes-badge {
            display: inline-block;
            background-color: #ffedd5;
            color: #c2410c;
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 4px;
            margin-top: 4px;
            font-weight: 500;
          }
          .footer {
            text-align: center;
            font-size: 10px;
            color: #94a3b8;
            margin-top: 50px;
            border-top: 1px solid #e2e8f0;
            padding-top: 20px;
          }
          @media print {
            body {
              padding: 0;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-area">
            <div class="logo-circle">P</div>
            <div>
              <span class="logo-text">GILANG PIZZA</span>
              <span class="logo-subtext">POS SYSTEM REPORTS</span>
            </div>
          </div>
          <div class="title-area">
            <h1 class="report-title">LAPORAN PENJUALAN ${reportType}</h1>
            <p class="report-subtitle">Dicetak pada: ${reportDate}</p>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Total Transaksi</div>
            <div class="stat-value">${totalTransactions} Transaksi</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Item Terjual</div>
            <div class="stat-value">${totalItemsCount} Porsi</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Omzet Pendapatan</div>
            <div class="stat-value" style="color: #0d9488;">${formatPrice(totalRevenue)}</div>
          </div>
        </div>

        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th style="width: 100px;">No. Struk</th>
                <th style="width: 130px;">Waktu Transaksi</th>
                <th style="width: 100px;">Nama Kasir</th>
                <th>Menu yang Dipesan & Catatan</th>
                <th style="width: 80px; text-align: center;">Total Item</th>
                <th style="width: 120px; text-align: right;">Total Bayar</th>
              </tr>
            </thead>
            <tbody>
              ${filteredTxs.map((tx) => {
                const itemsFormatted = tx.items.map(item => `
                  <div style="margin-bottom: 6px;">
                    <strong>${item.productName}</strong> (x${item.quantity})
                    ${item.notes ? `<div class="notes-badge">Catatan: ${item.notes}</div>` : ''}
                  </div>
                `).join('');

                return `
                  <tr>
                    <td style="font-weight: 700; color: #0d9488;">${tx.id}</td>
                    <td>${new Date(tx.timestamp).toLocaleString('id-ID')}</td>
                    <td>${tx.cashier}</td>
                    <td class="items-cell">${itemsFormatted}</td>
                    <td style="text-align: center;">${tx.totalItems}</td>
                    <td class="price-column">${formatPrice(tx.total)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <div class="footer">
          <p>Laporan Penjualan Gilang Pizza POS - Seluruh hak cipta dilindungi undang-undang.</p>
        </div>

        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="d-flex flex-column flex-md-row text-slate-900 bg-slate-50 min-vh-100">
      {/* Sidebar Navigasi */}
      <Sidebar />

      {/* Main Container Dashboard */}
      <main className="flex-grow-1 p-4 bg-slate-50 main-content-responsive">
        
        {/* Header Admin */}
        <header className="d-flex justify-content-between align-items-center mb-4 gap-3 flex-wrap">
          <div>
            <h1 className="h3 font-bold m-0 text-slate-900">Dashboard Owner / Admin</h1>
            <p className="text-slate-500 m-0" style={{ fontSize: '0.9rem' }}>Pantau performa penjualan, tren produk terlaris, dan riwayat transaksi</p>
          </div>
          
          <button 
            className="btn bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold border-0 shadow-sm gap-2 d-flex align-items-center py-2 px-3"
            onClick={() => loadTransactions()}
            style={{ borderRadius: '12px', fontSize: '0.85rem' }}
          >
            <i className="bi bi-arrow-repeat text-slate-900"></i>
            <span>Refresh Data Transaksi</span>
          </button>
        </header>

        {/* METRICS CARDS (BARIS ATAS) */}
        <div className="row g-3 mb-4">
          
          {/* Card Pendapatan Hari Ini */}
          <div className="col-xl-3 col-sm-6">
            <div className="card dashboard-card bg-white border border-slate-200 shadow-sm p-3 h-100">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-slate-500 small font-semibold">PENDAPATAN HARI INI</span>
                <div className="bg-yellow-400 text-slate-900 p-2 rounded-lg">
                  <i className="bi bi-wallet2 fs-5"></i>
                </div>
              </div>
              <h3 className="font-bold m-0 text-slate-800">{formatPrice(revenueToday)}</h3>
              <span className="text-slate-500 small mt-2 d-block">
                <i className="bi bi-graph-up me-1 text-slate-900"></i>Live update dari kasir
              </span>
            </div>
          </div>

          {/* Card Pendapatan Minggu Ini */}
          <div className="col-xl-3 col-sm-6">
            <div className="card dashboard-card bg-white border border-slate-200 shadow-sm p-3 h-100">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-slate-500 small font-semibold">PENDAPATAN MINGGU INI</span>
                <div className="bg-slate-100 text-slate-900 p-2 rounded-lg">
                  <i className="bi bi-calendar2-range fs-5"></i>
                </div>
              </div>
              <h3 className="font-bold m-0 text-slate-800">{formatPrice(revenueWeek)}</h3>
              <span className="text-slate-500 small mt-2 d-block">7 Hari ke belakang</span>
            </div>
          </div>

          {/* Card Pendapatan Bulan Ini */}
          <div className="col-xl-3 col-sm-6">
            <div className="card dashboard-card bg-white border border-slate-200 shadow-sm p-3 h-100">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-slate-500 small font-semibold">PENDAPATAN BULAN INI</span>
                <div className="bg-yellow-400 text-slate-900 p-2 rounded-lg">
                  <i className="bi bi-graph-up-arrow fs-5"></i>
                </div>
              </div>
              <h3 className="font-bold m-0 text-slate-800">{formatPrice(revenueMonth)}</h3>
              <span className="text-slate-500 small mt-2 d-block">30 Hari terakhir</span>
            </div>
          </div>

          {/* Card Pizza Terjual */}
          <div className="col-xl-3 col-sm-6">
            <div className="card dashboard-card bg-white border border-slate-200 shadow-sm p-3 h-100">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-slate-500 small font-semibold">PIZZA TERJUAL (BULAN INI)</span>
                <div className="bg-slate-900 text-yellow-400 p-2 rounded-lg">
                  <i className="bi bi-pie-chart-fill fs-5"></i>
                </div>
              </div>
              <h3 className="font-bold m-0 text-slate-800">{totalPizzasSold} Loyang</h3>
              <span className="text-slate-500 small mt-2 d-block">
                <i className="bi bi-fire me-1 text-slate-900"></i>Menu Terlaris
              </span>
            </div>
          </div>

        </div>

        {/* GRAFIK & TREN (KOLOM DUA) */}
        <div className="row g-4 mb-4">
          
          {/* Tren Penjualan Harian (Chart Custom CSS/HTML) */}
          <div className="col-lg-8">
            <div className="card bg-white border border-slate-200 shadow-sm p-4 h-100" style={{ borderRadius: '16px' }}>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="font-bold m-0 text-slate-900">
                  <i className="bi bi-activity text-slate-900 me-2"></i>Tren Penjualan Harian (7 Hari Terakhir)
                </h5>
                <span className="badge bg-slate-100 border border-slate-200 text-slate-500">Statistik Pendapatan</span>
              </div>
              
              {/* Custom CSS Bar Graph */}
              <div className="d-flex align-items-end justify-content-between pt-4 pb-2 px-2" style={{ height: '220px' }}>
                {last7DaysData.map((data, idx) => {
                  const barHeight = Math.round((data.total / maxDailyRevenue) * 100);
                  return (
                    <div key={idx} className="d-flex flex-column align-items-center flex-grow-1" style={{ maxWidth: '60px' }}>
                      <div className="small text-slate-800 font-bold mb-2" style={{ fontSize: '0.75rem' }}>
                        {data.total > 0 ? `${(data.total / 1000).toFixed(0)}k` : '0'}
                      </div>
                      <div 
                        className="bg-yellow-400 rounded-top position-relative w-50 bar-hover" 
                        style={{ 
                          height: `${Math.max(barHeight, 5)}%`, 
                          minHeight: '8px',
                          backgroundColor: '#facc15',
                          transition: 'height 0.8s ease'
                        }}
                      ></div>
                      <div className="text-slate-500 mt-2 text-center" style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                        {data.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Top 3 Produk Terlaris */}
          <div className="col-lg-4">
            <div className="card bg-white border border-slate-200 shadow-sm p-4 h-100" style={{ borderRadius: '16px' }}>
              <h5 className="font-bold mb-4 text-slate-900">
                <i className="bi bi-award text-slate-900 me-2"></i>Top 3 Produk Terlaris
              </h5>
              
              {topProducts.length > 0 ? (
                <div className="d-flex flex-column gap-3">
                  {topProducts.map((product, idx) => {
                    const widthPct = Math.round((product.qty / maxProductQty) * 100);
                    return (
                      <div key={idx}>
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span className="font-bold text-slate-900 small" style={{ fontSize: '0.9rem' }}>
                            {idx + 1}. {product.name}
                          </span>
                          <span className="text-slate-800 small font-bold">{product.qty} Porsi</span>
                        </div>
                        <div className="progress bg-slate-100" style={{ height: '10px', borderRadius: '5px', border: '1px solid #e2e8f0' }}>
                          <div 
                            className="progress-bar rounded-pill" 
                            role="progressbar" 
                            style={{ 
                              width: `${widthPct}%`, 
                              backgroundColor: idx === 0 ? '#facc15' : idx === 1 ? '#0f172a' : '#64748b'
                            }}
                          ></div>
                        </div>
                        <div className="d-flex justify-content-between align-items-center mt-1">
                          <span className="text-slate-500 small" style={{ fontSize: '0.75rem' }}>Nilai Omzet</span>
                          <span className="font-bold text-slate-800 small" style={{ fontSize: '0.75rem' }}>{formatPrice(product.sales)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-5">
                  <i className="bi bi-pie-chart text-slate-400 fs-2 mb-2 d-block"></i>
                  <p className="text-slate-500 small">Belum ada transaksi bulan ini.</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* TABEL RIWAYAT TRANSAKSI (BARIS BAWAH) */}
        <div className="card bg-white border border-slate-200 shadow-sm p-4" style={{ borderRadius: '16px' }}>
          
          <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
            <h5 className="font-bold m-0 text-slate-900">
              <i className="bi bi-clock-history text-slate-900 me-2"></i>Riwayat Transaksi
            </h5>
            
            {/* Filter Tools (Search, Date Dropdown, Export Buttons) */}
            <div className="d-flex gap-2 align-items-center flex-wrap">
              
              {/* Tombol Ekspor */}
              <div className="d-flex gap-2 me-2">
                <button
                  className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2 py-2 px-3 shadow-sm"
                  onClick={handleExportExcel}
                  title="Ekspor Laporan ke Excel (.csv)"
                  style={{ borderRadius: '10px', fontSize: '0.8rem', fontWeight: 600 }}
                >
                  <i className="bi bi-file-earmark-excel-fill text-success fs-6"></i>
                  <span>Ekspor Excel</span>
                </button>
                <button
                  className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2 py-2 px-3 shadow-sm"
                  onClick={handleExportPDF}
                  title="Simpan/Cetak PDF Laporan"
                  style={{ borderRadius: '10px', fontSize: '0.8rem', fontWeight: 600 }}
                >
                  <i className="bi bi-file-earmark-pdf-fill text-danger fs-6"></i>
                  <span>Ekspor PDF</span>
                </button>
              </div>

              {/* Pencarian */}
              <input 
                type="text" 
                className="form-control bg-dark border-pizza text-white py-2" 
                placeholder="Cari Struk / Kasir..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ borderRadius: '10px', width: '200px', fontSize: '0.85rem' }}
              />
              
              {/* Dropdown Filter Waktu */}
              <select 
                className="form-select bg-dark border-pizza text-white py-2"
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value as any)}
                style={{ borderRadius: '10px', width: '150px', fontSize: '0.85rem', cursor: 'pointer' }}
              >
                <option value="today">Hari Ini</option>
                <option value="week">Minggu Ini (7 Hari)</option>
                <option value="month">Bulan Ini (30 Hari)</option>
              </select>
            </div>
          </div>

          {/* Tabel Riwayat */}
          <div className="table-responsive">
            <table className="table table-dark table-hover align-middle border-pizza m-0 text-white" style={{ fontSize: '0.9rem' }}>
              <thead>
                <tr className="text-muted border-bottom border-pizza">
                  <th scope="col" className="py-3">No. Struk</th>
                  <th scope="col" className="py-3">Waktu Transaksi</th>
                  <th scope="col" className="py-3">Nama Kasir</th>
                  <th scope="col" className="py-3 text-center">Total Item</th>
                  <th scope="col" className="py-3 text-end">Total Bayar</th>
                  <th scope="col" className="py-3 text-center">Metode</th>
                  <th scope="col" style={{ width: '130px' }} className="py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredTxs.length > 0 ? (
                  filteredTxs.map((tx) => {
                    const isExpanded = expandedTxId === tx.id;
                    return (
                      <React.Fragment key={tx.id}>
                        {/* Baris Transaksi Utama */}
                        <tr className="border-bottom border-pizza-dark align-middle">
                          <td className="py-3 fw-bold text-orange">{tx.id}</td>
                          <td className="py-3 text-muted">{new Date(tx.timestamp).toLocaleString('id-ID')}</td>
                          <td className="py-3">{tx.cashier}</td>
                          <td className="py-3 text-center fw-medium">{tx.totalItems}</td>
                          <td className="py-3 text-end fw-bold text-yellow">{formatPrice(tx.total)}</td>
                          <td className="py-3 text-center">
                            {tx.paymentMethod === 'qris' ? (
                              <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-2 py-1" style={{ fontSize: '0.75rem' }}>
                                QRIS
                              </span>
                            ) : tx.paymentMethod === 'gofood' ? (
                              <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 px-2 py-1" style={{ fontSize: '0.75rem' }}>
                                GoFood
                              </span>
                            ) : tx.paymentMethod === 'grabfood' ? (
                              <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2 py-1" style={{ fontSize: '0.75rem' }}>
                                GrabFood
                              </span>
                            ) : (
                              <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2 py-1" style={{ fontSize: '0.75rem' }}>
                                Tunai
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-center">
                            <button
                              className={`btn btn-sm ${isExpanded ? 'btn-pizza-primary' : 'btn-outline-secondary'} py-1 px-3 d-flex align-items-center gap-2 justify-content-center mx-auto`}
                              onClick={() => setExpandedTxId(isExpanded ? null : tx.id)}
                              style={{ borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600 }}
                            >
                              <i className={`bi ${isExpanded ? 'bi-chevron-up' : 'bi-eye-fill'} fs-6`}></i>
                              <span>{isExpanded ? 'Tutup' : 'Detail'}</span>
                            </button>
                          </td>
                        </tr>

                        {/* Baris Detail Collapsible */}
                        {isExpanded && (
                          <tr className="border-bottom border-pizza-dark" style={{ backgroundColor: 'rgba(13, 148, 136, 0.02)' }}>
                            <td colSpan={7} className="p-0">
                              <div className="p-4 m-3 rounded-4 border bg-white shadow-sm" style={{ borderColor: 'var(--pizza-border)' }}>
                                <div className="row g-4">
                                  {/* Kolom Kiri: Daftar Menu Produk yang Dipesan */}
                                  <div className="col-lg-7">
                                    <h6 className="fw-bold mb-3 d-flex align-items-center gap-2" style={{ color: 'var(--pizza-text)' }}>
                                      <i className="bi bi-basket3 text-orange fs-5"></i>
                                      <span>Rincian Produk Belanja</span>
                                    </h6>
                                    <div className="table-responsive bg-light rounded-3 border" style={{ borderColor: 'var(--pizza-border)' }}>
                                      <table className="table table-hover align-middle m-0 text-dark" style={{ fontSize: '0.85rem' }}>
                                        <thead className="bg-light border-bottom" style={{ borderColor: 'var(--pizza-border)' }}>
                                          <tr className="text-muted" style={{ fontSize: '0.75rem' }}>
                                            <th scope="col" className="py-2 ps-3">Item Menu / Topping</th>
                                            <th scope="col" className="py-2 text-center" style={{ width: '80px' }}>Jumlah</th>
                                            <th scope="col" className="py-2 text-end" style={{ width: '120px' }}>Harga Satuan</th>
                                            <th scope="col" className="py-2 text-end pe-3" style={{ width: '120px' }}>Subtotal</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {tx.items.map((item, idx) => (
                                            <tr key={idx} className="border-bottom" style={{ borderColor: 'var(--pizza-border)' }}>
                                              <td className="py-2 ps-3 fw-semibold text-dark">
                                                <div>{item.productName}</div>
                                                {item.notes && (
                                                  <div className="small text-orange d-flex align-items-center gap-1 mt-1" style={{ fontSize: '0.75rem', fontWeight: 500 }}>
                                                    <i className="bi bi-chat-left-text-fill text-orange"></i>
                                                    <span>Catatan: {item.notes}</span>
                                                  </div>
                                                )}
                                              </td>
                                              <td className="py-2 text-center fw-medium text-muted">{item.quantity}</td>
                                              <td className="py-2 text-end text-muted">{formatPrice(item.price)}</td>
                                              <td className="py-2 text-end fw-bold text-orange pe-3">{formatPrice(item.price * item.quantity)}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>

                                  {/* Kolom Kanan: Rincian Pembayaran / Kalkulator Kasir */}
                                  <div className="col-lg-5">
                                    <h6 className="fw-bold mb-3 d-flex align-items-center gap-2" style={{ color: 'var(--pizza-text)' }}>
                                      <i className="bi bi-receipt-cutoff text-orange fs-5"></i>
                                      <span>Struk Kasir & Pembayaran</span>
                                    </h6>
                                    <div className="bg-light p-3 rounded-3 border" style={{ borderColor: 'var(--pizza-border)', color: 'var(--pizza-text)' }}>
                                      
                                      <div className="d-flex justify-content-between mb-2 small text-muted">
                                        <span>No. Struk Penjualan:</span>
                                        <span className="fw-semibold text-dark">{tx.id}</span>
                                      </div>
                                      <div className="d-flex justify-content-between mb-2 small text-muted">
                                        <span>Kasir Pemroses:</span>
                                        <span className="fw-semibold text-dark">{tx.cashier}</span>
                                      </div>
                                      <div className="d-flex justify-content-between mb-3 small text-muted">
                                        <span>Waktu Transaksi:</span>
                                        <span className="fw-semibold text-dark">{new Date(tx.timestamp).toLocaleString('id-ID')}</span>
                                      </div>

                                      <hr className="my-2" style={{ borderColor: 'var(--pizza-border)' }} />

                                      <div className="d-flex justify-content-between mb-2 small text-muted">
                                        <span>Subtotal Belanja:</span>
                                        <span>{formatPrice(tx.subtotal)}</span>
                                      </div>
                                      <div className="d-flex justify-content-between mb-2 small text-muted">
                                        <span>Pajak Restoran (10%):</span>
                                        <span>{formatPrice(tx.tax)}</span>
                                      </div>
                                      <div className="d-flex justify-content-between mb-2 small text-muted">
                                        <span>Biaya Layanan (5%):</span>
                                        <span>{formatPrice(tx.serviceCharge)}</span>
                                      </div>
                                      <div className="d-flex justify-content-between mb-2 fw-bold text-dark border-top pt-2 mt-2" style={{ fontSize: '1rem' }}>
                                        <span>Total Tagihan:</span>
                                        <span className="text-orange">{formatPrice(tx.total)}</span>
                                      </div>

                                      <hr className="my-2" style={{ borderColor: 'var(--pizza-border)' }} />

                                      <div className="d-flex justify-content-between mb-2 small text-muted">
                                        <span>Nominal Bayar (Tunai):</span>
                                        <span className="fw-medium text-dark">{formatPrice(tx.payment)}</span>
                                      </div>
                                      <div className="d-flex justify-content-between fw-bold text-success" style={{ fontSize: '0.95rem' }}>
                                        <span>Uang Kembalian:</span>
                                        <span>{formatPrice(tx.change)}</span>
                                      </div>

                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-5 text-muted">
                      Tidak ada data transaksi yang cocok dengan filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer info */}
          <div className="d-flex justify-content-between align-items-center mt-3 text-muted" style={{ fontSize: '0.8rem' }}>
            <span>Menampilkan {filteredTxs.length} transaksi dari total {transactions.length}</span>
            <span>Mode: {isDbConnected ? 'Supabase Database' : 'Local Storage Cache'}</span>
          </div>

        </div>

      </main>
    </div>
  );
}
