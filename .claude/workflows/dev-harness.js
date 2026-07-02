export const meta = {
  name: 'dev-harness',
  description: 'Arnés multi-agente: audita frontend/backend/QA, verifica y auto-arregla en un loop hasta quedar verde',
  whenToUse: 'Al final de cada fase, o para auditar y auto-reparar el estado actual del código',
  phases: [
    { title: 'Gates', detail: 'build + db:test + e2e' },
    { title: 'Auditoría', detail: 'frontend, backend/DB y QA en paralelo' },
    { title: 'Verificación', detail: 'validación adversarial de cada hallazgo' },
    { title: 'Fix', detail: 'aplicar arreglos confirmados al working tree' },
    { title: 'Revalidación', detail: 'volver a correr los gates' },
  ],
}

const DIR = '/Users/camacho/Documents/Pagina Web Functional Fitness'
const MAX_ROUNDS = 3

const GATE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['build', 'dbtest', 'e2e'],
  properties: {
    build: {
      type: 'object',
      additionalProperties: false,
      required: ['passed', 'summary'],
      properties: { passed: { type: 'boolean' }, summary: { type: 'string' } },
    },
    dbtest: {
      type: 'object',
      additionalProperties: false,
      required: ['passed', 'summary'],
      properties: { passed: { type: 'boolean' }, summary: { type: 'string' } },
    },
    e2e: {
      type: 'object',
      additionalProperties: false,
      required: ['passed', 'summary'],
      properties: {
        passed: { type: 'boolean' },
        summary: { type: 'string' },
        failures: { type: 'array', items: { type: 'string' } },
      },
    },
  },
}

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
        required: ['severity', 'file', 'summary', 'failure_scenario', 'proposed_fix'],
        properties: {
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          file: { type: 'string' },
          line: { type: 'integer' },
          summary: { type: 'string' },
          failure_scenario: { type: 'string' },
          proposed_fix: { type: 'string' },
        },
      },
    },
  },
}

const VERDICT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['isReal', 'reason'],
  properties: { isReal: { type: 'boolean' }, reason: { type: 'string' } },
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

const gatePrompt = `Eres el ejecutor de gates de calidad de un proyecto Vue 3 + Supabase ubicado en \`${DIR}\`.
El dev server (http://localhost:5173) y Supabase local (http://127.0.0.1:54321) YA están corriendo: NO los inicies ni los detengas.
Desde el directorio del proyecto, ejecuta estos tres comandos y captura el resultado de cada uno:
1. \`npm run build\`
2. \`npm run db:test\`
3. \`npm run test:e2e\`
Reporta para cada comando si pasó (passed) y un resumen conciso. Para e2e, lista en \`failures\` los nombres de las pruebas que fallen.
NO modifiques ningún archivo. Devuelve solo el resultado estructurado.`

function finderPrompt(domain, scope, gate) {
  return `Auditas el dominio ${domain} de un proyecto Vue 3 + Supabase en \`${DIR}\`.
Alcance: ${scope}
Resultado más reciente de los gates: ${JSON.stringify(gate)}

Lee el código REAL y encuentra defectos reales y problemas de alto valor en tu dominio: bugs, flujos rotos, lógica incorrecta de auth/guards/RLS, errores de estado, manejo faltante de errores/carga que rompa la UX, problemas de seguridad, y cualquier causa de un fallo de gate/e2e en tu dominio.
Sé preciso: cita archivo y línea, da un escenario de fallo concreto y un arreglo específico propuesto.
Prefiere pocos hallazgos de alta confianza sobre muchos especulativos. NO arregles nada ahora. Si el dominio está sólido, devuelve findings vacío.`
}

const DOMAINS = [
  {
    key: 'frontend',
    scope:
      'src/ — components, views, layouts, router (guards, redirecciones por rol), stores (Pinia: authStore), services (supabaseClient, authService), composables. Correctitud de flujos de login/registro/logout, recuperación de sesión y protección de rutas.',
  },
  {
    key: 'backend/DB',
    scope:
      'supabase/ — migraciones, tipos, restricciones, índices, triggers (perfil/rol/updated_at), funciones security definer (is_admin, can_access_*), políticas RLS, políticas de Storage y seed. Seguridad y correctitud del modelo de datos.',
  },
  {
    key: 'qa',
    scope:
      'tests/e2e (Playwright) y supabase/tests (pgTAP). Cobertura y correctitud de las pruebas, casos críticos faltantes, aserciones débiles o falsos positivos, y validez del flujo de punta a punta.',
  },
]

