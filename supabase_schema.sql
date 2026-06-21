-- ============================================================
-- xchodedos — Hire Purchase Car Management
-- Supabase Schema + RLS Policies
-- Run this in: Supabase Dashboard > SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUM TYPES
-- ============================================================
create type user_role as enum ('lead', 'driver', 'relationship_officer', 'super_admin');
create type lead_status as enum ('registered', 'test_scheduled', 'test_passed', 'test_failed', 'guarantors_pending', 'deposit_pending', 'approved', 'rejected');
create type car_status as enum ('available', 'assigned', 'maintenance', 'retired');
create type payment_status as enum ('pending', 'paid', 'overdue', 'partial');
create type check_status as enum ('pending', 'approved', 'declined');

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  email text not null,
  role user_role not null default 'lead',
  avatar_url text,
  id_number text,
  address text,
  date_of_birth date,
  emergency_contact text,
  emergency_phone text,
  assigned_officer_id uuid references profiles(id),
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- CARS / FLEET
-- ============================================================
create table cars (
  id uuid primary key default uuid_generate_v4(),
  make text not null,
  model text not null,
  year integer not null,
  color text,
  plate_number text unique not null,
  vin text unique,
  status car_status default 'available',
  daily_rate numeric(10,2),
  weekly_rate numeric(10,2),
  purchase_price numeric(12,2),
  mileage integer default 0,
  notes text,
  added_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- LEADS
-- ============================================================
create table leads (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references profiles(id) on delete cascade,
  status lead_status default 'registered',
  drive_test_date date,
  drive_test_score integer,
  drive_test_passed boolean,
  knowledge_test_date date,
  knowledge_test_score integer,
  knowledge_test_passed boolean,
  security_deposit numeric(10,2) default 0,
  deposit_paid boolean default false,
  deposit_paid_at timestamptz,
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- GUARANTORS
-- ============================================================
create table guarantors (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid references leads(id) on delete cascade,
  full_name text not null,
  phone text not null,
  email text,
  id_number text not null,
  address text,
  relationship text,
  id_document_url text,
  verified boolean default false,
  verified_by uuid references profiles(id),
  verified_at timestamptz,
  created_at timestamptz default now()
);

-- ============================================================
-- DRIVER ASSIGNMENTS (lead → driver with car)
-- ============================================================
create table driver_assignments (
  id uuid primary key default uuid_generate_v4(),
  driver_id uuid references profiles(id) on delete cascade,
  car_id uuid references cars(id),
  assigned_by uuid references profiles(id),
  assigned_at timestamptz default now(),
  unassigned_at timestamptz,
  is_active boolean default true,
  hire_start_date date not null,
  hire_end_date date,
  weekly_payment numeric(10,2) not null,
  notes text
);

-- ============================================================
-- PAYMENTS
-- ============================================================
create table payments (
  id uuid primary key default uuid_generate_v4(),
  driver_id uuid references profiles(id) on delete cascade,
  assignment_id uuid references driver_assignments(id),
  amount numeric(10,2) not null,
  week_starting date not null,
  status payment_status default 'pending',
  paid_at timestamptz,
  recorded_by uuid references profiles(id),
  payment_method text,
  reference text,
  notes text,
  created_at timestamptz default now()
);

-- ============================================================
-- DAILY PRE-USE CHECKS
-- ============================================================
create table pre_use_checks (
  id uuid primary key default uuid_generate_v4(),
  driver_id uuid references profiles(id) on delete cascade,
  car_id uuid references cars(id),
  check_date date not null default current_date,
  
  -- Check items (boolean)
  tyres_ok boolean default false,
  brakes_ok boolean default false,
  lights_ok boolean default false,
  mirrors_ok boolean default false,
  wipers_ok boolean default false,
  fuel_level text,
  oil_level text,
  water_level text,
  body_damage boolean default false,
  body_damage_notes text,
  interior_clean boolean default false,
  
  -- Odometer
  odometer_start integer,
  
  -- Driver notes
  driver_notes text,
  
  -- Approval
  status check_status default 'pending',
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  officer_notes text,
  
  submitted_at timestamptz default now()
);

-- ============================================================
-- OFFICER → DRIVER ASSIGNMENTS
-- ============================================================
create table officer_driver_assignments (
  id uuid primary key default uuid_generate_v4(),
  officer_id uuid references profiles(id) on delete cascade,
  driver_id uuid references profiles(id) on delete cascade,
  assigned_by uuid references profiles(id),
  assigned_at timestamptz default now(),
  is_active boolean default true,
  unique(officer_id, driver_id)
);

-- ============================================================
-- INDEXES
-- ============================================================
create index on profiles(role);
create index on profiles(assigned_officer_id);
create index on leads(profile_id);
create index on leads(status);
create index on driver_assignments(driver_id);
create index on driver_assignments(car_id);
create index on payments(driver_id);
create index on payments(week_starting);
create index on pre_use_checks(driver_id);
create index on pre_use_checks(check_date);
create index on pre_use_checks(status);
create index on officer_driver_assignments(officer_id);

-- ============================================================
-- AUTO-UPDATE updated_at
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated before update on profiles
  for each row execute function update_updated_at();
create trigger trg_cars_updated before update on cars
  for each row execute function update_updated_at();
create trigger trg_leads_updated before update on leads
  for each row execute function update_updated_at();

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'New User'),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'lead')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table profiles enable row level security;
alter table cars enable row level security;
alter table leads enable row level security;
alter table guarantors enable row level security;
alter table driver_assignments enable row level security;
alter table payments enable row level security;
alter table pre_use_checks enable row level security;
alter table officer_driver_assignments enable row level security;

