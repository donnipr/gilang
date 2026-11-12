'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/utils/supabaseClient';

export interface PizzaItem {
  id: string;
  name: string;
  price: number;
  category: 'pizza' | 'sides' | 'beverage';
  image: string;
  description: string;
  stock?: number;
}

export interface CartItem {
  item: PizzaItem;
  quantity: number;
  notes?: string;
}

export interface Transaction {
  id: string; // Receipt Number (e.g. TX-20260528-0001)
  timestamp: string;
  cashier: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    notes?: string;
  }[];
  totalItems: number;
  subtotal: number;
  tax: number;
  serviceCharge: number;
  total: number;
  payment: number;
  change: number;
  paymentMethod?: 'tunai' | 'qris' | 'gofood' | 'grabfood';
  referenceId?: string;
  isSynced: boolean; // True if saved to Supabase, False if local storage fallback
}

export interface CheckoutOptions {
  paymentMethod?: 'tunai' | 'qris' | 'gofood' | 'grabfood';
  referenceId?: string;
}

interface CartContextType {
  cart: CartItem[];
  menuItems: PizzaItem[];
  isMenuLoading: boolean;
  transactions: Transaction[];
  addToCart: (item: PizzaItem) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateNotes: (productId: string, notes: string) => void;
  clearCart: () => void;
  checkout: (paymentAmount: number, cashierName: string, options?: CheckoutOptions) => Promise<Transaction | null>;
  isDbConnected: boolean;
  loadTransactions: () => Promise<void>;
  loadMenu: () => Promise<void>;
  addProduct: (product: PizzaItem) => Promise<boolean>;
  updateProduct: (product: PizzaItem) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<boolean>;
  resetMenuToDefault: () => Promise<boolean>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Default Menu statis untuk fallback offline / inisialisasi pertama kali
const DEFAULT_MENU: PizzaItem[] = [
  // --- PIZZAS ---
  { 
    id: 'pizza-super-king', 
    name: 'Pizza Super King', 
    price: 51000, 
    category: 'pizza', 
    image: '/images/margherita.png', 
    description: 'Topping: Smoked beef, nanas, daging sapi, daging ayam, sosis, jamur, mozzarella, bombay' 
  },
  { 
    id: 'pizza-super-queen', 
    name: 'Pizza Super Queen (Best Seller)', 
    price: 33000, 
    category: 'pizza', 
    image: '/images/pepperoni.png', 
    description: 'Topping: Daging sapi, daging ayam, sosis, burger beef, keju, jamur, mozzarella, bombay' 
  },
  { 
    id: 'pizza-daging-sapi', 
    name: 'Pizza Daging Sapi', 
    price: 32000, 
    category: 'pizza', 
    image: '/images/margherita.png', 
    description: 'Topping: Daging sapi, mozzarella, bombay' 
  },
  { 
    id: 'pizza-campur', 
    name: 'Pizza Campur (Best Seller)', 
    price: 30000, 
    category: 'pizza', 
    image: '/images/pepperoni.png', 
    description: 'Topping: Daging ayam, sosis, bakso, mozzarella, bombay' 
  },
  { 
    id: 'pizza-tuna', 
    name: 'Pizza Tuna', 
    price: 29000, 
    category: 'pizza', 
    image: '/images/margherita.png', 
    description: 'Topping: Ikan tuna, mozzarella, bombay' 
  },
  { 
    id: 'pizza-smoked-beef', 
    name: 'Pizza Smoked Beef', 
    price: 29000, 
    category: 'pizza', 
    image: '/images/pepperoni.png', 
    description: 'Topping: Smoked beef, mozzarella, bombay' 
  },
  { 
    id: 'pizza-oseng-ayam', 
    name: 'Pizza Oseng-Oseng Ayam', 
    price: 29000, 
    category: 'pizza', 
    image: '/images/margherita.png', 
    description: 'Topping: Oseng-oseng ayam, mozzarella, bombay' 
  },
  { 
    id: 'pizza-daging-ayam', 
    name: 'Pizza Daging Ayam', 
    price: 28000, 
    category: 'pizza', 
    image: '/images/margherita.png', 
    description: 'Topping: Daging ayam, mozzarella, bombay' 
  },
  { 
    id: 'pizza-keju', 
    name: 'Pizza Keju', 
    price: 28000, 
    category: 'pizza', 
    image: '/images/pepperoni.png', 
    description: 'Topping: Keju cheddar, mozzarella, bombay' 
  },
  { 
    id: 'pizza-jamur', 
    name: 'Pizza Jamur', 
    price: 28000, 
    category: 'pizza', 
    image: '/images/margherita.png', 
    description: 'Topping: Jamur, mozzarella, bombay' 
  },
  { 
    id: 'pizza-sosis', 
    name: 'Pizza Sosis', 
    price: 26000, 
    category: 'pizza', 
    image: '/images/pepperoni.png', 
    description: 'Topping: Sosis, mozzarella, bombay' 
  },
  { 
    id: 'pizza-burger-beef', 
    name: 'Pizza Burger Beef (Best Value)', 
    price: 25000, 
    category: 'pizza', 
    image: '/images/pepperoni.png', 
    description: 'Topping: Burger beef, mozzarella, bombay' 
  },

  // --- SIDES (EXTRA TOPPINGS) ---
  { 
    id: 'extra-mozzarella', 
    name: 'Extra Mozarella', 
    price: 5000, 
    category: 'sides', 
    image: '/images/garlic_bread.png', 
    description: 'Top-up Topping Extra Keju Mozzarella Premium' 
  },
  { 
    id: 'extra-keju', 
    name: 'Extra Keju', 
    price: 3000, 
    category: 'sides', 
    image: '/images/garlic_bread.png', 
    description: 'Top-up Topping Extra Keju Cheddar Gurih' 
  },
  { 
    id: 'extra-spicy', 
    name: 'Spicy', 
    price: 1000, 
    category: 'sides', 
    image: '/images/garlic_bread.png', 
    description: 'Top-up Tingkat Kepedasan Ekstra Cabai/Saus' 
  },
  { 
    id: 'extra-mayonnaise', 
    name: 'Extra Mayonaise', 
    price: 0, 
    category: 'sides', 
    image: '/images/garlic_bread.png', 
    description: 'Top-up Tambahan Saus Mayonaise Lembut (GRATIS)' 
  }
];

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [menuItems, setMenuItems] = useState<PizzaItem[]>([]);
  const [isMenuLoading, setIsMenuLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isDbConnected, setIsDbConnected] = useState(isSupabaseConfigured);

