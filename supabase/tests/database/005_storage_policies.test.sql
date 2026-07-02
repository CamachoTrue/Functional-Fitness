begin;

create extension if not exists pgtap with schema extensions;

-- Políticas del bucket privado exercise-videos (storage.objects). Complementa
-- 002_rls con un archivo enfocado en las 4 fronteras de acceso a los videos:
--   - INSERT: solo admin bajo el prefijo exercises/ (exercise_videos_admin_insert).
--   - SELECT admin: cualquier objeto del bucket (exercise_videos_admin_read).
--   - SELECT cliente: solo el objeto de un ejercicio de SU rutina 'assigned'
--     (exercise_videos_client_read_assigned -> private.can_access_exercise_video).
-- El plan debe igualar el número de asserts (6): un off-by-one hace fallar todo
-- el archivo.
select plan(6);

-- Usuarios: dos clientes y un admin. Ids con prefijo 50/53 para no colisionar con
-- otros archivos de test aunque compartan la transacción de db:test.
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
    '50000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'storage-client-a@example.test',
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Storage Client A"}',
    now(),
    now()
  ),
  (
    '50000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'storage-client-b@example.test',
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Storage Client B"}',
    now(),
    now()
  ),
  (
    '50000000-0000-4000-8000-000000000003',
    'authenticated',
    'authenticated',
    'storage-admin@example.test',
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Storage Admin"}',
    now(),
    now()
  );

insert into public.user_roles (user_id, role)
values ('50000000-0000-4000-8000-000000000003', 'admin');

-- Paquete y compra approved del cliente A (necesarios para una rutina 'assigned').
insert into public.packages (id, name, price, duration_days, is_active)
values ('51000000-0000-4000-8000-000000000001', 'Storage Test Package', 500, 30, true);

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
values (
  '52000000-0000-4000-8000-000000000001',
  '50000000-0000-4000-8000-000000000001',
  '51000000-0000-4000-8000-000000000001',
  'Storage Test Package',
  500,
  30,
  'approved',
  now(),
  now() + interval '30 days'
);

-- Dos ejercicios con video: uno en la rutina assigned del cliente A, otro en una
-- rutina draft (no debe ser legible por el cliente).
insert into public.exercises (id, name, level, video_path)
values
  (
    '53000000-0000-4000-8000-000000000001',
    'Storage Assigned Exercise',
    'basic',
    'exercises/53000000-0000-4000-8000-000000000001/assigned.mp4'
  ),
  (
    '53000000-0000-4000-8000-000000000002',
    'Storage Draft Exercise',
    'basic',
    'exercises/53000000-0000-4000-8000-000000000002/draft.mp4'
  );

insert into storage.objects (bucket_id, name)
values
  ('exercise-videos', 'exercises/53000000-0000-4000-8000-000000000001/assigned.mp4'),
  ('exercise-videos', 'exercises/53000000-0000-4000-8000-000000000002/draft.mp4');

-- Rutina assigned del cliente A que referencia el ejercicio con video assigned.
insert into public.routines (id, user_id, purchase_id, name, status)
values (
  '54000000-0000-4000-8000-000000000001',
  '50000000-0000-4000-8000-000000000001',
  '52000000-0000-4000-8000-000000000001',
  'Storage Assigned Routine',
  'assigned'
);

insert into public.routine_days (id, routine_id, day_number, title)
values (
  '55000000-0000-4000-8000-000000000001',
  '54000000-0000-4000-8000-000000000001',
  1,
  'Day 1'
);

insert into public.routine_exercises (id, routine_day_id, exercise_id, order_index, sets, reps)
values (
  '56000000-0000-4000-8000-000000000001',
  '55000000-0000-4000-8000-000000000001',
  '53000000-0000-4000-8000-000000000001',
  0,
  '4',
  '12'
);

-- Rutina draft del cliente A que referencia el ejercicio con video draft.
insert into public.routines (id, user_id, name, status)
values (
  '54000000-0000-4000-8000-000000000002',
  '50000000-0000-4000-8000-000000000001',
  'Storage Draft Routine',
  'draft'
);

insert into public.routine_days (id, routine_id, day_number, title)
values (
  '55000000-0000-4000-8000-000000000002',
  '54000000-0000-4000-8000-000000000002',
  1,
  'Draft Day'
);

insert into public.routine_exercises (id, routine_day_id, exercise_id, order_index, sets, reps)
values (
  '56000000-0000-4000-8000-000000000002',
  '55000000-0000-4000-8000-000000000002',
  '53000000-0000-4000-8000-000000000002',
  0,
  '3',
  '10'
);

-- ------------------------------------------------------------------
-- Cliente A: solo lee el objeto de su rutina assigned.
-- ------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claim.sub', '50000000-0000-4000-8000-000000000001', true);

select results_eq(
  $$
    select count(*) from storage.objects
    where bucket_id = 'exercise-videos'
      and name = 'exercises/53000000-0000-4000-8000-000000000001/assigned.mp4'
  $$,
  array[1::bigint],
  'client reads the video of an exercise in their assigned routine'
);

select results_eq(
  $$
    select count(*) from storage.objects
    where bucket_id = 'exercise-videos'
      and name = 'exercises/53000000-0000-4000-8000-000000000002/draft.mp4'
  $$,
  array[0::bigint],
  'client cannot read the video of an exercise in a draft routine'
);

-- exercise_videos_admin_insert exige is_admin(): un cliente no-admin no puede
-- insertar objetos en el bucket (WITH CHECK falla -> 42501).
select throws_ok(
  $$
    insert into storage.objects (bucket_id, name)
    values ('exercise-videos', 'exercises/53000000-0000-4000-8000-000000000001/hacked.mp4')
  $$,
  '42501',
  null::text,
  'non-admin client cannot upload exercise videos'
);

-- ------------------------------------------------------------------
-- Cliente B: no lee el video de la rutina assigned del cliente A.
-- ------------------------------------------------------------------
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '50000000-0000-4000-8000-000000000002', true);

select results_eq(
  $$
    select count(*) from storage.objects
    where bucket_id = 'exercise-videos'
      and name = 'exercises/53000000-0000-4000-8000-000000000001/assigned.mp4'
  $$,
  array[0::bigint],
  'another client cannot read the video of that assigned routine'
);

-- ------------------------------------------------------------------
-- Admin: lee cualquier objeto del bucket y puede subir bajo exercises/.
-- ------------------------------------------------------------------
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '50000000-0000-4000-8000-000000000003', true);

select results_eq(
  $$
    select count(*) from storage.objects
    where bucket_id = 'exercise-videos'
      and name in (
        'exercises/53000000-0000-4000-8000-000000000001/assigned.mp4',
        'exercises/53000000-0000-4000-8000-000000000002/draft.mp4'
      )
  $$,
  array[2::bigint],
  'admin reads every exercise video in the bucket'
);

select lives_ok(
  $$
    insert into storage.objects (bucket_id, name)
    values ('exercise-videos', 'exercises/53000000-0000-4000-8000-000000000003/admin.mp4')
  $$,
  'admin can upload an exercise video under the exercises/ prefix'
);

select * from finish();
rollback;
