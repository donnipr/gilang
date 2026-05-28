'use client';

import React from 'react';
import { Transaction } from '@/context/CartContext';

interface ReceiptModalProps {
  isOpen: boolean;
  transaction: Transaction | null;
  onClose: () => void;
}

export default function ReceiptModal({ isOpen, transaction, onClose }: ReceiptModalProps) {
  if (!isOpen || !transaction) return null;

  const handlePrint = () => {
    window.print();
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
      {/* Modal Backdrop (visible on screen, hidden on print) */}
      <div className="modal fade show d-block no-print" tabIndex={-1} style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}>
        <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '420px' }}>
          <div className="modal-content bg-pizza-card border border-pizza text-white">
            <div className="modal-header border-bottom border-pizza">
              <h5 className="modal-title fw-bold text-orange">
                <i className="bi bi-receipt me-2"></i>Transaksi Berhasil
              </h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            
            <div className="modal-body p-4" style={{ fontFamily: 'monospace' }}>
              {/* Receipt Template (Screen View) */}
              <div className="bg-white text-dark p-3 rounded shadow-sm border" id="printable-receipt">
                <div className="text-center mb-3">
                  <h4 className="fw-bold m-0" style={{ letterSpacing: '2px' }}>GILANG PIZZA</h4>
                  <small className="text-muted">Jl. Pizza Raya No. 42, Jakarta</small>
                  <br />
                  <small className="text-muted">Telp: (021) 555-1234</small>
                  <div className="border-bottom border-dark border-dashed my-2"></div>
                </div>

                <div className="small mb-3">
                  <div className="d-flex justify-content-between">
                    <span>No. Struk:</span>
                    <span className="fw-bold">{transaction.id}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span>Waktu:</span>
                    <span>{new Date(transaction.timestamp).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span>Kasir:</span>
                    <span>{transaction.cashier}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span>Metode:</span>
                    <span>Tunai (Cash)</span>
                  </div>
                </div>

                <div className="border-bottom border-dark border-dashed mb-2"></div>

                {/* Items */}
                <div className="small mb-3">
                  {transaction.items.map((item, idx) => (
                    <div key={idx} className="mb-2">
                      <div className="d-flex justify-content-between">
                        <span className="fw-bold">{item.productName}</span>
                        <span>{formatPrice(item.price * item.quantity)}</span>
                      </div>
                      <div className="text-muted ps-2">
                        {item.quantity} x {formatPrice(item.price)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-bottom border-dark border-dashed mb-2"></div>

                {/* Totals */}
                <div className="small mb-2">
                  <div className="d-flex justify-content-between">
                    <span>Subtotal:</span>
                    <span>{formatPrice(transaction.subtotal)}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span>Pajak (10%):</span>
                    <span>{formatPrice(transaction.tax)}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span>Biaya Layanan (5%):</span>
                    <span>{formatPrice(transaction.serviceCharge)}</span>
                  </div>
                  <div className="d-flex justify-content-between fw-bold fs-6 mt-1">
                    <span>Total Belanja:</span>
                    <span>{formatPrice(transaction.total)}</span>
                  </div>
                </div>

                <div className="border-bottom border-dark border-dashed mb-2"></div>

                <div className="small">
                  <div className="d-flex justify-content-between text-success fw-bold">
                    <span>Bayar:</span>
                    <span>{formatPrice(transaction.payment)}</span>
                  </div>
                  <div className="d-flex justify-content-between text-danger fw-bold">
                    <span>Kembalian:</span>
                    <span>{formatPrice(transaction.change)}</span>
                  </div>
                </div>

                <div className="border-bottom border-dark border-dashed my-2"></div>

                <div className="text-center mt-3 small text-muted">
                  <p className="m-0">Terima kasih atas kunjungan Anda!</p>
                  <p className="m-0">Silakan datang kembali.</p>
                </div>
              </div>
            </div>

            <div className="modal-footer border-top border-pizza gap-2">
              <button type="button" className="btn btn-outline-secondary border-pizza flex-grow-1" onClick={onClose}>
                <i className="bi bi-x-circle me-2"></i>Tutup
              </button>
              <button type="button" className="btn btn-pizza-primary flex-grow-1" onClick={handlePrint}>
                <i className="bi bi-printer me-2"></i>Cetak Struk
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Screen Backdrop overlay */}
      <div className="modal-backdrop fade show no-print" style={{ zIndex: 1040 }}></div>

      {/* Print Only Layout (Isolated clean styling for actual physical printing) */}
      <div className="d-none d-print-block" id="printable-receipt-modal" style={{ width: '80mm', padding: '5mm', fontFamily: 'monospace', fontSize: '12px', color: 'black', background: 'white' }}>
        <div style={{ textAlign: 'center', marginBottom: '10px' }}>
          <h3 style={{ margin: 0, fontWeight: 'bold', letterSpacing: '1px' }}>GILANG PIZZA</h3>
          <span style={{ fontSize: '10px' }}>Jl. Pizza Raya No. 42, Jakarta</span><br />
          <span style={{ fontSize: '10px' }}>Telp: (021) 555-1234</span>
          <div style={{ borderBottom: '1px dashed black', margin: '8px 0' }}></div>
        </div>

        <div style={{ fontSize: '10px', marginBottom: '10px' }}>
          <div>No. Struk: {transaction.id}</div>
          <div>Waktu: {new Date(transaction.timestamp).toLocaleString('id-ID')}</div>
          <div>Kasir: {transaction.cashier}</div>
          <div>Metode: Tunai (Cash)</div>
        </div>

        <div style={{ borderBottom: '1px dashed black', margin: '8px 0' }}></div>

        <div style={{ marginBottom: '10px' }}>
          {transaction.items.map((item, idx) => (
            <div key={idx} style={{ marginBottom: '5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 'bold' }}>{item.productName}</span>
                <span>{formatPrice(item.price * item.quantity)}</span>
              </div>
              <div style={{ fontSize: '10px', paddingLeft: '5px', color: '#555' }}>
                {item.quantity} x {formatPrice(item.price)}
              </div>
            </div>
          ))}
        </div>

        <div style={{ borderBottom: '1px dashed black', margin: '8px 0' }}></div>

        <div style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Subtotal:</span>
            <span>{formatPrice(transaction.subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Pajak (10%):</span>
            <span>{formatPrice(transaction.tax)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Biaya Layanan (5%):</span>
            <span>{formatPrice(transaction.serviceCharge)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px', marginTop: '5px' }}>
            <span>TOTAL:</span>
            <span>{formatPrice(transaction.total)}</span>
          </div>
        </div>

        <div style={{ borderBottom: '1px dashed black', margin: '8px 0' }}></div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
            <span>BAYAR:</span>
            <span>{formatPrice(transaction.payment)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
            <span>KEMBALIAN:</span>
            <span>{formatPrice(transaction.change)}</span>
          </div>
        </div>

        <div style={{ borderBottom: '1px dashed black', margin: '8px 0' }}></div>

        <div style={{ textAlign: 'center', marginTop: '15px', fontSize: '10px' }}>
          <p style={{ margin: 0 }}>Terima kasih atas kunjungan Anda!</p>
          <p style={{ margin: 0 }}>Silakan datang kembali.</p>
        </div>
      </div>
    </>
  );
}
