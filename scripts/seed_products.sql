-- ============================================================
-- SEED DATA: Masukkan data produk ke tabel products
-- Jalankan query ini di Supabase SQL Editor setelah tabel dibuat
-- ============================================================

INSERT INTO public.products (id, name, price, category, image, description) VALUES
  ('margherita',    'Margherita Pizza',     65000, 'pizza',    '/images/margherita.png',    'Klasik saus tomat, keju mozzarella premium, dan daun basil segar.'),
  ('pepperoni',     'Pepperoni Pizza',      78000, 'pizza',    '/images/pepperoni.png',     'Saus tomat gurih, keju mozzarella, dan irisan daging pepperoni sapi melimpah.'),
  ('meat-lovers',   'Meat Lovers Pizza',    85000, 'pizza',    '/images/pepperoni.png',     'Kombinasi sosis sapi, pepperoni, daging cincang, dan smoked beef.'),
  ('bbq-chicken',   'BBQ Chicken Pizza',    80000, 'pizza',    '/images/pepperoni.png',     'Ayam panggang bumbu BBQ manis gurih, bawang bombay, dan keju cheddar.'),
  ('veggie-garden', 'Veggie Garden Pizza',  70000, 'pizza',    '/images/margherita.png',    'Paprika hijau & merah, jamur kancing, jagung manis, bawang bombay, dan buah zaitun.'),
  ('hawaiian',      'Hawaiian Classic',     75000, 'pizza',    '/images/margherita.png',    'Sajian manis asam buah nanas segar dikombinasikan dengan potongan smoked beef.'),
  ('garlic-bread',  'Garlic Bread',         25000, 'sides',    '/images/garlic_bread.png',  'Roti panggang mentega bawang putih harum dengan taburan parsley.'),
  ('french-fries',  'French Fries',         22000, 'sides',    '/images/garlic_bread.png',  'Kentang goreng renyah yang ditaburi garam laut berkualitas.'),
  ('lemon-tea',     'Iced Lemon Tea',       15000, 'beverage', '/images/lemon_tea.png',     'Teh lemon dingin segar pelepas dahaga.'),
  ('coca-cola',     'Coca Cola',            12000, 'beverage', '/images/lemon_tea.png',     'Minuman bersoda dingin menyegarkan.')
ON CONFLICT (id) DO UPDATE SET
  name        = EXCLUDED.name,
  price       = EXCLUDED.price,
  category    = EXCLUDED.category,
  image       = EXCLUDED.image,
  description = EXCLUDED.description,
  updated_at  = now();