  // ---------- LOAD MENU DARI SUPABASE / LOCAL STORAGE ----------
  const loadMenu = useCallback(async () => {
    setIsMenuLoading(true);
    let loadedMenu: PizzaItem[] = [];
    let connected = false;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('category', { ascending: true })
          .order('name', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          loadedMenu = data.map((p: any) => ({
            id: p.id,
            name: p.name,
            price: Number(p.price),
            category: p.category as 'pizza' | 'sides' | 'beverage',
            image: p.image || '/images/placeholder.png',
            description: p.description || '',
            stock: p.stock !== undefined && p.stock !== null ? Number(p.stock) : p.stok !== undefined && p.stok !== null ? Number(p.stok) : undefined
          }));
          connected = true;
        } else {
          // Tabel ada tapi kosong di Supabase
          loadedMenu = [];
          connected = true;
        }
      } catch (err) {
        console.error('Gagal memuat menu dari Supabase, menggunakan Local Storage:', err);
        connected = false;
      }
    } else {
      connected = false;
    }

    // Fallback ke Local Storage jika tidak tersambung atau data kosong (opsional jika user ingin default menu)
    if (!connected) {
      const localMenu = localStorage.getItem('pizza_pos_local_products');
      if (localMenu) {
        try {
          loadedMenu = JSON.parse(localMenu);
        } catch (e) {
          console.error('Error parsing local products:', e);
        }
      }

      // Jika kosong atau berisi data default awal lama (4 item), otomatis isi dengan menu baru gilang
      if (loadedMenu.length === 0 || loadedMenu.length === 4) {
        loadedMenu = DEFAULT_MENU;
        localStorage.setItem('pizza_pos_local_products', JSON.stringify(DEFAULT_MENU));
      }
    }

