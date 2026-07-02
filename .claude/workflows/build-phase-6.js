export const meta = {
  name: 'build-phase-6',
  description: 'Equipo de agentes construye la Fase 6 (Compras y Mercado Pago) con plan aprobado',
  phases: [
    { title: 'Backend-Core', detail: 'migración payment_events + utilidades compartidas + config' },
    { title: 'Backend-Functions', detail: 'create-payment-preference + webhook idempotente' },
    { title: 'Frontend', detail: 'paymentService, CTA de compra, vistas /payment/*' },
    { title: 'QA', detail: 'pgTAP + Deno tests + e2e + docs' },
  ],
}

const DIR = '/Users/camacho/Documents/Pagina Web Functional Fitness'

const CONVENTIONS = `Convenciones OBLIGATORIAS:
- Vue 3 Composition API con <script setup>; TailwindCSS v4 (verde solo acento).
- Acceso a Supabase SIEMPRE vía services en src/services/ (patrón packagesService.js/authService.js). Pinia solo sesión (authStore.js). Nunca importar supabase en componentes.
- Migraciones Supabase forward-only: crear NUEVAS con timestamp > 20260618000500 (usar prefijo 20260701...). Nunca editar aplicadas.
- Edge Functions en Deno (supabase/functions/). Secretos SOLO vía Deno.env, NUNCA en variables VITE_* ni en el bundle del frontend.
- Nombres en inglés, textos de UI en español. Reusar BaseButton/BaseCard/EmptyState/LoadingSpinner.
- pgTAP: plan(N) debe igualar EXACTO el número de asserts del archivo.
- Deno está instalado en ~/.deno/bin (puede no estar en PATH). No corras tests: el gate lo hará después.

REGLAS DE SEGURIDAD DE PAGOS (críticas, no violar):
- El snapshot de la compra (package_name/amount/currency/duration_days) sale de la tabla packages leída con service role, NUNCA del body del request.
- authenticated NO tiene INSERT/UPDATE en purchases; las escrituras van por Edge Function con service role.
- El webhook es la ÚNICA vía que aprueba una compra. Nunca aprobar por la URL de retorno.
- El webhook verifica la firma HMAC de MP y consulta el pago en la API de MP; nunca confía en el status del payload.
- Idempotencia: usar el índice único purchases_mercado_pago_payment_id_key + UPDATE condicionado (no re-activar una compra ya approved, no mover start_date en reintentos).
- El cliente de Mercado Pago debe ser una INTERFAZ inyectable (para tests sin credenciales reales); la lógica de negocio se separa del Deno.serve para poder importarla en tests.
- payment_events.raw_payload solo guarda metadatos no sensibles (id/status/type), nunca secretos ni datos de tarjeta.`

