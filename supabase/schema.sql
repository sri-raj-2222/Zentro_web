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
$$ language plpgsql security definer;

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
