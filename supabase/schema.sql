-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- WARNING: Dropping existing tables to ensure a clean slate since previous incorrect tables were detected
drop table if exists public.attendance_records cascade;
drop table if exists public.worker_salary_configs cascade;
drop table if exists public.bookings cascade;
drop table if exists public.services cascade;
drop table if exists public.profiles cascade;

-- Profiles Table (Linked to auth.users)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text, -- Added for easier existence checks and lookup
  name text not null default 'Unknown',
  phone text,
  role text not null default 'user' check (role in ('user', 'worker', 'admin')),
  avatar_url text,
  availability_status text not null default 'available' check (availability_status in ('available', 'busy')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for email to speed up existence checks
create index if not exists profiles_email_idx on public.profiles(email);

-- Force add columns just in case the table already existed from a previous template
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists role text not null default 'user';
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists name text not null default 'Unknown';
alter table public.profiles add column if not exists address text;
alter table public.profiles add column if not exists is_verified boolean not null default false;
alter table public.profiles add column if not exists availability_status text not null default 'available' check (availability_status in ('available', 'busy'));

-- Rating system columns for workers
alter table public.profiles add column if not exists total_feedbacks integer not null default 0;
alter table public.profiles add column if not exists total_rating_sum integer not null default 0;
alter table public.profiles add column if not exists average_rating numeric(3,2) not null default 0.00;

-- Services Table
create table if not exists public.services (
  id text primary key, -- e.g., 'car_wash'
  label text not null,
  emoji text,
  price numeric not null default 0,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Bookings Table
create table if not exists public.bookings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete set null not null,
  worker_id uuid references public.profiles(id) on delete set null,
  service_type text references public.services(id) on delete restrict not null,
  service_label text not null,
  price numeric not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'in_progress', 'completed', 'cancelled')),
  location text not null,
  location_link text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  scheduled_date timestamp with time zone,
  worker_assigned_at timestamp with time zone,
  completed_at timestamp with time zone,
  feedback_submitted boolean not null default false,
  feedback_id uuid
);

