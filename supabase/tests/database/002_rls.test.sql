begin;

create extension if not exists pgtap with schema extensions;

select plan(13);

insert into auth.users (
  id,
  aud,
  role,
  email,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '20000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'client-a@example.test',
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Client A"}',
    now(),
    now()
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'client-b@example.test',
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Client B"}',
    now(),
    now()
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    'authenticated',
    'authenticated',
    'admin@example.test',
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Admin"}',
    now(),
    now()
  );

insert into public.user_roles (user_id, role)
values ('20000000-0000-4000-8000-000000000003', 'admin');

insert into public.packages (
  id,
  name,
  price,
  duration_days,
  is_active
)
values (
  '21000000-0000-4000-8000-000000000001',
  'RLS Test Package',
  500,
  30,
  true
);

insert into public.purchases (
  id,
  user_id,
  package_id,
  package_name,
  amount,
  duration_days,
  payment_status,
  start_date,
  end_date
)
values
  (
    '22000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    '21000000-0000-4000-8000-000000000001',
    'RLS Test Package',
    500,
    30,
    'approved',
    now(),
    now() + interval '30 days'
  ),
  (
    '22000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    '21000000-0000-4000-8000-000000000001',
    'RLS Test Package',
    500,
    30,
    'approved',
    now(),
    now() + interval '30 days'
  );

insert into public.exercises (id, name, level)
values (
  '23000000-0000-4000-8000-000000000001',
  'RLS Test Squat',
  'basic'
);

insert into public.routines (
  id,
  user_id,
  purchase_id,
  name,
  status
)
values (
  '24000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '22000000-0000-4000-8000-000000000001',
  'RLS Test Routine',
  'assigned'
);

insert into public.routine_days (id, routine_id, day_number, title)
values (
  '25000000-0000-4000-8000-000000000001',
  '24000000-0000-4000-8000-000000000001',
  1,
  'Day 1'
);

insert into public.routine_exercises (
  id,
  routine_day_id,
  exercise_id,
  order_index,
  sets,
  reps
)
values (
  '26000000-0000-4000-8000-000000000001',
  '25000000-0000-4000-8000-000000000001',
  '23000000-0000-4000-8000-000000000001',
  0,
  '4',
  '12'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);

select results_eq(
  $$select count(*) from public.profiles$$,
  array[1::bigint],
  'client reads only their profile'
);

select results_eq(
  $$select count(*) from public.purchases$$,
  array[1::bigint],
  'client reads only their purchase'
);

select results_eq(
  $$select count(*) from public.routines$$,
  array[1::bigint],
  'client reads their assigned routine'
);

select results_eq(
  $$select count(*) from public.exercises$$,
  array[1::bigint],
  'client reads an exercise assigned through their routine'
);

select lives_ok(
  $$
    insert into public.questionnaires (user_id, purchase_id, objective)
    values (
      '20000000-0000-4000-8000-000000000001',
      '22000000-0000-4000-8000-000000000001',
      'Improve conditioning'
    )
  $$,
  'client creates a questionnaire for their approved purchase'
);

select throws_ok(
  $$
    insert into public.user_roles (user_id, role)
    values ('20000000-0000-4000-8000-000000000001', 'admin')
  $$,
  null::char(5),
  null::text,
  'client cannot promote themselves to admin'
);

select ok(
  (select count(*) > 0 from public.packages),
  'client reads active packages'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', true);

select results_eq(
  $$select count(*) from public.routines$$,
  array[0::bigint],
  'another client cannot read the assigned routine'
);

select results_eq(
  $$select count(*) from public.exercises$$,
  array[0::bigint],
  'another client cannot read exercises from that routine'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000003', true);

select results_eq(
  $$
    select count(*)
    from public.profiles
    where id in (
      '20000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000002',
      '20000000-0000-4000-8000-000000000003'
    )
  $$,
  array[3::bigint],
  'admin reads all client profiles'
);

select results_eq(
  $$select count(*) from public.routines$$,
  array[1::bigint],
  'admin reads all routines'
);

select lives_ok(
  $$
    insert into public.exercises (name, level)
    values ('Admin Test Exercise', 'intermediate')
  $$,
  'admin can create exercises'
);

select results_eq(
  $$select count(*) from public.user_roles where role = 'admin'$$,
  array[1::bigint],
  'admin can read administrative roles'
);

select * from finish();
rollback;
