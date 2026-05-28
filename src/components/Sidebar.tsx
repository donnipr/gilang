'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/context/CartContext';

export default function Sidebar() {
  const pathname = usePathname();
  const { isDbConnected } = useCart();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile Top Header (Visible only on screens < 768px) */}
      <header 
        className="d-flex d-md-none align-items-center justify-content-between p-3 border-bottom border-pizza w-100 sticky-top shadow-sm" 
        style={{ 
          height: '70px', 
          zIndex: 1030, 
          backgroundColor: '#D91B24',
          color: '#ffffff'
        }}
      >
        <div className="d-flex align-items-center gap-2">
          <button 
            className="btn text-white p-0 border-0 fs-3 d-flex align-items-center"
            onClick={() => setIsOpen(true)}
            aria-label="Toggle Navigation"
          >
            <i className="bi bi-list"></i>
          </button>
          <div className="d-flex align-items-center gap-2">
            <div className="bg-pizza-primary d-flex align-items-center justify-content-center rounded-circle" style={{ width: '36px', height: '36px', boxShadow: '0 2px 6px rgba(13, 148, 136, 0.4)' }}>
              <i className="bi bi-pie-chart-fill fs-5 text-white"></i>
            </div>
            <span className="fw-bold tracking-wide" style={{ fontSize: '1rem' }}>GILANG PIZZA</span>
          </div>
        </div>

        {/* Database Status Indicator on Mobile */}
        <div className="d-flex align-items-center gap-2 bg-dark bg-opacity-25 px-2 py-1 rounded" style={{ fontSize: '0.75rem', border: '1px solid rgba(255,255,255,0.1)' }}>
          <span className={`d-inline-block rounded-circle ${isDbConnected ? 'bg-success' : 'bg-warning'}`} style={{ width: '8px', height: '8px', boxShadow: isDbConnected ? '0 0 6px #198754' : '0 0 6px #ffc107' }}></span>
          <span className="fw-medium">{isDbConnected ? 'Supabase' : 'Offline'}</span>
        </div>
      </header>

      {/* Sidebar Overlay for Mobile (Click to close) */}
      {isOpen && (
        <div 
          className="d-md-none position-fixed top-0 start-0 w-100 h-100" 
          style={{ 
            backgroundColor: 'rgba(15, 23, 42, 0.6)', 
            zIndex: 1040, 
            backdropFilter: 'blur(4px)',
            transition: 'all 0.3s ease'
          }}
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Content (Sticky on Desktop, Offcanvas Drawer on Mobile) */}
      <aside 
        className={`d-flex flex-column flex-shrink-0 p-3 bg-pizza-card border-end border-pizza sidebar-responsive ${
          isOpen ? 'show' : ''
        }`}
      >
        {/* Mobile Sidebar Close Button & Header (Visible only on Mobile) */}
        <div className="d-flex d-md-none align-items-center justify-content-between mb-4 pb-2 border-bottom border-white border-opacity-10">
          <div className="d-flex align-items-center gap-2">
            <div className="bg-pizza-primary d-flex align-items-center justify-content-center rounded-circle" style={{ width: '32px', height: '32px' }}>
              <i className="bi bi-pie-chart-fill fs-6 text-white"></i>
            </div>
            <span className="fw-bold text-white" style={{ fontSize: '0.95rem' }}>GILANG PIZZA POS</span>
          </div>
          <button 
            className="btn-close btn-close-white" 
            onClick={() => setIsOpen(false)}
            aria-label="Close"
          ></button>
        </div>

        {/* Brand Logo (Desktop only) */}
        <div className="d-none d-md-block">
          <Link href="/" className="d-flex align-items-center mb-4 me-md-auto text-decoration-none text-white gap-2">
            <div className="bg-pizza-primary d-flex align-items-center justify-content-center rounded-circle" style={{ width: '45px', height: '45px', boxShadow: '0 4px 10px rgba(255, 94, 54, 0.4)' }}>
              <i className="bi bi-pie-chart-fill fs-4 text-white"></i>
            </div>
            <div>
              <span className="fs-5 fw-bold text-white tracking-wide d-block">GILANG PIZZA</span>
              <span className="text-orange fw-semibold d-block" style={{ fontSize: '0.75rem', marginTop: '-3px' }}>POS SYSTEM v1.0</span>
            </div>
          </Link>
          <hr className="bg-secondary opacity-25" />
        </div>
        
        {/* Navigation List */}
        <ul className="nav nav-pills flex-column mb-auto gap-2">
          <li className="nav-item">
            <Link 
              href="/" 
              className={`nav-link sidebar-link d-flex align-items-center gap-3 ${pathname === '/' ? 'active' : ''}`}
              onClick={() => setIsOpen(false)}
            >
              <i className="bi bi-cash-register fs-5"></i>
              <span className="fw-medium">Kasir (POS)</span>
            </Link>
          </li>
          <li>
            <Link 
              href="/admin/dashboard" 
              className={`nav-link sidebar-link d-flex align-items-center gap-3 ${pathname === '/admin/dashboard' ? 'active' : ''}`}
              onClick={() => setIsOpen(false)}
            >
              <i className="bi bi-graph-up-arrow fs-5"></i>
              <span className="fw-medium">Dashboard Admin</span>
            </Link>
          </li>
          <li>
            <Link 
              href="/admin/products" 
              className={`nav-link sidebar-link d-flex align-items-center gap-3 ${pathname === '/admin/products' ? 'active' : ''}`}
              onClick={() => setIsOpen(false)}
            >
              <i className="bi bi-egg-fried fs-5"></i>
              <span className="fw-medium">Kelola Produk</span>
            </Link>
          </li>
        </ul>

        <hr className="bg-secondary opacity-25" />

        {/* Database Sync Status & Cashier Info */}
        <div className="p-2 rounded bg-dark bg-opacity-50 border border-pizza">
          <div className="d-flex align-items-center gap-2 mb-2">
            <span className={`d-inline-block rounded-circle ${isDbConnected ? 'bg-success' : 'bg-warning'}`} style={{ width: '10px', height: '10px', boxShadow: isDbConnected ? '0 0 8px #198754' : '0 0 8px #ffc107' }}></span>
            <span className="text-white fw-medium" style={{ fontSize: '0.8rem' }}>
              {isDbConnected ? 'Supabase Connected' : 'Local Storage Mode'}
            </span>
          </div>
          <div className="d-flex align-items-center gap-2">
            <div className="bg-secondary rounded-circle text-white d-flex align-items-center justify-content-center fw-bold" style={{ width: '32px', height: '32px', fontSize: '0.9rem' }}>
              G
            </div>
            <div className="overflow-hidden">
              <span className="text-white fw-bold d-block text-truncate" style={{ fontSize: '0.85rem' }}>Gilang</span>
              <span className="text-muted d-block text-truncate" style={{ fontSize: '0.75rem' }}>Kasir Utama</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
