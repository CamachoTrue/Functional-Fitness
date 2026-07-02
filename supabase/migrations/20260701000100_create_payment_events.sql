-- Auditoría append-only del webhook de Mercado Pago.
-- Cada intento de procesamiento del webhook deja un registro aquí:
-- resultado de la verificación de firma, status recibido y desenlace.
-- raw_payload guarda SOLO metadatos no sensibles (id/status/type), nunca
-- secretos ni datos de tarjeta.

create table public.payment_events (
  id uuid primary key default extensions.gen_random_uuid(),
  purchase_id uuid references public.purchases (id) on delete set null,
  mercado_pago_payment_id text,
  event_type text,
  action text,
  payment_status_received text,
  signature_valid boolean not null,
  processing_result text,
  raw_payload jsonb,
  created_at timestamptz not null default now()
);

-- Idempotencia de auditoría: un único evento efectivo por (payment_id, action).
-- Parcial porque payment_id puede ser desconocido en payloads inválidos.
create unique index payment_events_dedup_key
  on public.payment_events (mercado_pago_payment_id, action)
  where mercado_pago_payment_id is not null;

create index payment_events_purchase_id_idx
  on public.payment_events (purchase_id);

alter table public.payment_events enable row level security;

revoke all on table public.payment_events from anon, authenticated;
grant all privileges on table public.payment_events to service_role;

-- El grant de tabla se evalúa ANTES que RLS: sin `select` para authenticated, la
-- policy de lectura del admin nunca aplica (daría permission denied). Con el
-- grant, RLS restringe las filas: solo el admin ve eventos; el resto ve cero.
grant select on table public.payment_events to authenticated;

-- Solo lectura para administradores autenticados; las escrituras pasan
-- exclusivamente por la Edge Function con service role.
create policy payment_events_admin_read
on public.payment_events
for select
to authenticated
using ((select private.is_admin()));