const plan = {
  summary:
    'Fase 6 — Compras y Mercado Pago. La tabla purchases ya existe con snapshot, índices únicos de MP y enum de estados. Se agrega tabla de auditoría payment_events, Edge Functions create-payment-preference y mercado-pago-webhook (firma + idempotencia + consulta a la API de MP), service y vistas de pago en el frontend, y cobertura pgTAP + Deno + e2e. Cliente MP inyectable para testear sin credenciales reales. Moneda MXN. Gestión admin de compras: solo lectura (RLS existente); edición vía Edge Function futura, fuera de alcance.',
  backendCore: [
    {
      title: 'Migración payment_events (auditoría del webhook)',
      details:
        "Crear supabase/migrations/20260701000100_create_payment_events.sql. Tabla public.payment_events: id uuid pk default extensions.gen_random_uuid(); purchase_id uuid references purchases(id) on delete set null (nullable); mercado_pago_payment_id text; event_type text; action text; payment_status_received text; signature_valid boolean not null; processing_result text; raw_payload jsonb (solo metadatos no sensibles); created_at timestamptz not null default now(). Índice único parcial payment_events_dedup_key on (mercado_pago_payment_id, action) where mercado_pago_payment_id is not null. Índice payment_events_purchase_id_idx on (purchase_id). enable row level security; revoke all from anon, authenticated; grant all privileges to service_role; policy payment_events_admin_read for select to authenticated using ((select private.is_admin())). Append-only: sin trigger updated_at.",
      files: ['supabase/migrations/20260701000100_create_payment_events.sql'],
      acceptance: [
        'npm run db:reset aplica la migración sin error',
        'RLS habilitada; authenticated no-admin no puede leer ni insertar; admin puede leer; índice único de dedup existe',
      ],
    },
    {
      title: 'Utilidades compartidas de Edge Functions',
      details:
        "Crear supabase/functions/_shared/: cors.ts (headers CORS: permitir APP_URL, POST/OPTIONS, headers authorization/content-type/apikey); supabaseAdmin.ts (factory que crea client con SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY desde Deno.env, lazy, no en import); mercadoPago.ts (interfaz MercadoPagoClient con createPreference(input) y getPayment(paymentId); impl real createHttpMercadoPagoClient(accessToken) que llama a https://api.mercadopago.com/checkout/preferences y /v1/payments/:id); signature.ts (verifyWebhookSignature({ xSignature, xRequestId, dataId, secret }) => boolean, pura: parsea 'ts=,v1=' de x-signature, arma manifest 'id:<dataId>;request-id:<xRequestId>;ts:<ts>;', HMAC-SHA256 con secret, compara en tiempo constante).",
      files: [
        'supabase/functions/_shared/cors.ts',
        'supabase/functions/_shared/supabaseAdmin.ts',
        'supabase/functions/_shared/mercadoPago.ts',
        'supabase/functions/_shared/signature.ts',
      ],
      acceptance: [
        'Los módulos no leen secretos en import (lazy dentro de funciones)',
        'MercadoPagoClient es una interfaz; ninguna lógica de negocio hace fetch a MP directamente',
        'verifyWebhookSignature es pura y usa comparación en tiempo constante',
      ],
    },
    {
      title: 'Config de funciones en config.toml',
      details:
        'Añadir a supabase/config.toml: [functions.create-payment-preference] con verify_jwt = true; [functions.mercado-pago-webhook] con verify_jwt = false (MP no envía JWT de Supabase; la autenticidad es por firma HMAC).',
      files: ['supabase/config.toml'],
      acceptance: ['Ambas funciones registradas; webhook con verify_jwt=false'],
    },
  ],
  backendFunctions: [
    {
      title: 'Edge Function create-payment-preference',
      details:
        "Crear supabase/functions/create-payment-preference/index.ts. Separar la lógica de negocio (exportada, con deps inyectables: mpClient y supabaseAdmin) del Deno.serve, para testear. Secuencia: OPTIONS→CORS; solo POST; extraer JWT del header Authorization y validar con auth.getUser() (client anon + header) → 401 si inválido; leer package_id del body (validar UUID); con service role leer packages (id,name,price,currency,duration_days,is_active) → 404/409 si no existe o inactivo; insertar purchases (service role) con user_id del JWT, snapshot desde el paquete, payment_status='pending', recuperar id; crear preferencia MP (items title=package_name, quantity=1, unit_price=amount, currency_id=currency; external_reference=purchase.id; back_urls a APP_URL/payment/success|failure|pending; auto_return='approved'; notification_url=SUPABASE_URL/functions/v1/mercado-pago-webhook); guardar mercado_pago_preference_id; responder { init_point, purchase_id }. Errores sin filtrar detalles internos.",
      files: ['supabase/functions/create-payment-preference/index.ts'],
      acceptance: [
        'Sin JWT válido → 401 y NO se crea compra',
        'package inexistente/inactivo → error y NO se crea compra',
        'Con datos válidos → purchase pending con snapshot del paquete + preference_id + respuesta con init_point',
        'El monto sale del paquete aunque el body mande un amount manipulado',
      ],
    },
    {
      title: 'Edge Function mercado-pago-webhook',
      details:
        "Crear supabase/functions/mercado-pago-webhook/index.ts (lógica de negocio exportada e inyectable). Secuencia: POST; leer x-signature, x-request-id y data.id; verificar firma (verifyWebhookSignature con MERCADO_PAGO_WEBHOOK_SECRET) → si inválida: registrar payment_events(signature_valid=false, processing_result='signature_invalid') y responder 401; solo tipos 'payment' (otros → registrar 'ignored_type', 200); getPayment(payment_id) contra la API de MP (nunca confiar en el payload) → 404: registrar 'payment_not_found', 200; obtener external_reference (=purchase_id) y status; localizar compra (service role) → no existe: 'purchase_not_found', 200; idempotencia: si ya tiene ese mercado_pago_payment_id y el estado ya refleja → 'duplicate_ignored', 200; mapear estado: approved→approved + start_date=now() + end_date=start_date + (duration_days||' days')::interval (UPDATE condicionado a payment_status<>'approved' para no re-activar/mover fechas), rejected→rejected, cancelled→cancelled, refunded/charged_back→refunded, pending/in_process→pending; registrar SIEMPRE payment_events con processing_result y raw_payload filtrado; responder 200 salvo firma inválida (401) o error interno inesperado (500 para que MP reintente).",
      files: ['supabase/functions/mercado-pago-webhook/index.ts'],
      acceptance: [
        'Firma inválida → 401, compra intacta, evento signature_invalid',
        'Pago approved → compra approved, start_date≈now, end_date=start+duration_days, evento applied',
        'Reenvío del mismo approved → sin cambios, start_date estable, evento duplicate/stale',
        'rejected → compra rejected sin fechas; external_reference inexistente → 200 sin excepción',
      ],
    },
  ],
  frontend: [
    {
      title: 'paymentService.js',
      details:
        "Crear src/services/paymentService.js. createPaymentPreference(packageId): supabase.functions.invoke('create-payment-preference', { body: { package_id: packageId } }); si error throw; devolver { initPoint, purchaseId }. fetchPurchaseById(purchaseId): supabase.from('purchases').select('id, package_name, amount, currency, payment_status, start_date, end_date, created_at').eq('id', purchaseId).maybeSingle(); throw en error; null si no existe/visible. No importar supabase fuera del service.",
      files: ['src/services/paymentService.js'],
      acceptance: ['createPaymentPreference devuelve initPoint y lanza en error; fetchPurchaseById lanza en error y null si no hay fila'],
    },
    {
      title: 'Conectar el CTA de compra en PackageDetailView',
      details:
        "Modificar src/views/public/PackageDetailView.vue. Mantener la rama sin sesión (redirige a login con redirect). Con sesión: llamar createPaymentPreference(props.id) con estado local purchasing (ref) y purchaseError (mensaje español); en éxito window.location.assign(initPoint) (redirección externa, no router.push). BaseButton :disabled=purchasing y texto 'Redirigiendo…'. Mostrar error en español sin romper la vista. Opcional: composable useCheckout.js.",
      files: ['src/views/public/PackageDetailView.vue'],
      acceptance: [
        'Sin sesión sigue redirigiendo a login (no romper e2e existente)',
        'Con sesión el botón entra en carga y navega al init_point; con error muestra mensaje español',
      ],
    },
    {
      title: 'Rutas y vistas /payment/success|failure|pending',
      details:
        "Crear vistas en src/views/payment/ (recomendado: un PaymentResultView.vue parametrizado por meta.status para no triplicar). Modificar src/router/index.js: agregar bajo PublicLayout las rutas payment/success (name payment-success), payment/failure, payment/pending. Las vistas NO activan nada: leen external_reference (=purchase_id) de la query y usan fetchPurchaseById para mostrar payment_status desde la DB (nunca deducir de la query). LoadingSpinner al cargar; si sigue pending mostrar 'estamos confirmando tu pago' + recargar; enlaces a /client/dashboard y /packages. No forzar guard que rompa el retorno (sesión posiblemente perdida → estado neutro + enlace a login).",
      files: [
        'src/views/payment/PaymentResultView.vue',
        'src/router/index.js',
      ],
      acceptance: [
        'Las 3 rutas resuelven y renderizan',
        'Muestran payment_status desde la DB, no desde la query; estados de carga/error cubiertos; sin import directo de supabase',
      ],
    },
  ],
  qa: [
    {
      title: 'pgTAP payment_events',
      details:
        'Crear supabase/tests/database/004_payment_events.test.sql (patrón de 002_rls.test.sql; plan(N) exacto). Afirmar: tabla con RLS; authenticated no-admin lee 0 y throws_ok 42501 al insertar; admin puede leer; índice único de dedup existe (has_index); invariante de fechas: una compra approved con end_date=start_date+duration_days respeta purchases_valid_dates.',
      files: ['supabase/tests/database/004_payment_events.test.sql'],
      acceptance: ['npm run db:test pasa incluyendo el archivo nuevo con plan(N) correcto'],
    },
    {
      title: 'Deno tests de las Edge Functions (MP mockeado)',
      details:
        "Crear supabase/functions/create-payment-preference/index.test.ts, supabase/functions/mercado-pago-webhook/index.test.ts y supabase/functions/_shared/signature.test.ts. Usar deno test e inyectar un MercadoPagoClient falso y un doble del client supabase admin (sin API real ni credenciales). Casos create-preference: sin JWT→401; package inexistente→error; body con amount manipulado→snapshot del paquete; happy→pending+preference_id+init_point. Casos webhook: firma inválida→401 sin cambios; approved→approved con fechas; reenvío→sin re-activar (start_date estable); rejected→rejected; external_reference desconocido→200 sin excepción. signature: manifest firmado con el secreto valida, hash alterado falla. Añadir a package.json script test:functions = 'deno test --allow-env --allow-net --allow-read supabase/functions/' (deno en ~/.deno/bin; documentar). NO encadenar en verify (deno puede no estar en CI).",
      files: [
        'supabase/functions/create-payment-preference/index.test.ts',
        'supabase/functions/mercado-pago-webhook/index.test.ts',
        'supabase/functions/_shared/signature.test.ts',
        'package.json',
      ],
      acceptance: [
        'Los tests corren sin MERCADO_PAGO_ACCESS_TOKEN real (todo mockeado)',
        'El test de idempotencia demuestra que un reenvío no mueve start_date',
      ],
    },
    {
      title: 'e2e checkout + docs + gitignore',
      details:
        "Crear tests/e2e/checkout.spec.js (reusar helpers.js): (1) sin sesión en /package/:id, click 'Quiero este plan' → /login?redirect=...; (2) con sesión, interceptar la invocación a la Edge Function con page.route() devolviendo init_point fake y verificar intento de navegación / estado de carga y error (route 502 → mensaje español, stubbear window.location.assign); (3) /payment/success?external_reference=<uuid> con compra sembrada approved (via service role si hasServiceRole, si no skip como el camino admin) muestra estado approved desde la DB, y con pending muestra 'confirmando'. Documentar en docs/environments-and-deployment.md y docs/testing-and-harness.md los secretos (supabase secrets set MERCADO_PAGO_ACCESS_TOKEN/MERCADO_PAGO_WEBHOOK_SECRET/APP_URL) y el modo local (supabase functions serve --env-file). Añadir a .gitignore: supabase/functions/.env y supabase/functions/.env.local. Añadir a .env.example (comentados) los nombres, aclarando que nunca llevan prefijo VITE_.",
      files: [
        'tests/e2e/checkout.spec.js',
        'docs/environments-and-deployment.md',
        'docs/testing-and-harness.md',
        '.gitignore',
        '.env.example',
      ],
      acceptance: [
        'e2e existentes siguen verdes; los nuevos no dependen de MP real',
        'La doc permite levantar y probar las funciones en local sin credenciales reales; ningún secreto en Git ni en VITE_*',
      ],
    },
  ],
}

