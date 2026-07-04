-- =========================================================
-- SCHEMA SAAS MULTI-TENANT — GESTIONE STRUTTURE RICETTIVE
-- Basato sul modello Caellitta, esteso a multi-host / multi-property
-- =========================================================

-- ---------------------------------------------------------
-- 1. HOSTS (un record per ogni utente che si registra come host)
-- ---------------------------------------------------------
create table hosts (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  plan text not null default 'free' check (plan in ('free', 'pro', 'business')),
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 2. PROPERTIES (le strutture gestite da ogni host)
-- ---------------------------------------------------------
create table properties (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references hosts(id) on delete cascade,
  name text not null,
  address text not null,
  city text not null,
  cin text,                        -- Codice Identificativo Nazionale (obbligo normativo IT)
  max_guests int not null default 2,
  timezone text not null default 'Europe/Rome',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 3. BOOKINGS (prenotazioni, indipendenti dal canale)
-- ---------------------------------------------------------
create table bookings (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  guest_name text not null,
  guest_contact text,
  channel text not null default 'direct' check (channel in ('airbnb','booking','direct','other')),
  external_reservation_id text,    -- id prenotazione sul canale esterno, per futura integrazione API
  checkin_date date not null,
  checkout_date date not null,
  guests_count int not null default 1,
  status text not null default 'confirmed' check (status in ('confirmed','cancelled','completed')),
  notes text,
  created_at timestamptz not null default now(),
  constraint valid_dates check (checkout_date > checkin_date)
);

create index idx_bookings_checkin on bookings(checkin_date);
create index idx_bookings_property on bookings(property_id);

-- ---------------------------------------------------------
-- 4. MAINTENANCE REQUESTS (manutenzione / pulizie)
-- ---------------------------------------------------------
create table maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  title text not null,
  description text,
  category text not null default 'maintenance' check (category in ('maintenance','cleaning','other')),
  priority text not null default 'normal' check (priority in ('low','normal','urgent')),
  status text not null default 'open' check (status in ('open','in_progress','resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- ---------------------------------------------------------
-- 5. PUSH TOKENS (device token per notifiche Expo/FCM)
-- ---------------------------------------------------------
create table push_tokens (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references hosts(id) on delete cascade,
  expo_push_token text not null unique,
  platform text not null check (platform in ('ios','android')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 6. NOTIFICATIONS LOG (storico, utile per badge "non lette" in app)
-- ---------------------------------------------------------
create table notifications (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references hosts(id) on delete cascade,
  property_id uuid references properties(id) on delete set null,
  type text not null check (type in ('new_booking','checkin_reminder','checkout_reminder','maintenance_request')),
  title text not null,
  body text not null,
  payload jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- =========================================================
-- ROW LEVEL SECURITY — il punto critico del multi-tenant
-- =========================================================

alter table hosts enable row level security;
alter table properties enable row level security;
alter table bookings enable row level security;
alter table maintenance_requests enable row level security;
alter table push_tokens enable row level security;
alter table notifications enable row level security;

-- Funzione helper: recupera l'host_id dell'utente autenticato corrente
create or replace function current_host_id()
returns uuid
language sql
security definer
stable
as $$
  select id from hosts where auth_user_id = auth.uid();
$$;

-- HOSTS: un utente vede solo il proprio record host
create policy "host_select_own" on hosts
  for select using (auth_user_id = auth.uid());
create policy "host_update_own" on hosts
  for update using (auth_user_id = auth.uid());

-- PROPERTIES: un host vede/gestisce solo le proprie strutture
create policy "properties_select_own" on properties
  for select using (host_id = current_host_id());
create policy "properties_insert_own" on properties
  for insert with check (host_id = current_host_id());
create policy "properties_update_own" on properties
  for update using (host_id = current_host_id());
create policy "properties_delete_own" on properties
  for delete using (host_id = current_host_id());

-- BOOKINGS: accesso solo tramite proprietà che appartengono all'host
create policy "bookings_select_own" on bookings
  for select using (
    property_id in (select id from properties where host_id = current_host_id())
  );
create policy "bookings_insert_own" on bookings
  for insert with check (
    property_id in (select id from properties where host_id = current_host_id())
  );
create policy "bookings_update_own" on bookings
  for update using (
    property_id in (select id from properties where host_id = current_host_id())
  );
create policy "bookings_delete_own" on bookings
  for delete using (
    property_id in (select id from properties where host_id = current_host_id())
  );

-- MAINTENANCE_REQUESTS: stessa logica di bookings
create policy "maintenance_select_own" on maintenance_requests
  for select using (
    property_id in (select id from properties where host_id = current_host_id())
  );
create policy "maintenance_insert_own" on maintenance_requests
  for insert with check (
    property_id in (select id from properties where host_id = current_host_id())
  );
create policy "maintenance_update_own" on maintenance_requests
  for update using (
    property_id in (select id from properties where host_id = current_host_id())
  );

-- PUSH_TOKENS e NOTIFICATIONS: filtrate per host_id diretto
create policy "push_tokens_own" on push_tokens
  for all using (host_id = current_host_id());
create policy "notifications_select_own" on notifications
  for select using (host_id = current_host_id());
create policy "notifications_update_own" on notifications
  for update using (host_id = current_host_id());

-- =========================================================
-- TRIGGER: notifica automatica alla creazione di una prenotazione
-- (verrà agganciato a una Edge Function via Database Webhook,
--  qui creiamo solo il record di log; l'invio push è lato Edge Function)
-- =========================================================
create or replace function notify_new_booking()
returns trigger
language plpgsql
security definer
as $$
declare
  v_host_id uuid;
  v_property_name text;
begin
  select host_id, name into v_host_id, v_property_name
  from properties where id = new.property_id;

  insert into notifications (host_id, property_id, type, title, body, payload)
  values (
    v_host_id,
    new.property_id,
    'new_booking',
    'Nuova prenotazione — ' || v_property_name,
    new.guest_name || ' dal ' || new.checkin_date || ' al ' || new.checkout_date,
    jsonb_build_object('booking_id', new.id, 'channel', new.channel)
  );
  return new;
end;
$$;

create trigger trg_notify_new_booking
  after insert on bookings
  for each row execute function notify_new_booking();

-- =========================================================
-- Nota: i reminder di check-in/check-out (24h prima) vanno gestiti
-- con pg_cron (estensione Supabase) che gira una volta al giorno e
-- inserisce in `notifications` le righe per le date corrispondenti.
-- La Edge Function che invia le push leggerà da questa tabella.
-- =========================================================
