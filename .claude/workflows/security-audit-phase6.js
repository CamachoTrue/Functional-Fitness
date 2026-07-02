export const meta = {
  name: 'security-audit-phase6',
  description: 'Auditoría de seguridad multi-agente de la Fase 6 (Mercado Pago): revisa, verifica adversarialmente, auto-repara y revalida',
  phases: [
    { title: 'Auditoría', detail: 'revisores de seguridad con lentes distintos' },
    { title: 'Verificación', detail: 'confirmar/refutar cada hallazgo' },
    { title: 'Fix', detail: 'aplicar arreglos confirmados' },
    { title: 'Revalidación', detail: 'build + db:test + test:functions + e2e' },
  ],
}

const DIR = '/Users/camacho/Documents/Pagina Web Functional Fitness'
const MAX_ROUNDS = 2

const FINDINGS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['findings'],
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['severity', 'file', 'summary', 'exploit_scenario', 'proposed_fix'],
        properties: {
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          file: { type: 'string' },
          line: { type: 'integer' },
          summary: { type: 'string' },
          exploit_scenario: { type: 'string' },
          proposed_fix: { type: 'string' },
        },
      },
    },
  },
}

const VERDICT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['isReal', 'severity', 'reason'],
  properties: {
    isReal: { type: 'boolean' },
    severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
    reason: { type: 'string' },
  },
}

const FIX_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['applied'],
  properties: {
    applied: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['file', 'change'],
        properties: { file: { type: 'string' }, change: { type: 'string' } },
      },
    },
    skipped: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
  },
}

const GATE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['build', 'dbtest', 'functions', 'e2e'],
  properties: {
    build: { type: 'object', additionalProperties: false, required: ['passed', 'summary'], properties: { passed: { type: 'boolean' }, summary: { type: 'string' } } },
    dbtest: { type: 'object', additionalProperties: false, required: ['passed', 'summary'], properties: { passed: { type: 'boolean' }, summary: { type: 'string' } } },
    functions: { type: 'object', additionalProperties: false, required: ['passed', 'summary'], properties: { passed: { type: 'boolean' }, summary: { type: 'string' } } },
    e2e: { type: 'object', additionalProperties: false, required: ['passed', 'summary'], properties: { passed: { type: 'boolean' }, summary: { type: 'string' } } },
  },
}

const FILES = `Archivos de la Fase 6 a auditar:
- supabase/functions/create-payment-preference/index.ts
- supabase/functions/mercado-pago-webhook/index.ts
- supabase/functions/_shared/{signature,mercadoPago,supabaseAdmin,cors}.ts
- supabase/migrations/20260701000100_create_payment_events.sql
- supabase/migrations/20260618000300_create_rls_and_storage.sql (purchases/RLS)
- src/services/paymentService.js, src/composables/useCheckout.js
- src/views/public/PackageDetailView.vue, src/views/payment/*.vue, src/router/index.js`

const LENSES = [
  {
    key: 'webhook-signature-idempotency',
    focus:
      'Verificación de firma del webhook y idempotencia. ¿El manifest HMAC coincide con el mecanismo vigente de Mercado Pago (id;request-id;ts)? ¿Comparación en tiempo constante? ¿Se rechaza (401) firma inválida SIN tocar la compra? ¿Reintentos/duplicados o un approved tardío con distinto payment_id pueden re-activar o mover start_date? ¿Se confía alguna vez en el status del payload en vez de consultar la API de MP? ¿Puede un atacante forzar una aprobación sin firma válida?',
  },
  {
    key: 'preference-auth-snapshot',
    focus:
      'create-payment-preference: validación del JWT (no confiar en user_id del body), integridad del snapshot (amount/currency/duration SIEMPRE desde la tabla packages, nunca del body), IDOR (crear compra a nombre de otro usuario), paquetes inactivos, y que un error de MP no deje estados inconsistentes.',
  },
  {
    key: 'secrets-exposure-cors',
    focus:
      'Manejo de secretos y exposición de datos. ¿Algún secreto (SERVICE_ROLE_KEY, token de MP, webhook secret) puede filtrarse a logs, a payment_events.raw_payload, a respuestas de error o al bundle del frontend (VITE_*)? ¿CORS demasiado permisivo? ¿Mensajes de error que revelen detalles internos? ¿verify_jwt configurado correctamente (webhook false, preference true)?',
  },
  {
    key: 'rls-db-privileges',
    focus:
      'RLS y privilegios. payment_events y purchases: ¿puede un cliente leer/escribir lo que no debe, escalar a admin, o insertar/actualizar compras/eventos directamente? ¿La tabla payment_events expone datos sensibles a authenticated? ¿Grants mínimos? ¿La invariante de fechas y estados se respeta?',
  },
  {
    key: 'frontend-payment-trust',
    focus:
      'Confianza del frontend. ¿Las vistas /payment/* deducen el estado de la query de MP en vez de leer la compra desde la DB? ¿Open redirect en el return path? ¿Se expone algún dato de otra compra? ¿El CTA maneja errores y estados de carga sin dejar la UI rota?',
  },
]

const gatePrompt = `Eres el ejecutor de gates de un proyecto Vue 3 + Supabase en \`${DIR}\`. El dev server y Supabase local YA corren: NO los inicies/detengas.
Desde el directorio del proyecto, prepara el entorno y ejecuta los cuatro gates, capturando el resultado de cada uno:
1. \`export PATH="$HOME/.deno/bin:$PATH"\`
2. \`export SUPABASE_SERVICE_ROLE_KEY=$(npx supabase status 2>/dev/null | grep -iE 'service_role|secret' | grep -oE '(eyJ[A-Za-z0-9_.-]+|sb_secret_[A-Za-z0-9_-]+)' | head -1)\`
3. \`npm run build\`
4. \`npm run db:test\`
5. \`npm run test:functions\`  (Deno; requiere el PATH del paso 1)
6. \`npm run test:e2e\`  (con el service role del paso 2)
No canalices con \`| tail\` (enmascara el exit code); redirige a archivos y revísalos. Reporta passed y un resumen conciso por gate. NO modifiques archivos.`

