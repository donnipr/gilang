'use client';

import { useEffect } from 'react';

export default function BootstrapClient() {
  useEffect(() => {
    // Import Bootstrap JS secara dinamis pada client-side saja
    // @ts-ignore
    import('bootstrap/dist/js/bootstrap.bundle.min.js')
      .then(() => {
        console.log('Bootstrap JS successfully loaded.');
      })
      .catch((err) => {
        console.error('Error loading Bootstrap JS:', err);
      });
  }, []);

  return null;
}