-- Helper: get current user's role
create or replace function current_role_is(r user_role)
returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = r
  );
$$ language sql security definer;

-- PROFILES policies
create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);

create policy "Officers can view their drivers"
  on profiles for select using (
    current_role_is('relationship_officer') and
    exists (
      select 1 from officer_driver_assignments oda
      where oda.officer_id = auth.uid()
        and oda.driver_id = profiles.id
        and oda.is_active = true
    )
  );

create policy "Super admin can view all profiles"
  on profiles for select using (current_role_is('super_admin'));

create policy "Super admin can update all profiles"
  on profiles for update using (current_role_is('super_admin'));

create policy "Officers can update their own profile"
  on profiles for update using (auth.uid() = id);

create policy "Super admin can insert profiles"
  on profiles for insert with check (current_role_is('super_admin'));

-- CARS policies
create policy "Drivers can view their assigned car"
  on cars for select using (
    exists (
      select 1 from driver_assignments da
      where da.car_id = cars.id
        and da.driver_id = auth.uid()
        and da.is_active = true
    )
  );

create policy "Officers and admins can view all cars"
  on cars for select using (
    current_role_is('relationship_officer') or
    current_role_is('super_admin')
  );

create policy "Officers and admins can insert cars"
  on cars for insert with check (
    current_role_is('relationship_officer') or
    current_role_is('super_admin')
  );

create policy "Officers and admins can update cars"
  on cars for update using (
    current_role_is('relationship_officer') or
    current_role_is('super_admin')
  );

-- LEADS policies
create policy "Leads can view own record"
  on leads for select using (
    exists (select 1 from profiles where id = auth.uid() and profiles.id = leads.profile_id)
  );

create policy "Officers can view and manage leads they created"
  on leads for all using (
    current_role_is('relationship_officer') or
    current_role_is('super_admin')
  );

-- PAYMENTS policies
create policy "Drivers view own payments"
  on payments for select using (driver_id = auth.uid());

create policy "Officers manage payments"
  on payments for all using (
    current_role_is('relationship_officer') or
    current_role_is('super_admin')
  );

-- PRE-USE CHECKS policies
create policy "Drivers manage own checks"
  on pre_use_checks for all using (driver_id = auth.uid());

create policy "Officers can view and approve checks"
  on pre_use_checks for all using (
    current_role_is('relationship_officer') or
    current_role_is('super_admin')
  );

-- OFFICER_DRIVER_ASSIGNMENTS policies
create policy "Super admin manages officer-driver assignments"
  on officer_driver_assignments for all using (current_role_is('super_admin'));

create policy "Officers view their own assignments"
  on officer_driver_assignments for select using (officer_id = auth.uid());
