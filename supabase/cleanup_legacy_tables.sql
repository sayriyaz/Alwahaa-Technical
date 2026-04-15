-- ============================================================
-- CLEANUP: Remove legacy vendors/clients tables, fix FKs
-- Run this in Supabase SQL Editor AFTER migrate_party_types_and_vat.sql
-- ============================================================

-- ─── 1. FIX: purchase_orders.vendor_id → contractors ─────────────────────────

ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_vendor_id_fkey;
ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_vendor_id_fkey
  FOREIGN KEY (vendor_id) REFERENCES contractors(id) ON DELETE SET NULL;

-- ─── 2. FIX: vendor_payments.vendor_id → contractors ─────────────────────────

ALTER TABLE vendor_payments DROP CONSTRAINT IF EXISTS vendor_payments_vendor_id_fkey;
ALTER TABLE vendor_payments ADD CONSTRAINT vendor_payments_vendor_id_fkey
  FOREIGN KEY (vendor_id) REFERENCES contractors(id) ON DELETE SET NULL;

-- ─── 3. FIX: projects.client_id → contractors ────────────────────────────────

ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_client_id_fkey;
ALTER TABLE projects ADD CONSTRAINT projects_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES contractors(id) ON DELETE SET NULL;

-- ─── 4. FIX: invoices.client_id → contractors ────────────────────────────────

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_client_id_fkey;
ALTER TABLE invoices ADD CONSTRAINT invoices_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES contractors(id) ON DELETE SET NULL;

-- ─── 5. FIX: receipts.client_id → contractors ────────────────────────────────

ALTER TABLE receipts DROP CONSTRAINT IF EXISTS receipts_client_id_fkey;
ALTER TABLE receipts ADD CONSTRAINT receipts_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES contractors(id) ON DELETE SET NULL;

-- ─── 6. DROP: vendors table (data already in contractors) ────────────────────

DROP TABLE IF EXISTS vendors CASCADE;

-- ─── 7. DROP: clients table (empty, data already in contractors) ─────────────

DROP TABLE IF EXISTS clients CASCADE;

-- ─── 8. DROP: projects.main_contractor_id (always null, unused) ──────────────

ALTER TABLE projects DROP COLUMN IF EXISTS main_contractor_id;

-- ─── 9. DROP: invoices.vat_percentage (replaced by per-item vat_rate) ─────────

ALTER TABLE invoices DROP COLUMN IF EXISTS vat_percentage;

-- ─── VERIFY ───────────────────────────────────────────────────────────────────

-- Should show only contractors, projects, invoices, invoice_items,
-- receipts, purchase_orders, purchase_order_items, vendor_payments,
-- project_expenses, project_phases, app_users
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
