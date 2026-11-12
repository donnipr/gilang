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
        className="d-flex d-md-none align-items-center justify-content-between p-3 border-bottom border-slate-800 w-100 sticky-top shadow-sm bg-slate-900 text-slate-50" 
        style={{ 
          height: '70px', 
          zIndex: 1030
        }}
      >
        <div className="d-flex align-items-center gap-2">
          <button 
            className="btn text-slate-50 p-0 border-0 fs-3 d-flex align-items-center"
            onClick={() => setIsOpen(true)}
            aria-label="Toggle Navigation"
          >
            <i className="bi bi-list"></i>
          </button>
          <div className="d-flex align-items-center gap-2">
            <div className="bg-yellow-400 text-slate-900 font-bold d-flex align-items-center justify-content-center rounded-circle" style={{ width: '36px', height: '36px' }}>
              <i className="bi bi-pie-chart-fill fs-5 text-slate-900"></i>
            </div>
            <span className="fw-bold text-slate-50 tracking-wide" style={{ fontSize: '1rem' }}>GILANG PIZZA</span>
          </div>
        </div>

        {/* Database Status Indicator on Mobile */}
        <div className="d-flex align-items-center gap-2 bg-slate-800 px-2.5 py-1 rounded border border-slate-700" style={{ fontSize: '0.75rem' }}>
          <span className={`d-inline-block rounded-circle ${isDbConnected ? 'bg-success' : 'bg-yellow-400'}`} style={{ width: '8px', height: '8px' }}></span>
          <span className="fw-medium text-slate-50">{isDbConnected ? 'Supabase' : 'Offline'}</span>
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

      {/* Sidebar Content (Sticky on Desktop, Offcanvas Drawer on Mobile) - Contemporary Editorial Dark Slate */}
      <aside 
        className={`d-flex flex-column flex-shrink-0 p-3 bg-slate-900 text-slate-50 border-end border-slate-800 sidebar-editorial sidebar-responsive ${
          isOpen ? 'show' : ''
        }`}
      >
        {/* Mobile Sidebar Close Button & Header (Visible only on Mobile) */}
        <div className="d-flex d-md-none align-items-center justify-content-between mb-4 pb-2 border-bottom border-slate-800">
          <div className="d-flex align-items-center gap-2">
            <div className="bg-yellow-400 text-slate-900 font-bold d-flex align-items-center justify-content-center rounded-circle" style={{ width: '32px', height: '32px' }}>
              <i className="bi bi-pie-chart-fill fs-6 text-slate-900"></i>
            </div>
            <span className="fw-bold text-slate-50" style={{ fontSize: '0.95rem' }}>GILANG PIZZA POS</span>
          </div>
          <button 
            className="btn-close btn-close-white" 
            onClick={() => setIsOpen(false)}
            aria-label="Close"
          ></button>
        </div>

        {/* Brand Logo (Desktop only) */}
        <div className="d-none d-md-block">
          <Link href="/" className="d-flex align-items-center mb-4 me-md-auto text-decoration-none text-slate-50 gap-2.5">
            <div className="bg-yellow-400 text-slate-900 font-bold d-flex align-items-center justify-content-center rounded-circle shadow-sm" style={{ width: '44px', height: '44px' }}>
              <i className="bi bi-pie-chart-fill fs-4 text-slate-900"></i>
            </div>
            <div>
              <span className="fs-5 fw-bold text-slate-50 tracking-wide d-block">GILANG PIZZA</span>
              <span className="text-yellow-400 fw-semibold d-block" style={{ fontSize: '0.75rem', marginTop: '-2px' }}>POS SYSTEM v1.0</span>
            </div>
          </Link>
          <hr className="border-slate-800 opacity-100 my-3" />
        </div>
        
        {/* Navigation List */}
        <ul className="nav nav-pills flex-column mb-auto gap-2">
          <li className="nav-item">
            <Link 
              href="/" 
              className={`nav-link sidebar-link d-flex align-items-center gap-3 ${
                pathname === '/'
                  ? 'active bg-slate-800 border-l-4 border-yellow-400 text-slate-50'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-slate-50'
              }`}
              onClick={() => setIsOpen(false)}
            >
              <i className={`bi bi-cash-register fs-5 ${pathname === '/' ? 'text-yellow-400' : 'text-slate-400'}`}></i>
              <span className="fw-medium">Kasir (POS)</span>
            </Link>
          </li>
          <li>
            <Link 
              href="/admin/dashboard" 
              className={`nav-link sidebar-link d-flex align-items-center gap-3 ${
                pathname === '/admin/dashboard'
                  ? 'active bg-slate-800 border-l-4 border-yellow-400 text-slate-50'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-slate-50'
              }`}
              onClick={() => setIsOpen(false)}
            >
              <i className={`bi bi-graph-up-arrow fs-5 ${pathname === '/admin/dashboard' ? 'text-yellow-400' : 'text-slate-400'}`}></i>
              <span className="fw-medium">Dashboard Admin</span>
            </Link>
          </li>
          <li>
            <Link 
              href="/admin/products" 
              className={`nav-link sidebar-link d-flex align-items-center gap-3 ${
                pathname === '/admin/products'
                  ? 'active bg-slate-800 border-l-4 border-yellow-400 text-slate-50'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-slate-50'
              }`}
              onClick={() => setIsOpen(false)}
            >
              <i className={`bi bi-egg-fried fs-5 ${pathname === '/admin/products' ? 'text-yellow-400' : 'text-slate-400'}`}></i>
              <span className="fw-medium">Kelola Produk</span>
            </Link>
          </li>
          <li>
            <Link 
              href="/inventory" 
              className={`nav-link sidebar-link d-flex align-items-center gap-3 ${
                pathname === '/inventory' || pathname === '/stok'
                  ? 'active bg-slate-800 border-l-4 border-yellow-400 text-slate-50'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-slate-50'
              }`}
              onClick={() => setIsOpen(false)}
            >
              {/* Lucide Box / Package Icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={pathname === '/inventory' || pathname === '/stok' ? 'text-yellow-400' : 'text-slate-400'}
              >
                <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                <path d="m3.3 7 8.7 5 8.7-5" />
                <path d="M12 22V12" />
              </svg>
              <span className="fw-medium">Manajemen Stok</span>
            </Link>
          </li>
        </ul>

        <hr className="border-slate-800 opacity-100 my-3" />

        {/* Database Sync Status & Cashier Info */}
        <div className="p-3 rounded-xl bg-slate-800 border border-slate-700">
          <div className="d-flex align-items-center gap-2 mb-2.5">
            <span className={`d-inline-block rounded-circle ${isDbConnected ? 'bg-success' : 'bg-yellow-400'}`} style={{ width: '9px', height: '9px' }}></span>
            <span className="text-slate-50 fw-medium" style={{ fontSize: '0.78rem' }}>
              {isDbConnected ? 'Supabase Connected' : 'Local Storage Mode'}
            </span>
          </div>
          <div className="d-flex align-items-center gap-2.5">
            <div className="bg-yellow-400 rounded-circle text-slate-900 d-flex align-items-center justify-content-center font-bold" style={{ width: '34px', height: '34px', fontSize: '0.9rem' }}>
              G
            </div>
            <div className="overflow-hidden">
              <span className="text-slate-50 font-bold d-block text-truncate" style={{ fontSize: '0.85rem' }}>Gilang</span>
              <span className="text-slate-400 d-block text-truncate" style={{ fontSize: '0.75rem' }}>Kasir Utama</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
