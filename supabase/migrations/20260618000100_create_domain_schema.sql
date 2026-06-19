create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;

revoke all on schema private from public;

create type public.app_role as enum ('admin', 'client');
create type public.payment_status as enum (
  'pending',
  'approved',
  'rejected',
  'cancelled',
  'refunded',
  'expired'
);
create type public.routine_status as enum ('draft', 'assigned', 'archived');
create type public.exercise_level as enum ('basic', 'intermediate', 'advanced');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_full_name_length check (char_length(full_name) <= 120),
  constraint profiles_phone_length check (char_length(phone) <= 30)
);

create table public.user_roles (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null default 'client',
  created_at timestamptz not null default now(),
  constraint user_roles_user_role_key unique (user_id, role)
);

create table public.packages (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10, 2) not null,
  currency text not null default 'MXN',
  duration_days integer not null,
  includes text[] not null default '{}',
  is_recommended boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint packages_name_length check (char_length(name) between 1 and 120),
  constraint packages_positive_price check (price > 0),
  constraint packages_currency_format check (currency ~ '^[A-Z]{3}$'),
  constraint packages_positive_duration check (duration_days > 0)
);

create table public.purchases (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  package_id uuid not null references public.packages (id) on delete restrict,
  package_name text not null,
  amount numeric(10, 2) not null,
  currency text not null default 'MXN',
  duration_days integer not null,
  payment_status public.payment_status not null default 'pending',
  mercado_pago_payment_id text,
  mercado_pago_preference_id text,
  start_date timestamptz,
  end_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint purchases_id_user_key unique (id, user_id),
  constraint purchases_positive_amount check (amount > 0),
  constraint purchases_currency_format check (currency ~ '^[A-Z]{3}$'),
  constraint purchases_positive_duration check (duration_days > 0),
  constraint purchases_valid_dates check (
    end_date is null
    or (start_date is not null and end_date > start_date)
  )
);

create unique index purchases_mercado_pago_payment_id_key
  on public.purchases (mercado_pago_payment_id)
  where mercado_pago_payment_id is not null;

create unique index purchases_mercado_pago_preference_id_key
  on public.purchases (mercado_pago_preference_id)
  where mercado_pago_preference_id is not null;

create table public.questionnaires (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  purchase_id uuid not null,
  objective text,
  age integer,
  weight numeric(5, 2),
  height numeric(5, 2),
  experience_level public.exercise_level,
  injuries text,
  medical_notes text,
  equipment_available text,
  training_place text,
  days_per_week integer,
  time_per_session integer,
  preferred_schedule text,
  limitations text,
  additional_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint questionnaires_purchase_key unique (purchase_id),
  constraint questionnaires_purchase_owner_fk
    foreign key (purchase_id, user_id)
    references public.purchases (id, user_id)
    on delete cascade,
  constraint questionnaires_age_range check (age between 13 and 100),
  constraint questionnaires_positive_weight check (weight > 0),
  constraint questionnaires_positive_height check (height > 0),
  constraint questionnaires_days_range check (days_per_week between 1 and 7),
  constraint questionnaires_session_range check (time_per_session between 10 and 360)
);

create table public.exercises (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null,
  category text,
  muscle_group text,
  level public.exercise_level,
  equipment text,
  description text,
  common_mistakes text,
  video_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exercises_name_length check (char_length(name) between 1 and 160),
  constraint exercises_video_path_format check (
    video_path is null or video_path ~ '^exercises/[0-9a-f-]{36}/[^/]+$'
  )
);

create unique index exercises_video_path_key
  on public.exercises (video_path)
  where video_path is not null;

create table public.routines (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  purchase_id uuid,
  name text not null,
  objective text,
  general_notes text,
  status public.routine_status not null default 'draft',
  assigned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint routines_name_length check (char_length(name) between 1 and 160),
  constraint routines_purchase_owner_fk
    foreign key (purchase_id, user_id)
    references public.purchases (id, user_id)
    on delete cascade,
  constraint routines_assigned_purchase check (
    status <> 'assigned' or purchase_id is not null
  ),
  constraint routines_assigned_timestamp check (
    status <> 'assigned' or assigned_at is not null
  )
);

create unique index routines_purchase_id_key
  on public.routines (purchase_id)
  where purchase_id is not null;

create table public.routine_days (
  id uuid primary key default extensions.gen_random_uuid(),
  routine_id uuid not null references public.routines (id) on delete cascade,
  day_number integer not null,
  title text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint routine_days_number_positive check (day_number > 0),
  constraint routine_days_title_length check (char_length(title) between 1 and 160),
  constraint routine_days_routine_number_key unique (routine_id, day_number)
);

create table public.routine_exercises (
  id uuid primary key default extensions.gen_random_uuid(),
  routine_day_id uuid not null references public.routine_days (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  order_index integer not null default 0,
  sets text,
  reps text,
  rest_seconds integer,
  tempo text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint routine_exercises_order_positive check (order_index >= 0),
  constraint routine_exercises_rest_positive check (rest_seconds is null or rest_seconds >= 0),
  constraint routine_exercises_day_order_key unique (routine_day_id, order_index)
);

create index user_roles_user_id_idx on public.user_roles (user_id);
create index purchases_user_id_created_at_idx on public.purchases (user_id, created_at desc);
create index purchases_package_id_idx on public.purchases (package_id);
create index purchases_payment_status_idx on public.purchases (payment_status);
create index questionnaires_user_id_idx on public.questionnaires (user_id);
create index routines_user_id_status_idx on public.routines (user_id, status);
create index routine_days_routine_id_idx on public.routine_days (routine_id);
create index routine_exercises_exercise_id_idx on public.routine_exercises (exercise_id);