const BUILD_RESULT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['created', 'modified', 'notes'],
  properties: {
    created: { type: 'array', items: { type: 'string' } },
    modified: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
  },
}

function builderPrompt(role, tasks, priorContext) {
  return `Eres el desarrollador ${role} del proyecto Vue 3 + Supabase + Mercado Pago en \`${DIR}\`.
${CONVENTIONS}

Plan aprobado (resumen): ${plan.summary}
${priorContext ? `Trabajo ya realizado por etapas previas: ${JSON.stringify(priorContext)}` : ''}

Implementa ESTAS tareas, creando/editando archivos reales en el working tree:
${JSON.stringify(tasks)}

Reglas: cíñete a tus tareas; reusa lo existente; código limpio y terminado (sin placeholders) que cumpla los criterios de aceptación y las reglas de seguridad de pagos. No corras build ni tests. Al terminar reporta archivos creados/modificados y notas (incluye cualquier decisión o riesgo).`
}

phase('Backend-Core')
const core = await agent(builderPrompt('BACKEND (migraciones + utilidades compartidas + config)', plan.backendCore), {
  schema: BUILD_RESULT_SCHEMA,
  label: 'backend-core',
  phase: 'Backend-Core',
})
log(`Backend-Core: +${core.created.length} nuevos, ${core.modified.length} modificados`)

phase('Backend-Functions')
const functions = await agent(builderPrompt('BACKEND (Edge Functions de pago)', plan.backendFunctions, core), {
  schema: BUILD_RESULT_SCHEMA,
  label: 'backend-functions',
  phase: 'Backend-Functions',
})
log(`Backend-Functions: +${functions.created.length} nuevos, ${functions.modified.length} modificados`)

phase('Frontend')
const frontend = await agent(builderPrompt('FRONTEND', plan.frontend, { core, functions }), {
  schema: BUILD_RESULT_SCHEMA,
  label: 'frontend-dev',
  phase: 'Frontend',
})
log(`Frontend: +${frontend.created.length} nuevos, ${frontend.modified.length} modificados`)

phase('QA')
const qa = await agent(builderPrompt('QA (pruebas y documentación)', plan.qa, { core, functions, frontend }), {
  schema: BUILD_RESULT_SCHEMA,
  label: 'qa-tests',
  phase: 'QA',
})
log(`QA: +${qa.created.length} nuevos`)

return { phaseTitle: 'Fase 6', core, functions, frontend, qa }
