begin;

create extension if not exists pgtap with schema extensions;

-- Policies del bucket PÚBLICO `package-covers` (storage.objects) + escritura de
-- packages.cover_path. Añadido por la migración 20260717000100. El bucket es
-- público (lectura para todos, incluido anon) y la escritura la restringe la RLS
-- a admin (private.is_admin()). Cubre las fronteras:
--   - INSERT: solo admin (package_covers_admin_insert); un cliente NO puede.
--   - SELECT: público, incluido el rol anon (package_covers_public_read).
--   - cover_path: el admin puede escribirlo en packages (grant de tabla + policy
--     packages_admin_all).
-- El plan debe igualar el número de asserts (4): un off-by-one hace fallar todo.
select plan(4);

-- Un admin y un cliente. Ids con prefijo 70 para no colisionar con otros tests.
insert into auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    '70000000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'cover-admin@example.test',
    '{"provider":"email","providers":["email"]}', '{"full_name":"Cover Admin"}', now(), now()
  ),
  (
    '70000000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'cover-client@example.test',
    '{"provider":"email","providers":["email"]}', '{"full_name":"Cover Client"}', now(), now()
  );

insert into public.user_roles (user_id, role)
values ('70000000-0000-4000-8000-000000000001', 'admin');

-- Paquete para probar la escritura de cover_path.
insert into public.packages (id, name, price, duration_days, is_active)
values ('71000000-0000-4000-8000-000000000001', 'Cover Test Package', 100, 30, true);

-- ------------------------------------------------------------------
-- Admin: sube una portada (INSERT en el bucket).
-- ------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$
    insert into storage.objects (bucket_id, name)
    values ('package-covers', 'test-admin/cover.jpg')
  $$,
  'admin can upload a package cover'
);

-- Admin escribe cover_path en el paquete (grant de tabla + policy admin).
select lives_ok(
  $$
    update public.packages
    set cover_path = 'test-admin/cover.jpg'
    where id = '71000000-0000-4000-8000-000000000001'
  $$,
  'admin can write cover_path on a package'
);

-- ------------------------------------------------------------------
-- Cliente (no admin): NO puede subir portadas (WITH CHECK -> 42501).
-- ------------------------------------------------------------------
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000002', true);

select throws_ok(
  $$
    insert into storage.objects (bucket_id, name)
    values ('package-covers', 'test-client/hack.jpg')
  $$,
  '42501',
  null::text,
  'non-admin client cannot upload a package cover'
);

-- ------------------------------------------------------------------
-- Anónimo: lectura PÚBLICA de las portadas.
-- ------------------------------------------------------------------
reset role;
set local role anon;

select results_eq(
  $$
    select count(*) from storage.objects
    where bucket_id = 'package-covers'
      and name = 'test-admin/cover.jpg'
  $$,
  array[1::bigint],
  'anonymous visitor can read package covers (public bucket)'
);

select * from finish();
rollback;
