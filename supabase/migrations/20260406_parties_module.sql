alter table public.contractors
  add column if not exists party_type text not null default 'Contractor';

update public.contractors
set party_type = 'Contractor'
where party_type is null or btrim(party_type) = '';

create index if not exists contractors_party_type_idx on public.contractors (party_type);
