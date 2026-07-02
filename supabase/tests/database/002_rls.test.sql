begin;

create extension if not exists pgtap with schema extensions;

select plan(46);

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
  ),
  (
    '22000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000001',
    '21000000-0000-4000-8000-000000000001',
    'RLS Test Package',
    500,
    30,
    'pending',
    now(),
    now() + interval '30 days'
  ),
  (
    '22000000-0000-4000-8000-000000000004',
    '20000000-0000-4000-8000-000000000001',
    '21000000-0000-4000-8000-000000000001',
    'RLS Test Package',
    500,
    30,
    'approved',
    now(),
    now() + interval '30 days'
  );

insert into public.packages (
  id,
  name,
  price,
  duration_days,
  is_active
)
values (
  '21000000-0000-4000-8000-000000000002',
  'RLS Inactive Package',
  700,
  30,
  false
);

insert into public.exercises (id, name, level, video_path)
values
  (
    '23000000-0000-4000-8000-000000000001',
    'RLS Test Squat',
    'basic',
    'exercises/23000000-0000-4000-8000-000000000001/squat.mp4'
  ),
  (
    '23000000-0000-4000-8000-000000000002',
    'RLS Draft Exercise',
    'basic',
    'exercises/23000000-0000-4000-8000-000000000002/draft.mp4'
  );

-- Objetos del bucket privado exercise-videos: uno ligado a la rutina assigned
-- del cliente A y otro ligado a una rutina en 'draft' (no debe ser legible).
insert into storage.objects (bucket_id, name)
values
  ('exercise-videos', 'exercises/23000000-0000-4000-8000-000000000001/squat.mp4'),
  ('exercise-videos', 'exercises/23000000-0000-4000-8000-000000000002/draft.mp4');

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

-- Rutina en 'draft' del cliente A que referencia el ejercicio con video draft.
-- Su video NO debe ser legible aunque pertenezca al mismo cliente.
insert into public.routines (id, user_id, name, status)
values (
  '24000000-0000-4000-8000-000000000002',
  '20000000-0000-4000-8000-000000000001',
  'RLS Draft Routine',
  'draft'
);

insert into public.routine_days (id, routine_id, day_number, title)
values (
  '25000000-0000-4000-8000-000000000002',
  '24000000-0000-4000-8000-000000000002',
  1,
  'Draft Day'
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
  '26000000-0000-4000-8000-000000000002',
  '25000000-0000-4000-8000-000000000002',
  '23000000-0000-4000-8000-000000000002',
  0,
  '3',
  '10'
);

