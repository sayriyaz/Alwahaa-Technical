-- ============================================================================
-- ALWAHAA TECHNICAL SERVICES - POOL CONSTRUCTION MANAGEMENT
-- Database Schema Setup
-- ============================================================================

create extension if not exists "pgcrypto";

-- ============================================
-- CORE TABLES
-- ============================================

-- Clients (pool owners)
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  email text,
  phone text not null,
  address text,
  emirates_id text,
  trn_number text, -- Tax Registration Number
  notes text
);

-- Vendors/Suppliers (tile shops, equipment suppliers, contractors)
create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  contact_person text,
  phone text,
  email text,
  address text,
  trn_number text,
  payment_terms text, -- e.g., "Net 30", "COD"
  notes text
);

-- Main Contractors (for subcontract projects)
create table if not exists public.contractors (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  party_type text not null default 'Contractor', -- Contractor, Subcontractor, Consultant
  contact_person text,
  phone text,
  email text,
  address text,
  trn_number text,
  notes text
);

-- Projects (individual pool construction projects)
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  project_code text not null unique, -- e.g., "POOL-2025-001"
  client_id uuid not null references public.clients (id) on delete restrict,
  work_type text not null default 'Direct', -- Direct, Subcontract
  main_contractor_id uuid references public.contractors (id) on delete set null,
  name text not null, -- e.g., "Villa Pool - Arabian Ranches"
  location text not null,
  description text,
  contract_value numeric(12, 2) not null default 0,
  vat_applicable boolean not null default false,
  vat_amount numeric(12, 2) not null default 0,
  total_amount numeric(12, 2) not null default 0,
  start_date date,
  expected_completion date,
  actual_completion date,
  status text not null default 'Pending', -- Pending, In Progress, On Hold, Completed, Cancelled
  assigned_to text, -- Project manager
  notes text
);

-- Project Phases/Milestones
create table if not exists public.project_phases (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null, -- e.g., "Excavation", "Tile Work", "Equipment Install"
  description text,
  estimated_cost numeric(12, 2) not null default 0,
  actual_cost numeric(12, 2) not null default 0,
  start_date date,
  expected_end date,
  actual_end date,
  status text not null default 'Pending', -- Pending, In Progress, Completed, Delayed
  completion_percentage int not null default 0 check (completion_percentage >= 0 and completion_percentage <= 100),
  invoice_trigger boolean not null default false -- Invoice client when this phase completes
);

-- Purchase Orders (from vendors)
create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  po_number text not null unique, -- e.g., "PO-2025-001"
  vendor_id uuid not null references public.vendors (id) on delete restrict,
  project_id uuid references public.projects (id) on delete set null, -- null if general inventory
  order_date date not null default current_date,
  expected_delivery date,
  subtotal numeric(12, 2) not null default 0,
  vat_applicable boolean not null default false,
  vat_amount numeric(12, 2) not null default 0,
  total_amount numeric(12, 2) not null default 0,
  status text not null default 'Draft', -- Draft, Sent, Partially Received, Fully Received, Cancelled
  notes text,
  received_at timestamptz
);

-- Purchase Order Items
create table if not exists public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  purchase_order_id uuid not null references public.purchase_orders (id) on delete cascade,
  item_name text not null,
  description text,
  quantity numeric(10, 2) not null default 1,
  unit text not null, -- e.g., "sqm", "pcs", "kg", "hours"
  unit_price numeric(12, 2) not null default 0,
  total_price numeric(12, 2) not null default 0,
  received_quantity numeric(10, 2) not null default 0
);

-- Project Expenses (site costs, labor, maintenance, misc)
create table if not exists public.project_expenses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  expense_date date not null default current_date,
  project_id uuid not null references public.projects (id) on delete cascade,
  category text not null, -- Labor, Transport, Site Maintenance, Fuel, Misc
  description text not null,
  amount numeric(12, 2) not null default 0,
  paid_to text, -- Worker name, company, etc.
  payment_method text, -- Cash, Bank Transfer, Check
  receipt_reference text,
  notes text
);

-- Client Invoices
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  invoice_number text not null unique, -- e.g., "INV-2025-001"
  project_id uuid not null references public.projects (id) on delete restrict,
  client_id uuid not null references public.clients (id) on delete restrict,
  invoice_date date not null default current_date,
  due_date date,
  phase_id uuid references public.project_phases (id) on delete set null,
  description text,
  subtotal numeric(12, 2) not null default 0,
  vat_percentage numeric(5, 2) not null default 0, -- kept for legacy compatibility
  vat_applicable boolean not null default false,
  vat_amount numeric(12, 2) not null default 0,
  total_amount numeric(12, 2) not null default 0,
  amount_paid numeric(12, 2) not null default 0,
  balance_due numeric(12, 2) not null default 0,
  status text not null default 'Draft', -- Draft, Sent, Partially Paid, Paid, Overdue, Cancelled
  notes text
);