-- Feedbacks Table
create table if not exists public.feedbacks (
  id uuid default gen_random_uuid() primary key,
  booking_id uuid references public.bookings(id) on delete cascade not null,
  customer_id uuid references public.profiles(id) on delete cascade not null,
  worker_id uuid references public.profiles(id) on delete cascade not null,
  service_id text references public.services(id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(booking_id) -- One feedback per booking
);

-- Link feedback back to booking (circular reference handled by making it nullable)
alter table public.bookings add constraint bookings_feedback_id_fkey foreign key (feedback_id) references public.feedbacks(id) on delete set null;

-- Function to update worker rating stats
create or replace function public.handle_new_feedback()
returns trigger as $$
begin
  update public.profiles
  set 
    total_feedbacks = total_feedbacks + 1,
    total_rating_sum = total_rating_sum + new.rating,
    average_rating = (total_rating_sum + new.rating)::numeric / (total_feedbacks + 1)
  where id = new.worker_id;

  update public.bookings
  set 
    feedback_submitted = true,
    feedback_id = new.id
  where id = new.booking_id;

  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

-- Trigger for feedback insertion
drop trigger if exists on_feedback_inserted on public.feedbacks;
create trigger on_feedback_inserted
  after insert on public.feedbacks
  for each row execute function public.handle_new_feedback();

-- Worker Salary Configs
create table if not exists public.worker_salary_configs (
  worker_id uuid references public.profiles(id) on delete cascade primary key,
  daily_rate numeric not null default 500,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Attendance Records
create table if not exists public.attendance_records (
  id uuid default gen_random_uuid() primary key,
  worker_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  status text not null check (status in ('present', 'absent', 'half_day', 'holiday')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(worker_id, date)
);

-- --------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) SETUP
-- --------------------------------------------------------

-- Profiles
alter table public.profiles enable row level security;
drop policy if exists "Public readable profiles" on public.profiles;
create policy "Public readable profiles" on public.profiles for select using (true);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

drop policy if exists "Admins can delete profiles" on public.profiles;
create policy "Admins can delete profiles" on public.profiles for delete using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Services
alter table public.services enable row level security;
drop policy if exists "Anyone can read services" on public.services;
create policy "Anyone can read services" on public.services for select using (true);

drop policy if exists "Only admins can modify services" on public.services;
create policy "Only admins can modify services" on public.services for all using (
  exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

-- Bookings
alter table public.bookings enable row level security;
drop policy if exists "Admins can view all bookings" on public.bookings;
create policy "Admins can view all bookings" on public.bookings for select using (
  exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can view own bookings" on public.bookings;
create policy "Users can view own bookings" on public.bookings for select using (auth.uid() = user_id);

drop policy if exists "Workers can view accepted bookings" on public.bookings;
create policy "Workers can view accepted bookings" on public.bookings for select using (auth.uid() = worker_id or status = 'pending');

drop policy if exists "Users can create bookings" on public.bookings;
create policy "Users can create bookings" on public.bookings for insert with check (auth.uid() = user_id);

drop policy if exists "Users and Workers can update bookings" on public.bookings;
create policy "Users and Workers can update bookings" on public.bookings for update using (
  auth.uid() = user_id or 
  auth.uid() = worker_id or 
  (status = 'pending' and exists (select 1 from public.profiles where id = auth.uid() and role = 'worker'))
);

drop policy if exists "Admins can update all bookings" on public.bookings;
create policy "Admins can update all bookings" on public.bookings for update using (
  exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

-- Feedbacks
alter table public.feedbacks enable row level security;
drop policy if exists "Anyone can read feedbacks" on public.feedbacks;
create policy "Anyone can read feedbacks" on public.feedbacks for select using (true);

drop policy if exists "Users can create own feedbacks" on public.feedbacks;
create policy "Users can create own feedbacks" on public.feedbacks for insert with check (auth.uid() = customer_id);

-- Salary Configs
alter table public.worker_salary_configs enable row level security;
drop policy if exists "Admins can manage salary configs" on public.worker_salary_configs;
create policy "Admins can manage salary configs" on public.worker_salary_configs for all using (
  exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Workers can read own salary config" on public.worker_salary_configs;
create policy "Workers can read own salary config" on public.worker_salary_configs for select using (auth.uid() = worker_id);

-- Attendance Records
alter table public.attendance_records enable row level security;
drop policy if exists "Admins can view/manage attendance" on public.attendance_records;
create policy "Admins can view/manage attendance" on public.attendance_records for all using (
  exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Workers can view own attendance" on public.attendance_records;
create policy "Workers can view own attendance" on public.attendance_records for select using (auth.uid() = worker_id);

drop policy if exists "Workers can insert own attendance" on public.attendance_records;
create policy "Workers can insert own attendance" on public.attendance_records for insert with check (auth.uid() = worker_id);

drop policy if exists "Workers can update own attendance" on public.attendance_records;
create policy "Workers can update own attendance" on public.attendance_records for update using (auth.uid() = worker_id);

-- Addresses Table
create table if not exists public.addresses (
  id text primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  latitude numeric not null,
  longitude numeric not null,
  full_address text not null,
  city text not null,
  state text not null,
  country text not null,
  pincode text not null,
  is_default boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Row Level Security (RLS) for Addresses
alter table public.addresses enable row level security;

drop policy if exists "Users can manage own addresses" on public.addresses;
create policy "Users can manage own addresses" on public.addresses
  for all using (auth.uid() = user_id);

-- --------------------------------------------------------
-- SEED DATA (Services)
-- --------------------------------------------------------
insert into public.services (id, label, emoji, price, description) values
  ('car_wash', 'Car Wash', '🚗', 499, 'Full exterior & interior cleaning'),
  ('bike_wash', 'Bike Wash', '🏍️', 249, 'Thorough bike cleaning & polishing'),
  ('water_tank', 'Water Tank Cleaning', '💧', 799, 'Deep tank cleaning & sanitization')
on conflict (id) do nothing;

-- --------------------------------------------------------
-- SECURITY HARDENING & LINTER FIXES
-- --------------------------------------------------------

-- 1. Revoke public/anon/authenticated execute access on security definer functions
-- This prevents unauthorized execution of these database trigger/internal helper functions via PostgREST RPC.
revoke execute on function public.handle_new_feedback() from public;
revoke execute on function public.send_push_notification_trigger() from public;
revoke execute on function public.handle_new_booking_notification() from public;
revoke execute on function public.handle_booking_update_notification() from public;

-- Use PL/pgSQL block to conditionally apply fixes for functions and storage policies 
-- that might be defined outside this schema file or schema context, preventing errors on clean schema runs.
do $$
begin
  -- Revoke execute on public.handle_new_user if it exists
  if exists (
    select 1 from pg_proc p 
    join pg_namespace n on p.pronamespace = n.oid 
    where n.nspname = 'public' and p.proname = 'handle_new_user'
  ) then
    execute 'revoke execute on function public.handle_new_user() from public';
  end if;

  -- Revoke execute on public.has_role if it exists
  if exists (
    select 1 from pg_proc p 
    join pg_namespace n on p.pronamespace = n.oid 
    where n.nspname = 'public' and p.proname = 'has_role'
  ) then
    execute 'revoke execute on function public.has_role(uuid, public.app_role) from public';
  end if;

  -- 2. Restrict public bucket listing for "profile-images"
  -- Dropping the broad SELECT policy on storage.objects prevents clients from listing all files,
  -- while still allowing public read access to files via their direct public URLs.
  if exists (
    select 1 from pg_tables 
    where schemaname = 'storage' and tablename = 'objects'
  ) then
    execute 'drop policy if exists "Anyone can view profile images" on storage.objects';
  end if;
end;
$$;

-- --------------------------------------------------------
-- NOTIFICATION SYSTEM SETUP
-- --------------------------------------------------------

-- Create extensions schema and install pg_net there to prevent extension in public warning
create schema if not exists extensions;
create extension if not exists pg_net with schema extensions;

-- 1. Add expo_push_token column to profiles table
alter table public.profiles add column if not exists expo_push_token text;

-- 2. Create notifications table
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  body text not null,
  data jsonb default '{}'::jsonb,
  read boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index user_id and read to speed up query performance
create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_read_idx on public.notifications(read);

-- 3. Row Level Security for notifications
alter table public.notifications enable row level security;

drop policy if exists "Users can read own notifications" on public.notifications;
create policy "Users can read own notifications" on public.notifications
  for select using (auth.uid() = user_id);

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications" on public.notifications
  for update using (auth.uid() = user_id);

-- We drop "System can create notifications" INSERT policy as it is always true and bypasses row-level security.
-- Database triggers run with superuser (postgres) privileges, which bypasses RLS naturally. Clients do not need INSERT permission.
drop policy if exists "System can create notifications" on public.notifications;

-- 4. Push Notification Function & Trigger using pg_net
create or replace function public.send_push_notification_trigger()
returns trigger as $$
declare
  v_push_token text;
  v_type text;
  v_channel_id text;
  v_category text;
begin
  -- Get the recipient's expo push token
  select expo_push_token into v_push_token
  from public.profiles
  where id = new.user_id;

  -- If the token exists and is valid, send it via pg_net (asynchronous http request)
  if v_push_token is not null and v_push_token <> '' then
    -- Extract notification type from data
    v_type := coalesce(new.data->>'type', '');
    
    -- Map notification type to Android notification channel ID
    if v_type = 'booking_accepted' then
      v_channel_id := 'booking-accepted';
    elsif v_type = 'in_progress' then
      v_channel_id := 'booking-in-progress';
    elsif v_type = 'completed' then
      v_channel_id := 'booking-completed';
    elsif v_type = 'cancelled' then
      v_channel_id := 'booking-cancelled';
    else
      v_channel_id := 'booking-accepted'; -- Default fallback channel
    end if;

    -- Set category identifier for iOS action buttons
    v_category := 'BOOKING_UPDATE';

    perform net.http_post(
      'https://exp.host/--/api/v2/push/send'::text,
      jsonb_build_object(
        'to', v_push_token,
        'title', new.title,
        'body', new.body,
        'sound', 'default',
        'channelId', v_channel_id,
        'categoryIdentifier', v_category,
        'data', coalesce(new.data, '{}'::jsonb)
      )::jsonb,
      '{}'::jsonb,
      '{"Content-Type": "application/json"}'::jsonb,
      5000::integer
    );
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

-- Trigger to send push notification on notification creation
drop trigger if exists on_notification_created on public.notifications;
create trigger on_notification_created
  after insert on public.notifications
  for each row execute function public.send_push_notification_trigger();

-- 5. Booking Notification Triggers

-- Trigger function for new bookings (Notifies admin and workers)
create or replace function public.handle_new_booking_notification()
returns trigger as $$
declare
  r_profile record;
begin
  -- Notify all admins and workers
  for r_profile in 
    select id from public.profiles 
    where role in ('admin', 'worker')
  loop
    insert into public.notifications (user_id, title, body, data)
    values (
      r_profile.id,
      'New Booking Request 🚗',
      'A new booking for ' || new.service_label || ' has been requested at ' || new.location || '.',
      jsonb_build_object(
        'booking_id', new.id,
        'type', 'new_booking'
      )
    );
  end loop;
  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

drop trigger if exists on_booking_created on public.bookings;
create trigger on_booking_created
  after insert on public.bookings
  for each row execute function public.handle_new_booking_notification();

-- Trigger function for booking updates (Notifies customer when accepted/completed)
create or replace function public.handle_booking_update_notification()
returns trigger as $$
declare
  v_worker_name text;
begin
  -- Case A: Booking accepted by worker
  if new.status = 'accepted' and old.status = 'pending' and new.worker_id is not null then
    select name into v_worker_name from public.profiles where id = new.worker_id;

    insert into public.notifications (user_id, title, body, data)
    values (
      new.user_id,
      'Booking Accepted! 🛠️',
      coalesce(v_worker_name, 'A worker') || ' has accepted your booking request for ' || new.service_label || '.',
      jsonb_build_object(
        'booking_id', new.id,
        'type', 'booking_accepted'
      )
    );
  end if;

  -- Case B: Booking completed
  if new.status = 'completed' and old.status <> 'completed' then
    insert into public.notifications (user_id, title, body, data)
    values (
      new.user_id,
      'Service Completed! ✅',
      'Your booking for ' || new.service_label || ' has been marked as completed. Please leave your feedback.',
      jsonb_build_object(
        'booking_id', new.id,
        'type', 'booking_completed'
      )
    );
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

drop trigger if exists on_booking_updated on public.bookings;
create trigger on_booking_updated
  after update on public.bookings
  for each row execute function public.handle_booking_update_notification();

-- --------------------------------------------------------
-- PROFILE READ-ONLY FIELDS SECURITY TRIGGER
-- --------------------------------------------------------

create or replace function public.protect_profile_readonly_fields()
returns trigger as $$
begin
  -- If the executing user is not an admin, revert changes to sensitive fields
  if not exists (
    select 1 from public.profiles 
    where id = auth.uid() and role = 'admin'
  ) then
    new.role := old.role;
    new.total_feedbacks := old.total_feedbacks;
    new.total_rating_sum := old.total_rating_sum;
    new.average_rating := old.average_rating;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

drop trigger if exists on_profile_updated_security on public.profiles;
create trigger on_profile_updated_security
  before update on public.profiles
  for each row execute function public.protect_profile_readonly_fields();

-- --------------------------------------------------------
-- ADDITIONAL PERFORMANCE INDEXES
-- --------------------------------------------------------

create index if not exists bookings_user_id_idx on public.bookings(user_id);
create index if not exists bookings_worker_id_idx on public.bookings(worker_id);
create index if not exists bookings_status_idx on public.bookings(status);
create index if not exists bookings_created_at_idx on public.bookings(created_at desc);

create index if not exists feedbacks_worker_id_idx on public.feedbacks(worker_id);
create index if not exists feedbacks_customer_id_idx on public.feedbacks(customer_id);

create index if not exists addresses_user_id_idx on public.addresses(user_id);