    setMenuItems(loadedMenu);
    setIsDbConnected(connected);
    setIsMenuLoading(false);
  }, []);

  // ---------- LOAD TRANSAKSI ----------
  const loadTransactions = useCallback(async () => {
    let loadedTransactions: Transaction[] = [];

    // Coba load dari Supabase jika dikonfigurasi
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
          loadedTransactions = data.map((t: any) => ({
            id: t.receipt_no,
            timestamp: t.created_at,
            cashier: t.cashier,
            items: typeof t.items === 'string' ? JSON.parse(t.items) : t.items,
            totalItems: t.total_items,
            subtotal: Number(t.subtotal || 0),
            tax: Number(t.tax || 0),
            serviceCharge: Number(t.service_charge || 0),
            total: Number(t.total_amount || 0),
            payment: Number(t.amount_received ?? t.payment_amount ?? t.total_amount ?? 0),
            change: Number(t.change ?? t.change_amount ?? 0),
            paymentMethod: t.payment_method || 'tunai',
            referenceId: t.reference_id || '',
            isSynced: true
          }));
          setIsDbConnected(true);
        }
      } catch (err) {
        console.error('Gagal mengambil data dari Supabase, memuat dari Local Storage:', err);
        setIsDbConnected(false);
      }
    }

    // Jika gagal atau tidak menggunakan Supabase, ambil dari localStorage
    if (loadedTransactions.length === 0) {
      const localData = localStorage.getItem('pizza_pos_transactions');
      if (localData) {
        try {
          loadedTransactions = JSON.parse(localData);
        } catch (e) {
          console.error('Error parsing local transactions:', e);
        }
      }
    }

    setTransactions(loadedTransactions);
  }, []);

  // Load menu dan transaksi saat pertama kali mount
  useEffect(() => {
    loadMenu();
    loadTransactions();
  }, [loadMenu, loadTransactions]);

  // ---------- CRUD OPERATIONS (DAPAT DIPANGGIL DARI ADMIN PAGE) ----------
  
  const addProduct = async (product: PizzaItem): Promise<boolean> => {
    if (isDbConnected && supabase) {
      try {
        const { error } = await supabase.from('products').insert({
          id: product.id,
          name: product.name,
          price: product.price,
          category: product.category,
          image: product.image,
          description: product.description,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        if (error) throw error;
        await loadMenu();
        return true;
      } catch (err) {
        console.error('Gagal menambah produk ke Supabase:', err);
        alert(`Gagal menambah produk ke Supabase: ${(err as any).message}`);
        return false;
      }
    } else {
      // Local Storage Fallback
      const updatedMenu = [...menuItems, product];
      setMenuItems(updatedMenu);
      localStorage.setItem('pizza_pos_local_products', JSON.stringify(updatedMenu));
      return true;
    }
  };

  const resetMenuToDefault = async (): Promise<boolean> => {
    setIsMenuLoading(true);
    let success = true;

    if (isSupabaseConfigured && supabase) {
      try {
        // Coba delete all products di Supabase
        const { error: deleteError } = await supabase.from('products').delete().neq('id', 'dummy-unmatched-id');
        if (deleteError) throw deleteError;

        // Insert new ones in a single batch
        const insertData = DEFAULT_MENU.map(product => ({
          id: product.id,
          name: product.name,
          price: product.price,
          category: product.category,
          image: product.image,
          description: product.description,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

        const { error: insertError } = await supabase.from('products').insert(insertData);
        if (insertError) throw insertError;

        await loadMenu();
      } catch (err) {
        console.error('Gagal reset menu di Supabase:', err);
        success = false;
      }
    }

    // Selalu reset Local Storage sebagai cadangan
    localStorage.setItem('pizza_pos_local_products', JSON.stringify(DEFAULT_MENU));
    
    if (!isDbConnected) {
      setMenuItems(DEFAULT_MENU);
    } else if (!success) {
      alert('Gagal menyinkronkan reset ke Supabase. Tetapi Local Storage berhasil di-reset.');
    } else {
      await loadMenu();
    }

    setIsMenuLoading(false);
    return success;
  };

  const updateProduct = async (product: PizzaItem): Promise<boolean> => {
    if (isDbConnected && supabase) {
      try {
        const { error } = await supabase
          .from('products')
          .update({
            name: product.name,
            price: product.price,
            category: product.category,
            image: product.image,
            description: product.description,
            updated_at: new Date().toISOString()
          })
          .eq('id', product.id);
        if (error) throw error;
        await loadMenu();
        return true;
      } catch (err) {
        console.error('Gagal mengupdate produk di Supabase:', err);
        alert(`Gagal mengupdate produk di Supabase: ${(err as any).message}`);
        return false;
      }
    } else {
      // Local Storage Fallback
      const updatedMenu = menuItems.map((p) => p.id === product.id ? product : p);
      setMenuItems(updatedMenu);
      localStorage.setItem('pizza_pos_local_products', JSON.stringify(updatedMenu));
      return true;
    }
  };

  const deleteProduct = async (id: string): Promise<boolean> => {
    if (isDbConnected && supabase) {
      try {
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', id);
        if (error) throw error;
        await loadMenu();
        return true;
      } catch (err) {
        console.error('Gagal menghapus produk dari Supabase:', err);
        alert(`Gagal menghapus produk dari Supabase: ${(err as any).message}`);
        return false;
      }
    } else {
      // Local Storage Fallback
      const updatedMenu = menuItems.filter((p) => p.id !== id);
      setMenuItems(updatedMenu);
      localStorage.setItem('pizza_pos_local_products', JSON.stringify(updatedMenu));
      return true;
    }
  };

  // ---------- CART OPERATIONS ----------
  const addToCart = (item: PizzaItem) => {
    setCart((prevCart) => {
      const existing = prevCart.find((i) => i.item.id === item.id);
      if (existing) {
        return prevCart.map((i) =>
          i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prevCart, { item, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prevCart) => {
      const existing = prevCart.find((i) => i.item.id === productId);
      if (existing && existing.quantity > 1) {
        return prevCart.map((i) =>
          i.item.id === productId ? { ...i, quantity: i.quantity - 1 } : i
        );
      }
      return prevCart.filter((i) => i.item.id !== productId);
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prevCart) => prevCart.filter((i) => i.item.id !== productId));
      return;
    }
    setCart((prevCart) =>
      prevCart.map((i) => (i.item.id === productId ? { ...i, quantity } : i))
    );
  };

  const updateNotes = (productId: string, notes: string) => {
    setCart((prevCart) =>
      prevCart.map((i) => (i.item.id === productId ? { ...i, notes } : i))
    );
  };

  const clearCart = () => setCart([]);

  // ---------- CHECKOUT – SIMPAN KE SUPABASE ----------
  const checkout = async (
    paymentAmount: number,
    cashierName: string,
    options?: CheckoutOptions
  ): Promise<Transaction | null> => {
    if (cart.length === 0) return null;

    const paymentMethod = options?.paymentMethod || 'tunai';
    const referenceId = options?.referenceId || null;

    const subtotal = cart.reduce((acc, curr) => acc + curr.item.price * curr.quantity, 0);
    const tax = Math.round(subtotal * 0.1); // Pajak 10%
    const serviceCharge = Math.round(subtotal * 0.05); // Biaya Layanan 5%
    const total = subtotal + tax + serviceCharge;

    const effectivePayment = paymentMethod === 'tunai' ? paymentAmount : total;
    const change = paymentMethod === 'tunai' ? (paymentAmount - total) : 0;

    if (paymentMethod === 'tunai' && change < 0) {
      alert('Nominal pembayaran kurang!');
      return null;
    }

    // Generate Nomor Struk: TX-YYYYMMDD-XXXX (4 digit random)
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randId = Math.floor(1000 + Math.random() * 9000);
    const receiptNo = `TX-${dateStr}-${randId}`;
    const timestamp = new Date().toISOString();

    const formattedItems = cart.map((c) => ({
      productId: c.item.id,
      productName: c.item.name,
      quantity: c.quantity,
      price: c.item.price,
      notes: c.notes || ''
    }));

    const totalItems = cart.reduce((acc, curr) => acc + curr.quantity, 0);

    const newTx: Transaction = {
      id: receiptNo,
      timestamp,
      cashier: cashierName || 'Kasir Default',
      items: formattedItems,
      totalItems,
      subtotal,
      tax,
      serviceCharge,
      total,
      payment: effectivePayment,
      change,
      paymentMethod,
      referenceId: referenceId || undefined,
      isSynced: false
    };

    // Coba simpan ke Supabase jika dikonfigurasi
    if (isSupabaseConfigured && supabase) {
      try {
        // 1) Simpan header transaksi dengan payload lengkap
        const fullPayload = {
          receipt_no: receiptNo,
          cashier: newTx.cashier,
          total_items: totalItems,
          subtotal,
          tax,
          service_charge: serviceCharge,
          total_amount: total,
          payment_method: paymentMethod,
          amount_received: paymentMethod === 'tunai' ? paymentAmount : null,
          change: paymentMethod === 'tunai' ? change : null,
          reference_id: referenceId,
          payment_amount: effectivePayment,
          change_amount: change,
          items: formattedItems,
          created_at: timestamp
        };

        let { error: txError } = await supabase.from('transactions').insert(fullPayload);

        // Fallback retry jika tabel hanya berisi kolom esensial spesifikasi
        if (txError) {
          console.warn('Gagal insert data lengkap ke tabel transactions, mencoba insert kolom inti:', txError.message);
          const minimalPayload = {
            total_amount: total,
            payment_method: paymentMethod,
            amount_received: paymentMethod === 'tunai' ? paymentAmount : null,
            change: paymentMethod === 'tunai' ? change : null,
            reference_id: referenceId
          };
          const retryRes = await supabase.from('transactions').insert([minimalPayload]);
          txError = retryRes.error;
        }

        if (txError) throw txError;

        // 2) Simpan detail transaksi (per‑item) jika ada tabel transaction_details
        const detailRows = formattedItems.map((fi) => ({
          receipt_no: receiptNo,
          product_id: fi.productId,
          product_name: fi.productName,
          quantity: fi.quantity,
          price: fi.price
        }));

        const { error: detailError } = await supabase
          .from('transaction_details')
          .insert(detailRows);

        if (detailError) {
          console.warn('Detail transaksi gagal disimpan (opsional):', detailError.message);
        }

        newTx.isSynced = true;
        setIsDbConnected(true);
      } catch (err) {
        console.error('Gagal menyimpan transaksi ke Supabase, menyimpan secara lokal:', err);
        setIsDbConnected(false);
      }
    }

    // Selalu simpan ke local state dan localStorage (sebagai backup & untuk fallback)
    const updatedTxs = [newTx, ...transactions];
    setTransactions(updatedTxs);
    localStorage.setItem('pizza_pos_transactions', JSON.stringify(updatedTxs));

    // Bersihkan keranjang setelah checkout sukses
    clearCart();

    return newTx;
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        menuItems,
        isMenuLoading,
        transactions,
        addToCart,
        removeFromCart,
        updateQuantity,
        updateNotes,
        clearCart,
        checkout,
        isDbConnected,
        loadTransactions,
        loadMenu,
        addProduct,
        updateProduct,
        deleteProduct,
        resetMenuToDefault
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
