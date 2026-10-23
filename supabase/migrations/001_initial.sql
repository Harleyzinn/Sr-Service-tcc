-- SR Service v2. New tables only: existing usu_cadastro/tb_orcamento stay untouched.
begin;

create table public.sr_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 120),
  email text not null default '',
  company text not null default '' check (char_length(company) <= 160),
  phone text not null default '' check (char_length(phone) <= 20),
  document text not null default '' check (char_length(document) <= 20),
  address text not null default '' check (char_length(address) <= 500),
  created_at timestamptz not null default now()
);

-- Roles come from app_metadata, which a browser client cannot modify.
create function public.sr_is_admin() returns boolean
language sql stable set search_path = '' as $$
  select coalesce((select auth.jwt())->'app_metadata'->>'role' = 'admin', false);
$$;
revoke all on function public.sr_is_admin() from public, anon;
grant execute on function public.sr_is_admin() to authenticated;

create table public.sr_quotes (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity (start with 1001) unique,
  user_id uuid not null references public.sr_profiles(id) on delete restrict,
  service text not null check (service in ('Manutenção preventiva e corretiva', 'Modernização de equipamentos', 'Inspeções e laudos técnicos', 'Montagem e instalação', 'Peças e componentes', 'Consultoria técnica')),
  equipment text not null check (char_length(btrim(equipment)) between 1 and 200),
  description text not null check (char_length(btrim(description)) between 20 and 5000),
  urgency text not null default 'Planejado' check (urgency in ('Planejado', 'O quanto antes', 'Apenas uma cotação')),
  company text not null check (char_length(btrim(company)) between 1 and 160),
  contact_name text not null check (char_length(btrim(contact_name)) between 1 and 120),
  email text not null check (char_length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  phone text not null check (char_length(regexp_replace(phone, '[^0-9]', '', 'g')) between 10 and 11),
  address text not null check (char_length(btrim(address)) between 1 and 500),
  status text not null default 'Recebido' check (status in ('Recebido', 'Em análise', 'Proposta enviada', 'Aprovado', 'Em execução', 'Concluído', 'Cancelado')),
  amount numeric(12,2) check (amount >= 0 and amount <= 999999999),
  notes text not null default '' check (char_length(notes) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index sr_quotes_user_date on public.sr_quotes(user_id, created_at desc);
create index sr_quotes_status on public.sr_quotes(status);

create table public.sr_quote_events (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.sr_quotes(id) on delete cascade,
  status text not null,
  created_at timestamptz not null default now()
);
create index sr_quote_events_quote on public.sr_quote_events(quote_id, created_at);

alter table public.sr_profiles enable row level security;
alter table public.sr_quotes enable row level security;
alter table public.sr_quote_events enable row level security;

-- Explicit privileges prevent clients from editing email, owner, dates or amount at creation.
revoke all on public.sr_profiles, public.sr_quotes, public.sr_quote_events from anon, authenticated;
grant select on public.sr_profiles to authenticated;
grant update(full_name, company, phone, document, address) on public.sr_profiles to authenticated;
grant select on public.sr_quotes to authenticated;
grant insert(user_id, service, equipment, description, urgency, company, contact_name, email, phone, address) on public.sr_quotes to authenticated;
grant update(status, amount, notes) on public.sr_quotes to authenticated;
grant usage, select on sequence public.sr_quotes_number_seq to authenticated;
grant select on public.sr_quote_events to authenticated;

create policy sr_profile_read on public.sr_profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.sr_is_admin()));
create policy sr_profile_update on public.sr_profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy sr_quote_read on public.sr_quotes for select to authenticated
  using (user_id = (select auth.uid()) or (select public.sr_is_admin()));
create policy sr_quote_create on public.sr_quotes for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'Recebido' and amount is null and notes = '');
create policy sr_quote_admin_update on public.sr_quotes for update to authenticated
  using ((select public.sr_is_admin())) with check ((select public.sr_is_admin()));
create policy sr_event_read on public.sr_quote_events for select to authenticated
  using (exists (select 1 from public.sr_quotes q where q.id = quote_id and (q.user_id = (select auth.uid()) or (select public.sr_is_admin()))));

-- Profile and history are written inside the database, never by a privileged browser key.
create function public.sr_handle_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.sr_profiles(id, email, full_name, phone, company)
  values (new.id, coalesce(new.email,''), left(coalesce(new.raw_user_meta_data->>'full_name',''),120), left(coalesce(new.raw_user_meta_data->>'phone',''),20), left(coalesce(new.raw_user_meta_data->>'company',''),160));
  return new;
end;
$$;
revoke all on function public.sr_handle_user() from public, anon, authenticated;
create trigger sr_new_user after insert on auth.users for each row execute function public.sr_handle_user();

create function public.sr_track_quote() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.sr_quote_events(quote_id, status) values (new.id,new.status);
  elsif old.status is distinct from new.status then
    insert into public.sr_quote_events(quote_id, status) values (new.id,new.status);
  end if;
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.sr_track_quote() from public, anon, authenticated;
-- AFTER INSERT ensures the event's foreign key resolves. BEFORE UPDATE sets updated_at.
create trigger sr_quote_created after insert on public.sr_quotes for each row execute function public.sr_track_quote();
create trigger sr_quote_updated before update on public.sr_quotes for each row execute function public.sr_track_quote();

-- Existing Auth accounts can use the v2 portal. Historical quotes are NOT imported.
insert into public.sr_profiles(id,email,full_name,phone,company)
select id,coalesce(email,''),left(coalesce(raw_user_meta_data->>'full_name',''),120),left(coalesce(raw_user_meta_data->>'phone',''),20),left(coalesce(raw_user_meta_data->>'company',''),160)
from auth.users on conflict(id) do nothing;

commit;