-- Rutina en 'draft' del cliente A, sin compra asociada, reservada para ejercitar
-- el disparador private.validate_assigned_routine en la seccion admin.
insert into public.routines (id, user_id, name, status)
values (
  '24000000-0000-4000-8000-000000000003',
  '20000000-0000-4000-8000-000000000001',
  'RLS Trigger Routine',
  'draft'
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
  array[3::bigint],
  'client reads only their own purchases'
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

-- El CHECK questionnaires_age_range (age between 13 and 100) protege el dominio:
-- un valor fuera de rango debe lanzar 23514 aunque la compra sea approved del
-- propio cliente. Se usa la compra approved '...0004' (aun sin cuestionario).
select throws_ok(
  $$
    insert into public.questionnaires (user_id, purchase_id, objective, age)
    values (
      '20000000-0000-4000-8000-000000000001',
      '22000000-0000-4000-8000-000000000004',
      'Improve conditioning',
      5
    )
  $$,
  '23514',
  null::text,
  'questionnaire rejects an age outside the allowed range'
);

-- questionnaires_create_own_approved_purchase exige que la compra este approved:
-- crear el cuestionario de una compra pending del propio cliente debe fallar el
-- WITH CHECK de la politica (sin escalar el estado de la compra).
select throws_ok(
  $$
    insert into public.questionnaires (user_id, purchase_id, objective)
    values (
      '20000000-0000-4000-8000-000000000001',
      '22000000-0000-4000-8000-000000000003',
      'Improve conditioning'
    )
  $$,
  '42501',
  null::text,
  'client cannot create a questionnaire for a pending purchase'
);

-- Un cliente no puede crear el cuestionario de la compra de OTRO cliente: la
-- politica de insert (user_id = auth.uid() + compra propia approved) y la FK
-- compuesta (purchase_id,user_id) lo impiden.
select throws_ok(
  $$
    insert into public.questionnaires (user_id, purchase_id, objective)
    values (
      '20000000-0000-4000-8000-000000000001',
      '22000000-0000-4000-8000-000000000002',
      'Improve conditioning'
    )
  $$,
  null::text,
  null::text,
  'client cannot create a questionnaire for another client purchase'
);

-- authenticated no tiene GRANT INSERT sobre user_roles: la promoción falla en la
-- capa de privilegios (42501) antes incluso de evaluar RLS. Se afirma el SQLSTATE
-- concreto para que un futuro GRANT INSERT sin política restrictiva no pase
-- silenciosamente este test.
select throws_ok(
  $$
    insert into public.user_roles (user_id, role)
    values ('20000000-0000-4000-8000-000000000001', 'admin')
  $$,
  '42501',
  null::text,
  'client cannot promote themselves to admin'
);

-- packages_read_active filtra using(is_active): el cliente solo debe ver el
-- paquete activo, nunca el inactivo (borradores/planes retirados).
select results_eq(
  $$
    select count(*) from public.packages
    where id in (
      '21000000-0000-4000-8000-000000000001',
      '21000000-0000-4000-8000-000000000002'
    )
  $$,
  array[1::bigint],
  'client reads only active packages'
);

select results_eq(
  $$select count(*) from public.packages where id = '21000000-0000-4000-8000-000000000002'$$,
  array[0::bigint],
  'client cannot read an inactive package'
);

-- Videos privados (storage.objects / bucket exercise-videos): el cliente A solo
-- debe poder leer el objeto ligado a un ejercicio de SU rutina assigned.
select results_eq(
  $$
    select count(*) from storage.objects
    where bucket_id = 'exercise-videos'
      and name = 'exercises/23000000-0000-4000-8000-000000000001/squat.mp4'
  $$,
  array[1::bigint],
  'client reads the video of an exercise in their assigned routine'
);

select results_eq(
  $$
    select count(*) from storage.objects
    where bucket_id = 'exercise-videos'
      and name = 'exercises/23000000-0000-4000-8000-000000000002/draft.mp4'
  $$,
  array[0::bigint],
  'client cannot read the video of an exercise in a draft routine'
);

select throws_ok(
  $$
    insert into storage.objects (bucket_id, name)
    values ('exercise-videos', 'exercises/23000000-0000-4000-8000-000000000001/hacked.mp4')
  $$,
  '42501',
  null::text,
  'client cannot upload exercise videos'
);

-- Frontera de escritura admin-only: un client NO debe poder escribir en las tablas
-- administrativas. Para INSERT, el WITH CHECK de la política *_admin_write falla y
-- lanza 42501. Para UPDATE/DELETE el USING no coincide, así que no hay excepción:
-- se verifica que 0 filas resultan afectadas (sin escalada de privilegios).
select throws_ok(
  $$insert into public.exercises (name, level) values ('Hacked Exercise', 'basic')$$,
  '42501',
  null::text,
  'client cannot insert exercises'
);

select throws_ok(
  $$insert into public.packages (name, price, duration_days, is_active) values ('Hacked Package', 1, 1, true)$$,
  '42501',
  null::text,
  'client cannot insert packages'
);

select throws_ok(
  $$
    insert into public.routines (user_id, purchase_id, name, status)
    values (
      '20000000-0000-4000-8000-000000000001',
      '22000000-0000-4000-8000-000000000001',
      'Hacked Routine',
      'draft'
    )
  $$,
  '42501',
  null::text,
  'client cannot insert routines'
);

select throws_ok(
  $$
    insert into public.routine_days (routine_id, day_number, title)
    values ('24000000-0000-4000-8000-000000000001', 2, 'Hacked Day')
  $$,
  '42501',
  null::text,
  'client cannot insert routine days'
);

select throws_ok(
  $$
    insert into public.routine_exercises (routine_day_id, exercise_id, order_index, sets, reps)
    values (
      '25000000-0000-4000-8000-000000000001',
      '23000000-0000-4000-8000-000000000001',
      1,
      '3',
      '10'
    )
  $$,
  '42501',
  null::text,
  'client cannot insert routine exercises'
);

with attempted as (
  update public.exercises set name = 'Hacked' returning 1
)
select is(
  (select count(*)::bigint from attempted),
  0::bigint,
  'client cannot update exercises'
);

with attempted as (
  update public.packages set name = 'Hacked' returning 1
)
select is(
  (select count(*)::bigint from attempted),
  0::bigint,
  'client cannot update packages'
);

with attempted as (
  update public.routines set name = 'Hacked' returning 1
)
select is(
  (select count(*)::bigint from attempted),
  0::bigint,
  'client cannot update routines'
);

with attempted as (
  update public.routine_days set title = 'Hacked' returning 1
)
select is(
  (select count(*)::bigint from attempted),
  0::bigint,
  'client cannot update routine days'
);

with attempted as (
  update public.routine_exercises set sets = '99' returning 1
)
select is(
  (select count(*)::bigint from attempted),
  0::bigint,
  'client cannot update routine exercises'
);

with attempted as (
  delete from public.exercises returning 1
)
select is(
  (select count(*)::bigint from attempted),
  0::bigint,
  'client cannot delete exercises'
);

with attempted as (
  delete from public.routines returning 1
)
select is(
  (select count(*)::bigint from attempted),
  0::bigint,
  'client cannot delete routines'
);

with attempted as (
  delete from public.routine_days returning 1
)
select is(
  (select count(*)::bigint from attempted),
  0::bigint,
  'client cannot delete routine days'
);

with attempted as (
  delete from public.routine_exercises returning 1
)
select is(
  (select count(*)::bigint from attempted),
  0::bigint,
  'client cannot delete routine exercises'
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

select results_eq(
  $$
    select count(*) from storage.objects
    where bucket_id = 'exercise-videos'
      and name = 'exercises/23000000-0000-4000-8000-000000000001/squat.mp4'
  $$,
  array[0::bigint],
  'another client cannot read the video of that routine'
);

-- questionnaires_read_own_or_admin: el cliente B no debe ver el cuestionario que
-- el cliente A creo para su compra approved.
select results_eq(
  $$select count(*) from public.questionnaires$$,
  array[0::bigint],
  'another client cannot read the questionnaire of client A'
);

-- Visitante anonimo: packages_read_active se concede tambien a anon, que solo
-- debe ver paquetes activos.
reset role;
set local role anon;

select results_eq(
  $$
    select count(*) from public.packages
    where id in (
      '21000000-0000-4000-8000-000000000001',
      '21000000-0000-4000-8000-000000000002'
    )
  $$,
  array[1::bigint],
  'anon reads only active packages'
);

select results_eq(
  $$select count(*) from public.packages where id = '21000000-0000-4000-8000-000000000002'$$,
  array[0::bigint],
  'anon cannot read an inactive package'
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

-- Acotado a las rutinas del cliente A sembradas por el test: demuestra que el
-- admin lee rutinas de OTRO usuario, sin acoplarse al total global (los e2e con
-- service role dejan rutinas commiteadas en la base local).
select results_eq(
  $$
    select count(*) from public.routines
    where user_id = '20000000-0000-4000-8000-000000000001'
  $$,
  array[3::bigint],
  'admin reads all routines'
);

select lives_ok(
  $$
    insert into public.exercises (name, level)
    values ('Admin Test Exercise', 'intermediate')
  $$,
  'admin can create exercises'
);

-- Acotado al admin sembrado por el test: RLS permite al admin leer roles
-- administrativos. No se cuenta el total global de admins para no acoplar el test
-- a datos que los e2e (promoteToAdmin) puedan dejar commiteados en la base local.
select results_eq(
  $$
    select count(*) from public.user_roles
    where role = 'admin'
      and user_id = '20000000-0000-4000-8000-000000000003'
  $$,
  array[1::bigint],
  'admin can read administrative roles'
);

-- Videos privados: el admin ve cualquier objeto del bucket y puede subir bajo
-- el prefijo exercises/.
select results_eq(
  $$
    select count(*) from storage.objects
    where bucket_id = 'exercise-videos'
      and name in (
        'exercises/23000000-0000-4000-8000-000000000001/squat.mp4',
        'exercises/23000000-0000-4000-8000-000000000002/draft.mp4'
      )
  $$,
  array[2::bigint],
  'admin reads every exercise video'
);

select lives_ok(
  $$
    insert into storage.objects (bucket_id, name)
    values ('exercise-videos', 'exercises/23000000-0000-4000-8000-000000000001/admin.mp4')
  $$,
  'admin can upload exercise videos'
);

-- Disparador private.validate_assigned_routine: una rutina 'assigned' exige una
-- compra 'approved' del mismo cliente y gestiona assigned_at.
select throws_ok(
  $$
    update public.routines
    set status = 'assigned', purchase_id = '22000000-0000-4000-8000-000000000003'
    where id = '24000000-0000-4000-8000-000000000003'
  $$,
  'An assigned routine requires an approved purchase owned by the client.',
  'cannot assign a routine backed by a non-approved purchase'
);

select throws_ok(
  $$
    update public.routines
    set status = 'assigned', purchase_id = '22000000-0000-4000-8000-000000000002'
    where id = '24000000-0000-4000-8000-000000000003'
  $$,
  'An assigned routine requires an approved purchase owned by the client.',
  'cannot assign a routine backed by another client purchase'
);

select lives_ok(
  $$
    update public.routines
    set status = 'assigned', purchase_id = '22000000-0000-4000-8000-000000000004'
    where id = '24000000-0000-4000-8000-000000000003'
  $$,
  'can assign a routine backed by an approved purchase of the same client'
);

select isnt(
  (
    select assigned_at
    from public.routines
    where id = '24000000-0000-4000-8000-000000000003'
  ),
  null,
  'assigning a routine populates assigned_at'
);

select lives_ok(
  $$
    update public.routines
    set status = 'draft'
    where id = '24000000-0000-4000-8000-000000000003'
  $$,
  'can unassign a routine back to draft'
);

select is(
  (
    select assigned_at
    from public.routines
    where id = '24000000-0000-4000-8000-000000000003'
  ),
  null,
  'unassigning a routine clears assigned_at'
);

select * from finish();
rollback;