function lensPrompt(lens, gate) {
  return `Eres un revisor de SEGURIDAD adversarial de un sistema de pagos (Vue 3 + Supabase Edge Functions + Mercado Pago) en \`${DIR}\`.
${FILES}

Tu lente específico: ${lens.focus}

Último resultado de gates: ${JSON.stringify(gate)}

Lee el código REAL de los archivos relevantes. Encuentra vulnerabilidades y defectos de seguridad reales y EXPLOTABLES en tu lente. Para cada hallazgo: severidad, archivo y línea, un escenario de explotación concreto, y un arreglo específico. Prioriza lo explotable/serio sobre nits de estilo. Si tu lente está sólido, devuelve findings vacío. NO arregles nada ahora.`
}

function verifyPrompt(finding) {
  return `Eres un verificador escéptico de seguridad. Un revisor reportó este hallazgo en el sistema de pagos en \`${DIR}\`:
${JSON.stringify(finding)}

Inspecciona el código/tests reales (léelos) y determina si es un defecto de seguridad REAL y EXPLOTABLE (no un falso positivo, no algo ya mitigado en otra capa, no un nit). Reevalúa la severidad. Si no puedes confirmar la explotabilidad con claridad, isReal=false. Devuelve tu veredicto.`
}

function fixPrompt(confirmed, gate) {
  return `Eres el ingeniero que corrige vulnerabilidades en el sistema de pagos en \`${DIR}\`. Aplica arreglos MÍNIMOS y correctos para estos hallazgos CONFIRMADOS, editando el working tree:
${JSON.stringify(confirmed)}

Contexto de gates: ${JSON.stringify(gate)}
Reglas: cambia solo lo necesario; respeta el estilo; migraciones Supabase forward-only (nueva migración si cambia el esquema; las de esta fase, 20260701*, aún no están commiteadas, así que puedes editarlas si el fix es sobre ellas); nunca introduzcas secretos en el bundle ni en logs; no rompas los contratos existentes; no corras build/tests (un gate los valida). Reporta cada archivo cambiado y qué cambiaste; si un hallazgo es inseguro/incorrecto, sáltalo y explica.`
}

function keyOf(f) {
  return `${f.file}::${(f.summary || '').slice(0, 60)}`
}

const history = []
let round = 0

while (round < MAX_ROUNDS) {
  round += 1

  phase('Auditoría')
  const gate0 = round === 1 ? { note: 'estado inicial ya verde según verificación previa' } : history[history.length - 1].gate
  const reviews = await parallel(
    LENSES.map((l) => () =>
      agent(lensPrompt(l, gate0), { schema: FINDINGS_SCHEMA, label: `audit:${l.key}`, phase: 'Auditoría' }),
    ),
  )

  const seen = new Set()
  const findings = []
  for (const r of reviews.filter(Boolean)) {
    for (const f of r.findings || []) {
      const k = keyOf(f)
      if (seen.has(k)) continue
      seen.add(k)
      findings.push(f)
    }
  }
  log(`Ronda ${round} — hallazgos de seguridad únicos: ${findings.length}`)

  if (findings.length === 0) {
    log('Sin hallazgos de seguridad. Fin.')
    history.push({ round, findings: 0, confirmed: 0, fixed: 0 })
    break
  }

  phase('Verificación')
  const verified = await parallel(
    findings.map((f) => () =>
      agent(verifyPrompt(f), { schema: VERDICT_SCHEMA, label: `verify:${f.severity}`, phase: 'Verificación' })
        .then((v) => ({ ...f, verdict: v })),
    ),
  )
  const confirmed = verified
    .filter(Boolean)
    .filter((f) => f.verdict?.isReal)
    .map((f) => ({ ...f, severity: f.verdict.severity || f.severity }))
  log(`Ronda ${round} — confirmados: ${confirmed.length}/${findings.length}`)

  if (confirmed.length === 0) {
    log('Ningún hallazgo confirmado como explotable. Fin.')
    history.push({ round, findings: findings.length, confirmed: 0, fixed: 0 })
    break
  }

  phase('Fix')
  const fix = await agent(fixPrompt(confirmed, gate0), { schema: FIX_SCHEMA, label: `fix:ronda${round}`, phase: 'Fix' })
  log(`Ronda ${round} — archivos corregidos: ${(fix.applied || []).length}`)

  phase('Revalidación')
  const gate = await agent(gatePrompt, { schema: GATE_SCHEMA, label: `gates:ronda${round}`, phase: 'Revalidación' })
  const green = gate.build.passed && gate.dbtest.passed && gate.functions.passed && gate.e2e.passed
  log(`Ronda ${round} — gates: ${green ? 'VERDE' : 'con fallos'}`)
  history.push({ round, findings: findings.length, confirmed: confirmed.length, fixed: (fix.applied || []).length, confirmedList: confirmed, fix, gate })
}

phase('Revalidación')
const finalGate = await agent(gatePrompt, { schema: GATE_SCHEMA, label: 'gates:final', phase: 'Revalidación' })
const finalGreen = finalGate.build.passed && finalGate.dbtest.passed && finalGate.functions.passed && finalGate.e2e.passed
log(`Gate final: ${finalGreen ? 'VERDE ✅' : 'con fallos ❌'}`)

return { rounds: round, finalGreen, finalGate, history }
