create table if not exists public.contractors (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  contact_person text,
  phone text,
  email text,
  address text,
  trn_number text,
  notes text
);

alter table public.projects
  add column if not exists work_type text not null default 'Direct',
  add column if not exists main_contractor_id uuid references public.contractors (id) on delete set null;

alter table public.invoices
  alter column vat_percentage set default 0;

alter table public.receipts
  add column if not exists vat_amount numeric(12, 2) not null default 0;

alter table public.vendor_payments
  add column if not exists vat_amount numeric(12, 2) not null default 0;

create index if not exists contractors_name_idx on public.contractors (name);
create index if not exists projects_main_contractor_id_idx on public.projects (main_contractor_id);

grant all on table public.contractors to anon, authenticated;

alter table public.contractors enable row level security;

create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_contractors_updated_at on public.contractors;
create trigger update_contractors_updated_at before update on public.contractors
  for each row execute function public.update_updated_at_column();

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'contractors'
      and policyname = 'Allow full access'
  ) then
    create policy "Allow full access" on public.contractors
      for all to anon, authenticated
      using (true)
      with check (true);
  end if;
end $$;
