alter table public.projects
  add column if not exists vat_applicable boolean not null default false,
  add column if not exists vat_amount numeric(12, 2) not null default 0,
  add column if not exists total_amount numeric(12, 2) not null default 0;

update public.projects
set
  vat_applicable = coalesce(vat_applicable, false),
  vat_amount = coalesce(vat_amount, 0),
  total_amount = coalesce(contract_value, 0) + coalesce(vat_amount, 0);

alter table public.purchase_orders
  add column if not exists vat_applicable boolean not null default false;

update public.purchase_orders
set
  vat_applicable = coalesce(vat_amount, 0) > 0,
  vat_amount = case when coalesce(vat_amount, 0) > 0 then vat_amount else 0 end,
  total_amount = coalesce(subtotal, 0) + case when coalesce(vat_amount, 0) > 0 then coalesce(vat_amount, 0) else 0 end;

alter table public.invoices
  add column if not exists vat_applicable boolean not null default false;

update public.invoices
set
  vat_applicable = coalesce(vat_amount, 0) > 0,
  vat_amount = case when coalesce(vat_amount, 0) > 0 then vat_amount else 0 end,
  vat_percentage = case
    when coalesce(vat_amount, 0) > 0 and coalesce(subtotal, 0) > 0 then round((vat_amount / subtotal) * 100, 2)
    else 0
  end,
  total_amount = coalesce(subtotal, 0) + case when coalesce(vat_amount, 0) > 0 then coalesce(vat_amount, 0) else 0 end,
  balance_due = greatest((coalesce(subtotal, 0) + case when coalesce(vat_amount, 0) > 0 then coalesce(vat_amount, 0) else 0 end) - coalesce(amount_paid, 0), 0);

alter table public.receipts
  add column if not exists vat_applicable boolean not null default false;

update public.receipts
set
  vat_applicable = coalesce(vat_amount, 0) > 0,
  vat_amount = case when coalesce(vat_amount, 0) > 0 then vat_amount else 0 end;

alter table public.vendor_payments
  add column if not exists vat_applicable boolean not null default false;

update public.vendor_payments
set
  vat_applicable = coalesce(vat_amount, 0) > 0,
  vat_amount = case when coalesce(vat_amount, 0) > 0 then vat_amount else 0 end;

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

create index if not exists project_documents_project_id_idx on public.project_documents (project_id);

grant all on table public.project_documents to anon, authenticated;

alter table public.project_documents enable row level security;

drop policy if exists "Allow full access" on public.project_documents;
create policy "Allow full access" on public.project_documents
  for all to anon, authenticated
  using (true)
  with check (true);

insert into storage.buckets (id, name, public)
values ('project-documents', 'project-documents', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Authenticated users can read project documents" on storage.objects;
create policy "Authenticated users can read project documents"
  on storage.objects for select to authenticated
  using (bucket_id = 'project-documents');

drop policy if exists "Authenticated users can upload project documents" on storage.objects;
create policy "Authenticated users can upload project documents"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'project-documents');

drop policy if exists "Authenticated users can update project documents" on storage.objects;
create policy "Authenticated users can update project documents"
  on storage.objects for update to authenticated
  using (bucket_id = 'project-documents')
  with check (bucket_id = 'project-documents');

drop policy if exists "Authenticated users can delete project documents" on storage.objects;
create policy "Authenticated users can delete project documents"
  on storage.objects for delete to authenticated
  using (bucket_id = 'project-documents');

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
