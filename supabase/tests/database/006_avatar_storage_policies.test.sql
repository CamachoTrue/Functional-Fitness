begin;

create extension if not exists pgtap with schema extensions;

-- Políticas del bucket privado `avatars` (storage.objects) + grant de la columna
-- profiles.avatar_path. Añadido por la migración 20260703000100. Modelo
-- dueño-por-carpeta: el path (relativo al bucket) es `<uid>/<archivo>`, así que
-- (storage.foldername(name))[1] es el uid del dueño. Cubre las fronteras:
--   - INSERT: el cliente solo bajo su propia carpeta (avatars_owner_insert).
--   - SELECT: el cliente solo su carpeta; el admin todo el bucket
--     (avatars_owner_or_admin_read).
--   - GRANT: el cliente puede escribir su propia profiles.avatar_path.
-- El DELETE (avatars_owner_delete) no se prueba aquí porque storage.protect_delete()
-- bloquea el DELETE directo sobre storage.objects (obliga a usar la Storage API);
-- la ruta de borrado se ejercita vía removeAvatar() en el flujo de la app.
-- El plan debe igualar el número de asserts (6): un off-by-one hace fallar todo.
select plan(6);

-- Dos clientes y un admin. Ids con prefijo 60 para no colisionar con otros
-- archivos de test. El trigger private.handle_new_user() crea automáticamente la
-- fila en public.profiles al insertar en auth.users, así que NO se insertan a mano.
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
    '60000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'avatar-client-a@example.test',
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Avatar Client A"}',
    now(),
    now()
  ),
  (
    '60000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'avatar-client-b@example.test',
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Avatar Client B"}',
    now(),
    now()
  ),
  (
    '60000000-0000-4000-8000-000000000003',
    'authenticated',
    'authenticated',
    'avatar-admin@example.test',
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Avatar Admin"}',
    now(),
    now()
  );

insert into public.user_roles (user_id, role)
values ('60000000-0000-4000-8000-000000000003', 'admin');

-- ------------------------------------------------------------------
-- Cliente A: escribe y lee solo bajo su propia carpeta.
-- ------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000001', true);

-- avatars_owner_insert: A sube su avatar bajo <A>/.
select lives_ok(
  $$
    insert into storage.objects (bucket_id, name)
    values ('avatars', '60000000-0000-4000-8000-000000000001/me.png')
  $$,
  'client uploads an avatar under their own folder'
);

-- avatars_owner_insert: A NO puede subir bajo la carpeta de B (WITH CHECK -> 42501).
select throws_ok(
  $$
    insert into storage.objects (bucket_id, name)
    values ('avatars', '60000000-0000-4000-8000-000000000002/hack.png')
  $$,
  '42501',
  null::text,
  'client cannot upload an avatar under another user''s folder'
);

-- avatars_owner_or_admin_read: A lee su propio avatar.
select results_eq(
  $$
    select count(*) from storage.objects
    where bucket_id = 'avatars'
      and name = '60000000-0000-4000-8000-000000000001/me.png'
  $$,
  array[1::bigint],
  'client reads their own avatar'
);

-- ------------------------------------------------------------------
-- Cliente B: no lee el avatar del cliente A.
-- ------------------------------------------------------------------
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000002', true);

select results_eq(
  $$
    select count(*) from storage.objects
    where bucket_id = 'avatars'
      and name = '60000000-0000-4000-8000-000000000001/me.png'
  $$,
  array[0::bigint],
  'another client cannot read that avatar'
);

-- ------------------------------------------------------------------
-- Admin: lee cualquier avatar del bucket.
-- ------------------------------------------------------------------
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000003', true);

select results_eq(
  $$
    select count(*) from storage.objects
    where bucket_id = 'avatars'
      and name = '60000000-0000-4000-8000-000000000001/me.png'
  $$,
  array[1::bigint],
  'admin reads any avatar in the bucket'
);

-- ------------------------------------------------------------------
-- Cliente A: escribe su avatar_path en profiles.
-- ------------------------------------------------------------------
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000001', true);

-- grant update (avatar_path): A puede persistir su avatar_path en su propia fila.
-- Verifica que el grant de columna de la migración incluye avatar_path.
select lives_ok(
  $$
    update public.profiles
    set avatar_path = '60000000-0000-4000-8000-000000000001/me.png'
    where id = '60000000-0000-4000-8000-000000000001'
  $$,
  'client can write avatar_path on their own profile'
);

select * from finish();
rollback;
