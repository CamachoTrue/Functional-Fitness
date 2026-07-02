begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

-- Usuarios: un cliente sin rol y un admin. Mismo patrón que 002_rls.test.sql.
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
    '40000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'pe-client@example.test',
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"PE Client"}',
    now(),
    now()
  ),
  (
    '40000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'pe-admin@example.test',
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"PE Admin"}',
    now(),
    now()
  );

insert into public.user_roles (user_id, role)
values ('40000000-0000-4000-8000-000000000002', 'admin');

insert into public.packages (id, name, price, duration_days, is_active)
values (
  '41000000-0000-4000-8000-000000000001',
  'Payment Events Package',
  600,
  30,
  true
);

-- Compra approved cuyo end_date = start_date + duration_days: debe respetar el
-- CHECK purchases_valid_dates (end_date > start_date). Es la invariante que el
-- webhook mantiene al aprobar. Se afirma con lives_ok más abajo.
insert into public.purchases (
  id,
  user_id,
  package_id,
  package_name,
  amount,
  duration_days,
  payment_status,
  mercado_pago_payment_id,
  start_date,
  end_date
)
values (
  '42000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  '41000000-0000-4000-8000-000000000001',
  'Payment Events Package',
  600,
  30,
  'approved',
  'MP-PAYMENT-0001',
  '2026-07-01T00:00:00Z',
  '2026-07-01T00:00:00Z'::timestamptz + (30 || ' days')::interval
);

-- Auditoría sembrada con service role (las escrituras reales van por la Edge
-- Function con service role; aquí simulamos ese registro para probar la lectura).
insert into public.payment_events (
  id,
  purchase_id,
  mercado_pago_payment_id,
  event_type,
  action,
  payment_status_received,
  signature_valid,
  processing_result,
  raw_payload
)
values (
  '43000000-0000-4000-8000-000000000001',
  '42000000-0000-4000-8000-000000000001',
  'MP-PAYMENT-0001',
  'payment',
  'payment.updated',
  'approved',
  true,
  'applied',
  '{"id":"MP-PAYMENT-0001","type":"payment","action":"payment.updated","status":"approved"}'::jsonb
);

-- 1) Estructura: la tabla existe.
select has_table(
  'public',
  'payment_events',
  'payment_events table exists'
);

-- 2) RLS habilitada sobre payment_events.
select is(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.payment_events'::regclass
  ),
  true,
  'payment_events has row level security enabled'
);

-- 3) Índice único parcial de idempotencia (payment_id, action).
select has_index(
  'public',
  'payment_events',
  'payment_events_dedup_key',
  'payment_events has the dedup unique index'
);

-- 4) La invariante de fechas del webhook: una compra approved con
--    end_date = start_date + duration_days respeta purchases_valid_dates.
--    (La inserción del setup ya la ejercitó; aquí la afirmamos con un update
--    idempotente que recalcula el end_date de la misma forma.)
select lives_ok(
  $$
    update public.purchases
    set end_date = start_date + (duration_days || ' days')::interval
    where id = '42000000-0000-4000-8000-000000000001'
  $$,
  'approved purchase with end_date = start_date + duration_days respects purchases_valid_dates'
);

-- Cliente autenticado sin rol admin.
set local role authenticated;
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000001', true);

-- 5) Un authenticated no-admin no ve ningún evento (revoke + no policy select).
select results_eq(
  $$select count(*) from public.payment_events$$,
  array[0::bigint],
  'authenticated non-admin reads zero payment events'
);

-- 6) authenticated no tiene GRANT INSERT sobre payment_events: falla en la capa
--    de privilegios (42501). Se afirma el SQLSTATE concreto para que un futuro
--    GRANT accidental no pase silenciosamente este test.
select throws_ok(
  $$
    insert into public.payment_events (signature_valid, processing_result)
    values (true, 'forged')
  $$,
  '42501',
  null::text,
  'authenticated non-admin cannot insert payment events'
);

-- Admin autenticado.
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000002', true);

-- 7) El admin sí puede leer los eventos (policy payment_events_admin_read).
select results_eq(
  $$select count(*) from public.payment_events$$,
  array[1::bigint],
  'admin reads payment events'
);

-- 8) El admin ve los metadatos correctos del evento (no hay secretos guardados).
select results_eq(
  $$
    select processing_result
    from public.payment_events
    where id = '43000000-0000-4000-8000-000000000001'
  $$,
  array['applied'],
  'admin reads the audited processing result'
);

-- 9) El admin tampoco tiene INSERT: las escrituras van solo por service role.
select throws_ok(
  $$
    insert into public.payment_events (signature_valid, processing_result)
    values (true, 'forged-by-admin')
  $$,
  '42501',
  null::text,
  'admin cannot insert payment events (writes go through service role only)'
);

select * from finish();
rollback;