-- Invoice Items
create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  description text not null,
  quantity numeric(10, 2) not null default 1,
  unit text,
  unit_price numeric(12, 2) not null default 0,
  total_price numeric(12, 2) not null default 0
);

-- Client Receipts (payments received)
create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  receipt_number text not null unique, -- e.g., "REC-2025-001"
  invoice_id uuid not null references public.invoices (id) on delete restrict,
  project_id uuid not null references public.projects (id) on delete restrict,
  client_id uuid not null references public.clients (id) on delete restrict,
  receipt_date date not null default current_date,
  amount numeric(12, 2) not null default 0,
  vat_applicable boolean not null default false,
  vat_amount numeric(12, 2) not null default 0,
  payment_method text not null, -- Cash, Bank Transfer, Check, Credit Card
  reference_number text, -- Check number, transaction ID
  bank_name text,
  notes text
);

-- Vendor Payments (payments made to suppliers)
create table if not exists public.vendor_payments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  payment_number text not null unique, -- e.g., "VP-2025-001"
  vendor_id uuid not null references public.vendors (id) on delete restrict,
  purchase_order_id uuid references public.purchase_orders (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  payment_date date not null default current_date,
  amount numeric(12, 2) not null default 0,
  vat_applicable boolean not null default false,
  vat_amount numeric(12, 2) not null default 0,
  payment_method text not null, -- Cash, Bank Transfer, Check
  reference_number text,
  bank_name text,
  notes text
);

-- App Users (for authentication)
create table if not exists public.app_users (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email text not null,
  full_name text,
  role text not null default 'viewer', -- admin, manager, accountant, site_engineer, viewer
  phone text,
  is_active boolean not null default true
);

-- Project Documents (drawings, quotations, contracts, estimations, etc.)
create table if not exists public.project_documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project_id uuid not null references public.projects (id) on delete cascade,
  document_type text not null default 'Other',
  title text not null,
  file_name text not null,
  file_path text not null unique,
  file_size bigint not null default 0,
  content_type text,
  notes text,
  uploaded_by uuid references public.app_users (id) on delete set null
);

-- ============================================
-- INDEXES
-- ============================================

create index if not exists projects_client_id_idx on public.projects (client_id);
create index if not exists projects_main_contractor_id_idx on public.projects (main_contractor_id);
create index if not exists projects_status_idx on public.projects (status);
create index if not exists contractors_name_idx on public.contractors (name);
create index if not exists contractors_party_type_idx on public.contractors (party_type);
create index if not exists project_phases_project_id_idx on public.project_phases (project_id);
create index if not exists project_documents_project_id_idx on public.project_documents (project_id);
create index if not exists purchase_orders_vendor_id_idx on public.purchase_orders (vendor_id);
create index if not exists purchase_orders_project_id_idx on public.purchase_orders (project_id);
create index if not exists purchase_order_items_po_id_idx on public.purchase_order_items (purchase_order_id);
create index if not exists project_expenses_project_id_idx on public.project_expenses (project_id);
create index if not exists invoices_project_id_idx on public.invoices (project_id);
create index if not exists invoices_client_id_idx on public.invoices (client_id);
create index if not exists invoices_status_idx on public.invoices (status);
create index if not exists receipts_invoice_id_idx on public.receipts (invoice_id);
create index if not exists vendor_payments_vendor_id_idx on public.vendor_payments (vendor_id);

-- ============================================
-- PERMISSIONS
-- ============================================

grant all on table public.clients to anon, authenticated;
grant all on table public.vendors to anon, authenticated;
grant all on table public.contractors to anon, authenticated;
grant all on table public.projects to anon, authenticated;
grant all on table public.project_phases to anon, authenticated;
grant all on table public.project_documents to anon, authenticated;
grant all on table public.purchase_orders to anon, authenticated;
grant all on table public.purchase_order_items to anon, authenticated;
grant all on table public.project_expenses to anon, authenticated;
grant all on table public.invoices to anon, authenticated;
grant all on table public.invoice_items to anon, authenticated;
grant all on table public.receipts to anon, authenticated;
grant all on table public.vendor_payments to anon, authenticated;
grant all on table public.app_users to anon, authenticated;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table public.clients enable row level security;
alter table public.vendors enable row level security;
alter table public.contractors enable row level security;
alter table public.projects enable row level security;
alter table public.project_phases enable row level security;
alter table public.project_documents enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;
alter table public.project_expenses enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.receipts enable row level security;
alter table public.vendor_payments enable row level security;
alter table public.app_users enable row level security;

