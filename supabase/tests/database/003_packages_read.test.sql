begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

-- Este test cubre el catálogo público de paquetes (Fase 5): la lectura anónima
-- vía la policy packages_read_active y el grant `select` a anon. Se ejecuta con
-- `supabase test db` contra la base local, que ya fue reseteada con el seed
-- (3 paquetes, todos con is_active=true). El rollback final deja todo intacto.

-- IDs de los paquetes del seed (supabase/seed.sql).
-- 10000000-...-0001 => 'Plan Basico'         (activo)
-- 10000000-...-0002 => 'Plan Personalizado'  (activo, recomendado)
-- 10000000-...-0003 => 'Plan Premium'        (activo)

-- Precondición (como rol de setup con privilegios): confirmar que el seed dejó
-- los 3 paquetes esperados y todos activos, para que las aserciones anónimas
-- sean significativas y no falsos positivos.
select results_eq(
  $$
    select count(*) from public.packages
    where id in (
      '10000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002',
      '10000000-0000-4000-8000-000000000003'
    )
  $$,
  array[3::bigint],
  'setup: the seed provides the 3 catalog packages'
);

select results_eq(
  $$
    select count(*) from public.packages
    where id in (
      '10000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002',
      '10000000-0000-4000-8000-000000000003'
    )
    and is_active
  $$,
  array[3::bigint],
  'setup: the 3 seed packages are active'
);

-- Insertar un paquete inactivo como rol de setup (bypassa RLS) para verificar
-- que el catálogo anónimo lo excluye. Se le da un id propio para aislarlo.
insert into public.packages (
  id,
  name,
  price,
  duration_days,
  is_active
)
values (
  '10000000-0000-4000-8000-0000000000ff',
  'Plan Inactivo (test)',
  1234,
  30,
  false
);

-- A partir de aquí, todo se ejecuta como visitante anónimo (rol anon), tal como
-- el frontend público consulta Supabase con la anon key.
set local role anon;

-- (1) anon ve los 3 paquetes activos del seed.
select results_eq(
  $$
    select count(*) from public.packages
    where id in (
      '10000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002',
      '10000000-0000-4000-8000-000000000003'
    )
  $$,
  array[3::bigint],
  'anon reads the 3 active seed packages'
);

-- Y ve los nombres esperados (aserción fuerte por contenido, no solo por conteo).
select results_eq(
  $$
    select name from public.packages
    where id in (
      '10000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002',
      '10000000-0000-4000-8000-000000000003'
    )
    order by name
  $$,
  $$values ('Plan Basico'), ('Plan Personalizado'), ('Plan Premium')$$,
  'anon reads the expected active package names'
);

-- (2) anon NO ve el paquete inactivo insertado en setup.
select results_eq(
  $$
    select count(*) from public.packages
    where id = '10000000-0000-4000-8000-0000000000ff'
  $$,
  array[0::bigint],
  'anon cannot read an inactive package'
);

-- (3) anon no puede escribir en packages: solo tiene GRANT SELECT, así que
-- INSERT falla en la capa de privilegios (42501) antes de evaluar RLS.
select throws_ok(
  $$
    insert into public.packages (name, price, duration_days, is_active)
    values ('Anon Hacked Package', 1, 1, true)
  $$,
  '42501',
  null::text,
  'anon cannot insert packages'
);

select throws_ok(
  $$
    update public.packages
    set name = 'Anon Hacked'
    where id = '10000000-0000-4000-8000-000000000001'
  $$,
  '42501',
  null::text,
  'anon cannot update packages'
);

select throws_ok(
  $$
    delete from public.packages
    where id = '10000000-0000-4000-8000-000000000001'
  $$,
  '42501',
  null::text,
  'anon cannot delete packages'
);

select * from finish();
rollback;
