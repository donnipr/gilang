import type { Metadata } from "next";
import "./globals.css";

// Import Bootstrap 5 & Icons
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

import BootstrapClient from "@/components/BootstrapClient";
import { CartProvider } from "@/context/CartContext";

export const metadata: Metadata = {
  title: "Gilang Pizza POS - Sistem Kasir Modern",
  description: "Aplikasi Kasir Point of Sale Outlet Pizza Terintegrasi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>
        <CartProvider>
          {/* Bootstrap JavaScript Client-side Bundle Loader */}
          <BootstrapClient />
          {children}
        </CartProvider>
      </body>
    </html>
  );
}