function verifyPrompt(finding) {
  return `Eres un verificador escéptico. Un agente de dominio reportó este hallazgo en el proyecto \`${DIR}\`:
${JSON.stringify(finding)}

Inspecciona de forma independiente el código/tests reales (léelos) y determina si es un defecto REAL y accionable: no un falso positivo, no un detalle de estilo, no algo ya cubierto en otro lugar.
Si no puedes confirmarlo con claridad, responde isReal=false. Devuelve tu veredicto.`
}

function fixPrompt(confirmed, gate) {
  return `Eres el agente de arreglos del proyecto \`${DIR}\`. Aplica arreglos MÍNIMOS y correctos para estos hallazgos CONFIRMADOS, editando archivos en el working tree:
${JSON.stringify(confirmed)}

Contexto de gates: ${JSON.stringify(gate)}

Reglas:
- Cambia solo lo necesario; respeta el estilo del código existente.
- No agregues dependencias nuevas salvo que sea imprescindible.
- No toques código no relacionado.
- Las migraciones de Supabase son forward-only: si un arreglo requiere cambio de esquema, crea una migración NUEVA (no edites una ya aplicada) e indícalo en notes (puede requerir \`npm run db:reset\`). Prefiere arreglos que no cambien el esquema.
- No corras build ni tests (un gate separado los valida después).
Al terminar, reporta cada archivo cambiado y qué cambiaste. Si un hallazgo es inseguro o incorrecto, sáltalo (skipped) y explica por qué.`
}

function keyOf(f) {
  return `${f.file}::${(f.summary || '').slice(0, 60)}`
}

// ── Loop principal ────────────────────────────────────────────────────────────
const history = []
let round = 0
let lastGate = null

while (round < MAX_ROUNDS) {
  round += 1

  phase('Gates')
  const gate = await agent(gatePrompt, {
    schema: GATE_SCHEMA,
    label: `gates:ronda${round}`,
    phase: 'Gates',
  })
  lastGate = gate
  const gatesGreen = gate.build.passed && gate.dbtest.passed && gate.e2e.passed
  log(
    `Ronda ${round} — gates: build ${gate.build.passed ? 'OK' : 'FALLA'}, db:test ${gate.dbtest.passed ? 'OK' : 'FALLA'}, e2e ${gate.e2e.passed ? 'OK' : 'FALLA'}`,
  )

  phase('Auditoría')
  const finderResults = await parallel(
    DOMAINS.map((d) => () =>
      agent(finderPrompt(d.key, d.scope, gate), {
        schema: FINDINGS_SCHEMA,
        label: `find:${d.key}`,
        phase: 'Auditoría',
      }),
    ),
  )

  const seen = new Set()
  const findings = []
  for (const res of finderResults.filter(Boolean)) {
    for (const f of res.findings || []) {
      const k = keyOf(f)
      if (seen.has(k)) continue
      seen.add(k)
      findings.push(f)
    }
  }
  log(`Ronda ${round} — hallazgos únicos: ${findings.length}`)

  if (gatesGreen && findings.length === 0) {
    log('Verde y sin hallazgos. Fin del loop.')
    break
  }

  phase('Verificación')
  const verified = await parallel(
    findings.map((f) => () =>
      agent(verifyPrompt(f), { schema: VERDICT_SCHEMA, label: `verify:${f.file}`, phase: 'Verificación' })
        .then((v) => ({ ...f, verdict: v })),
    ),
  )
  const confirmed = verified.filter(Boolean).filter((f) => f.verdict?.isReal)
  log(`Ronda ${round} — hallazgos confirmados: ${confirmed.length}/${findings.length}`)

  if (gatesGreen && confirmed.length === 0) {
    log('Gates verdes y sin hallazgos confirmados. Fin del loop.')
    history.push({ round, gatesGreen, findings: findings.length, confirmed: 0, fixed: 0 })
    break
  }

  phase('Fix')
  const fix = await agent(fixPrompt(confirmed, gate), {
    schema: FIX_SCHEMA,
    label: `fix:ronda${round}`,
    phase: 'Fix',
  })
  log(`Ronda ${round} — archivos arreglados: ${(fix.applied || []).length}`)
  history.push({
    round,
    gatesGreen,
    findings: findings.length,
    confirmed: confirmed.length,
    fixed: (fix.applied || []).length,
    fix,
  })
}

// ── Revalidación final ──────────────────────────────────────────────────────
phase('Revalidación')
const finalGate = await agent(gatePrompt, { schema: GATE_SCHEMA, label: 'gates:final', phase: 'Revalidación' })
const finalGreen = finalGate.build.passed && finalGate.dbtest.passed && finalGate.e2e.passed
log(`Gate final: ${finalGreen ? 'VERDE ✅' : 'con fallos ❌'}`)

return { rounds: round, finalGreen, finalGate, history }