-- Allow full access (implement proper policies in production)
create policy "Allow full access" on public.clients for all to anon, authenticated using (true) with check (true);
create policy "Allow full access" on public.vendors for all to anon, authenticated using (true) with check (true);
create policy "Allow full access" on public.contractors for all to anon, authenticated using (true) with check (true);
create policy "Allow full access" on public.projects for all to anon, authenticated using (true) with check (true);
create policy "Allow full access" on public.project_phases for all to anon, authenticated using (true) with check (true);
create policy "Allow full access" on public.project_documents for all to anon, authenticated using (true) with check (true);
create policy "Allow full access" on public.purchase_orders for all to anon, authenticated using (true) with check (true);
create policy "Allow full access" on public.purchase_order_items for all to anon, authenticated using (true) with check (true);
create policy "Allow full access" on public.project_expenses for all to anon, authenticated using (true) with check (true);
create policy "Allow full access" on public.invoices for all to anon, authenticated using (true) with check (true);
create policy "Allow full access" on public.invoice_items for all to anon, authenticated using (true) with check (true);
create policy "Allow full access" on public.receipts for all to anon, authenticated using (true) with check (true);
create policy "Allow full access" on public.vendor_payments for all to anon, authenticated using (true) with check (true);
create policy "Allow full access" on public.app_users for all to anon, authenticated using (true) with check (true);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply updated_at triggers
create trigger update_clients_updated_at before update on public.clients
  for each row execute function public.update_updated_at_column();
create trigger update_vendors_updated_at before update on public.vendors
  for each row execute function public.update_updated_at_column();
create trigger update_contractors_updated_at before update on public.contractors
  for each row execute function public.update_updated_at_column();
create trigger update_projects_updated_at before update on public.projects
  for each row execute function public.update_updated_at_column();
create trigger update_project_phases_updated_at before update on public.project_phases
  for each row execute function public.update_updated_at_column();
create trigger update_purchase_orders_updated_at before update on public.purchase_orders
  for each row execute function public.update_updated_at_column();
create trigger update_invoices_updated_at before update on public.invoices
  for each row execute function public.update_updated_at_column();
create trigger update_app_users_updated_at before update on public.app_users
  for each row execute function public.update_updated_at_column();

insert into storage.buckets (id, name, public)
values ('project-documents', 'project-documents', true)
on conflict (id) do update set public = excluded.public;

create policy "Authenticated users can read project documents"
  on storage.objects for select to authenticated
  using (bucket_id = 'project-documents');

create policy "Authenticated users can upload project documents"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'project-documents');

create policy "Authenticated users can update project documents"
  on storage.objects for update to authenticated
  using (bucket_id = 'project-documents')
  with check (bucket_id = 'project-documents');

create policy "Authenticated users can delete project documents"
  on storage.objects for delete to authenticated
  using (bucket_id = 'project-documents');

-- Calculate project totals
create or replace function public.calculate_project_totals(project_uuid uuid)
returns table (
  total_purchases numeric,
  total_expenses numeric,
  total_invoiced numeric,
  total_received numeric,
  total_vendor_payments numeric,
  profit_margin numeric
) as $$
begin
  return query
  select
    coalesce((select sum(po.total_amount) from public.purchase_orders po where po.project_id = project_uuid), 0) as total_purchases,
    coalesce((select sum(pe.amount) from public.project_expenses pe where pe.project_id = project_uuid), 0) as total_expenses,
    coalesce((select sum(i.total_amount) from public.invoices i where i.project_id = project_uuid), 0) as total_invoiced,
    coalesce((select sum(r.amount) from public.receipts r where r.project_id = project_uuid), 0) as total_received,
    coalesce((select sum(vp.amount) from public.vendor_payments vp where vp.project_id = project_uuid), 0) as total_vendor_payments,
    case
      when p.total_amount > 0 then
        round(((p.total_amount - coalesce((select sum(po.total_amount) from public.purchase_orders po where po.project_id = project_uuid), 0) - coalesce((select sum(pe.amount) from public.project_expenses pe where pe.project_id = project_uuid), 0)) / p.total_amount * 100), 2)
      else 0
    end as profit_margin
  from public.projects p
  where p.id = project_uuid;
end;
$$ language plpgsql;
