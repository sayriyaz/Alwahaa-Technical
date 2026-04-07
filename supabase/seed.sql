-- Seed data for development
-- Run this after schema.sql to populate initial data

-- Sample Clients
INSERT INTO public.clients (name, email, phone, address, notes) VALUES
('Ahmed Al-Rashid', 'ahmed@example.com', '+971 50 123 4567', 'Villa 12, Arabian Ranches, Dubai', 'VIP client, prefers email communication'),
('Fatima Hassan', 'fatima@example.com', '+971 55 987 6543', 'Palm Jumeirah, Dubai', 'Wants infinity pool with waterfall feature'),
('Omar Bin Sultan', 'omar@sultan.ae', '+971 56 111 2222', 'Emirates Hills, Dubai', 'Referral from Ahmed Al-Rashid'),
('Sarah Johnson', 'sarah@example.com', '+971 52 333 4444', 'Downtown Dubai', 'Expat client, payment in USD'),
('Mohammed Al-Farsi', 'mohammed@alfarsi.ae', '+971 54 555 6666', 'Jumeirah Golf Estates', 'Commercial project - hotel pool');

-- Sample Vendors
INSERT INTO public.vendors (name, contact_person, phone, email, address, payment_terms, notes) VALUES
('Desert Pool Supplies LLC', 'Khalid Ahmed', '+971 4 123 4567', 'sales@desertpool.ae', 'Al Quoz Industrial Area, Dubai', 'Net 30', 'Main tile supplier'),
('Aqua Tech Equipment', 'Sarah Williams', '+971 4 987 6543', 'orders@aquatechequip.com', 'Jebel Ali Free Zone', 'COD', 'Pumps and filtration systems'),
('Emirates Marble & Stone', 'Hassan Ibrahim', '+971 4 555 8888', 'hassan@emiratesmarble.ae', 'Ras Al Khor, Dubai', '50% Advance, 50% on Delivery', 'Pool coping and deck materials'),
('Dubai Transport Services', 'Rashid Khan', '+971 4 222 3333', 'dispatch@dubaitransport.ae', 'Deira, Dubai', 'Immediate', 'Material transportation'),
('Pool Maintenance Pro', 'Ali Hassan', '+971 50 777 8888', 'ali@poolmaintenancepro.ae', 'Al Barsha, Dubai', 'Monthly Billing', 'Cleaning chemicals and tools');

-- Sample Project (with phases will be created via app)
-- Note: project_code is auto-generated via trigger

-- Sample App Users (for development)
-- These need to be linked to auth.users after signup
-- The password for all dev accounts should be: Alwahaa@2025
