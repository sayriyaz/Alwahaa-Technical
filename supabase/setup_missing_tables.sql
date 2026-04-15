-- =============================================================
-- ALWAHAA POOLS — Missing Tables Migration
-- Run this in Supabase SQL Editor
-- =============================================================

-- -------------------------------------------------------
-- 1. CLIENTS TABLE
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clients (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  email           text,
  phone           text,
  address         text,
  emirates_id     text,
  trn_number      text,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Insert existing client referenced by projects & receipts
-- (Update the name/phone/email with real details after running)
INSERT INTO public.clients (id, name, phone, address)
VALUES (
  '64f0acb9-6b66-4999-8759-c7645154208c',
  'Saraf Villa Owner',        -- UPDATE with actual client name
  '',                          -- UPDATE with phone
  'Villa No: 5, 2A Street, Al Rashidiya, Dubai'
)
ON CONFLICT (id) DO NOTHING;

-- -------------------------------------------------------
-- 2. INVOICES TABLE
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number  text UNIQUE NOT NULL,
  project_id      uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  client_id       uuid REFERENCES public.clients(id),
  phase_id        uuid REFERENCES public.project_phases(id),
  invoice_date    date NOT NULL DEFAULT CURRENT_DATE,
  due_date        date,
  description     text,
  subtotal        numeric(12,2) NOT NULL DEFAULT 0,
  vat_percentage  numeric(5,2) NOT NULL DEFAULT 0,
  vat_applicable  boolean NOT NULL DEFAULT false,
  vat_amount      numeric(12,2) NOT NULL DEFAULT 0,
  total_amount    numeric(12,2) NOT NULL DEFAULT 0,
  amount_paid     numeric(12,2) NOT NULL DEFAULT 0,
  balance_due     numeric(12,2) NOT NULL DEFAULT 0,
  status          text NOT NULL DEFAULT 'Draft'
                    CHECK (status IN ('Draft','Sent','Partially Paid','Paid','Overdue','Cancelled')),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz
);

-- Restore existing invoice (INV-2026-001) referenced by receipts & invoice_items
INSERT INTO public.invoices (
  id, invoice_number, project_id, client_id,
  invoice_date, subtotal, vat_applicable, vat_amount, vat_percentage,
  total_amount, amount_paid, balance_due, status
)
VALUES (
  'c6f1e2cb-27c3-4834-b10f-bc70159b771d',
  'INV-2026-001',
  'e97ca77e-01bc-4168-b7e2-38d58797353b',   -- Saraf Villa project
  '64f0acb9-6b66-4999-8759-c7645154208c',   -- client
  '2026-04-07',
  80000, true, 4000, 5,
  84000, 84000, 0, 'Paid'
)
ON CONFLICT (id) DO NOTHING;

-- -------------------------------------------------------
-- 3. FOREIGN KEY: projects.client_id → clients
-- -------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'projects_client_id_fkey'
  ) THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT projects_client_id_fkey
      FOREIGN KEY (client_id) REFERENCES public.clients(id);
  END IF;
END $$;

-- -------------------------------------------------------
-- 4. FOREIGN KEY: receipts.client_id → clients
-- -------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'receipts_client_id_fkey'
  ) THEN
    ALTER TABLE public.receipts
      ADD CONSTRAINT receipts_client_id_fkey
      FOREIGN KEY (client_id) REFERENCES public.clients(id);
  END IF;
END $$;

-- -------------------------------------------------------
-- 5. FOREIGN KEY: receipts.invoice_id → invoices
-- -------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'receipts_invoice_id_fkey'
  ) THEN
    ALTER TABLE public.receipts
      ADD CONSTRAINT receipts_invoice_id_fkey
      FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;
  END IF;
END $$;

-- -------------------------------------------------------
-- 6. FOREIGN KEY: invoice_items.invoice_id → invoices
-- -------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'invoice_items_invoice_id_fkey'
  ) THEN
    ALTER TABLE public.invoice_items
      ADD CONSTRAINT invoice_items_invoice_id_fkey
      FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;
  END IF;
END $$;

-- -------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS)
-- -------------------------------------------------------
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access (matches your existing pattern)
CREATE POLICY "Allow authenticated read clients"
  ON public.clients FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated write clients"
  ON public.clients FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read invoices"
  ON public.invoices FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated write invoices"
  ON public.invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- -------------------------------------------------------
-- Done. Verify with:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' ORDER BY table_name;
-- -------------------------------------------------------
