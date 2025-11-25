-- Insert test data
-- Test company
INSERT INTO public.companies (id, name, plan, settings) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'Todo Empieza Demo', 'premium', '{"tax_rate": 16, "currency": "USD"}');

-- Test user
INSERT INTO public.users (id, company_id, name, email, role, active) VALUES 
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Admin Usuario', 'admin@todoempieza.com', 'admin', true),
('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'Cajero Principal', 'cajero@todoempieza.com', 'cashier', true);

-- Test stores
INSERT INTO public.stores (id, company_id, name, address, phone) VALUES 
('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440000', 'Tienda Principal', 'Av. Bolívar, Caracas', '+58-212-555-0001'),
('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440000', 'Sucursal Centro', 'Centro Caracas', '+58-212-555-0002');

-- Test customers
INSERT INTO public.customers (id, company_id, name, email, phone, address, id_number) VALUES 
('550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440000', 'María González', 'maria@email.com', '+58-412-555-0001', 'Caracas', 'V-12345678'),
('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440000', 'José Rodríguez', 'jose@email.com', '+58-414-555-0002', 'Maracay', 'V-87654321'),
('550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440000', 'Cliente General', null, null, null, null);

-- Test products with barcodes
INSERT INTO public.products (id, company_id, sku, barcode, name, category, price_usd, tax_rate) VALUES 
('550e8400-e29b-41d4-a716-446655440030', '550e8400-e29b-41d4-a716-446655440000', 'CC600', '7750894000013', 'Coca Cola 600ml', 'Bebidas', 1.50, 16.00),
('550e8400-e29b-41d4-a716-446655440031', '550e8400-e29b-41d4-a716-446655440000', 'PT001', '7750123456789', 'Pan Tostado', 'Panadería', 4.00, 16.00),
('550e8400-e29b-41d4-a716-446655440032', '550e8400-e29b-41d4-a716-446655440000', 'LE1000', '7754321098765', 'Leche Entera 1L', 'Lácteos', 3.00, 16.00),
('550e8400-e29b-41d4-a716-446655440033', '550e8400-e29b-41d4-a716-446655440000', 'CI200', '7751111222333', 'Café Instantáneo', 'Bebidas', 6.00, 16.00),
('550e8400-e29b-41d4-a716-446655440034', '550e8400-e29b-41d4-a716-446655440000', 'AV1000', '7756666777888', 'Aceite Vegetal 1L', 'Aceites', 5.00, 16.00),
('550e8400-e29b-41d4-a716-446655440035', '550e8400-e29b-41d4-a716-446655440000', 'AR500', '7759999000111', 'Arroz 500g', 'Granos', 2.50, 16.00),
('550e8400-e29b-41d4-a716-446655440036', '550e8400-e29b-41d4-a716-446655440000', 'PAS500', '7752222333444', 'Pasta 500g', 'Pasta', 1.80, 16.00),
('550e8400-e29b-41d4-a716-446655440037', '550e8400-e29b-41d4-a716-446655440000', 'AT200', '7753333444555', 'Atún en Lata 200g', 'Enlatados', 3.50, 16.00);

-- Test inventories
INSERT INTO public.inventories (company_id, store_id, product_id, qty, min_qty) VALUES 
('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440030', 50, 10),
('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440031', 25, 5),
('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440032', 30, 8),
('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440033', 15, 3),
('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440034', 20, 5),
('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440035', 40, 10),
('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440036', 35, 8),
('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440037', 12, 5);

-- Insert current BCV rate
INSERT INTO public.bcv_rates (rate) VALUES (41.73);

-- Test sales data
INSERT INTO public.sales (id, company_id, store_id, customer_id, cashier_id, total_usd, total_bs, bcv_rate_used, payment_method, status) VALUES 
('550e8400-e29b-41d4-a716-446655440040', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440002', 8.50, 354.21, 41.73, 'cash', 'completed'),
('550e8400-e29b-41d4-a716-446655440041', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440002', 12.30, 513.02, 41.73, 'card', 'completed');

-- Test sale items
INSERT INTO public.sale_items (sale_id, product_id, qty, price_usd, discount_usd, subtotal_usd) VALUES 
('550e8400-e29b-41d4-a716-446655440040', '550e8400-e29b-41d4-a716-446655440030', 2, 1.50, 0.00, 3.00),
('550e8400-e29b-41d4-a716-446655440040', '550e8400-e29b-41d4-a716-446655440031', 1, 4.00, 0.00, 4.00),
('550e8400-e29b-41d4-a716-446655440040', '550e8400-e29b-41d4-a716-446655440032', 1, 3.00, 0.50, 2.50),
('550e8400-e29b-41d4-a716-446655440041', '550e8400-e29b-41d4-a716-446655440033', 1, 6.00, 0.00, 6.00),
('550e8400-e29b-41d4-a716-446655440041', '550e8400-e29b-41d4-a716-446655440034', 1, 5.00, 0.00, 5.00),
('550e8400-e29b-41d4-a716-446655440041', '550e8400-e29b-41d4-a716-446655440035', 1, 2.50, 1.20, 1.30);