-- ============================================================
-- MIGRATION: Full Party Consolidation + VAT at Line Item Level
-- Run this in Supabase SQL Editor
-- ============================================================

-- ─── 1. CONTRACTORS TABLE: update party_type constraint ──────────────────────

ALTER TABLE contractors DROP CONSTRAINT IF EXISTS contractors_party_type_check;

-- Migrate old values first
UPDATE contractors SET party_type = 'Subcontractor' WHERE party_type = 'Contractor';
UPDATE contractors SET party_type = 'Direct Client'  WHERE party_type = 'Client';
-- 'Vendor', 'Subcontractor', 'Consultant' remain

-- New constraint
ALTER TABLE contractors ADD CONSTRAINT contractors_party_type_check
  CHECK (party_type IN (
    'Direct Client', 'Main Contractor', 'Developer',
    'Commercial', 'Government', 'Consultant',
    'Vendor', 'Subcontractor'
  ));

-- ─── 2. MIGRATE clients → contractors ────────────────────────────────────────

INSERT INTO contractors (id, name, party_type, phone, email, address, trn_number, notes, created_at)
SELECT id, name, 'Direct Client', phone, email, address, trn_number, notes, created_at
FROM clients
WHERE id NOT IN (SELECT id FROM contractors)
ON CONFLICT (id) DO NOTHING;

-- ─── 3. MIGRATE vendors → contractors ────────────────────────────────────────

INSERT INTO contractors (id, name, party_type, contact_person, phone, email, address, trn_number, notes, created_at)
SELECT id, name, 'Vendor', contact_person, phone, email, address, trn_number, notes, created_at
FROM vendors
WHERE id NOT IN (SELECT id FROM contractors)
ON CONFLICT (id) DO NOTHING;

-- ─── 4. UPDATE FOREIGN KEYS: projects.client_id → contractors ────────────────

-- Drop old FK if exists
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_client_id_fkey;
-- Add new FK pointing to contractors
ALTER TABLE projects ADD CONSTRAINT projects_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES contractors(id) ON DELETE SET NULL;

-- ─── 5. UPDATE FOREIGN KEYS: purchase_orders.vendor_id → contractors ─────────

ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_vendor_id_fkey;
ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_vendor_id_fkey
  FOREIGN KEY (vendor_id) REFERENCES contractors(id) ON DELETE SET NULL;

-- ─── 6. UPDATE FOREIGN KEYS: vendor_payments.vendor_id → contractors ─────────

ALTER TABLE vendor_payments DROP CONSTRAINT IF EXISTS vendor_payments_vendor_id_fkey;
ALTER TABLE vendor_payments ADD CONSTRAINT vendor_payments_vendor_id_fkey
  FOREIGN KEY (vendor_id) REFERENCES contractors(id) ON DELETE SET NULL;

-- ─── 7. UPDATE FOREIGN KEYS: receipts.client_id → contractors ────────────────

ALTER TABLE receipts DROP CONSTRAINT IF EXISTS receipts_client_id_fkey;
ALTER TABLE receipts ADD CONSTRAINT receipts_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES contractors(id) ON DELETE SET NULL;

-- ─── 8. UPDATE FOREIGN KEYS: invoices.client_id → contractors ────────────────

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_client_id_fkey;
ALTER TABLE invoices ADD CONSTRAINT invoices_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES contractors(id) ON DELETE SET NULL;

-- ─── 9. VAT AT LINE ITEM LEVEL: invoice_items ────────────────────────────────

ALTER TABLE invoice_items
  ADD COLUMN IF NOT EXISTS vat_applicable boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS vat_rate       numeric(5,2)  NOT NULL DEFAULT 5.00,
  ADD COLUMN IF NOT EXISTS vat_amount     numeric(12,2) NOT NULL DEFAULT 0.00;

-- Backfill from parent invoice VAT settings
UPDATE invoice_items ii
SET
  vat_applicable = true,
  vat_rate       = COALESCE(i.vat_percentage, 5),
  vat_amount     = ROUND((ii.total_price * COALESCE(i.vat_percentage, 5) / 100)::numeric, 2)
FROM invoices i
WHERE ii.invoice_id = i.id
  AND i.vat_applicable = true
  AND COALESCE(i.vat_percentage, 0) > 0;

-- ─── 10. VAT AT LINE ITEM LEVEL: purchase_order_items ────────────────────────

ALTER TABLE purchase_order_items
  ADD COLUMN IF NOT EXISTS vat_applicable boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS vat_rate       numeric(5,2)  NOT NULL DEFAULT 5.00,
  ADD COLUMN IF NOT EXISTS vat_amount     numeric(12,2) NOT NULL DEFAULT 0.00;

-- Backfill from parent PO VAT settings
UPDATE purchase_order_items poi
SET
  vat_applicable = true,
  vat_rate       = 5.00,
  vat_amount     = ROUND((poi.total_price * 5.00 / 100)::numeric, 2)
FROM purchase_orders po
WHERE poi.purchase_order_id = po.id
  AND po.vat_applicable = true
  AND po.vat_amount > 0;

-- ─── VERIFY ───────────────────────────────────────────────────────────────────

SELECT party_type, COUNT(*) AS count FROM contractors GROUP BY party_type ORDER BY party_type;
