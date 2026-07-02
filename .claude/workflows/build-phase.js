export const meta = {
  name: 'build-phase',
  description: 'Equipo de agentes: planner + backend + frontend + QA construyen una fase, con arnés de verificación anidado',
  whenToUse: 'Construir una fase completa con roles especializados. Pasa args.spec para planear; tras aprobar, args.approvedPlan para construir.',
  phases: [
    { title: 'Planificación', detail: 'el planner reparte el trabajo por dominio' },
    { title: 'Backend', detail: 'migraciones, RLS y services de Supabase' },
    { title: 'Frontend', detail: 'components, views, stores, router' },
    { title: 'QA', detail: 'escribe pruebas e2e + pgTAP de la fase' },
    { title: 'Verificación', detail: 'arnés dev-harness anidado (verifica + auto-repara)' },
  ],
}

const DIR = '/Users/camacho/Documents/Pagina Web Functional Fitness'
const spec = (args && args.spec) || ''
const phaseTitle = (args && args.phaseTitle) || 'Fase'
const approvedPlan = (args && args.approvedPlan) || null

const CONVENTIONS = `Convenciones OBLIGATORIAS del proyecto:
- Vue 3 + Vite + Composition API con <script setup>. Nunca Options API.
- TailwindCSS v4 (utilidades ya definidas: page-container, focus-ring; colores brand-green, ink, surface-muted).
- Vue Router para rutas; Pinia solo para estado global (ya existe stores/authStore.js).
- Acceso a Supabase SIEMPRE vía un service en src/services/ (existe supabaseClient.js y authService.js). No mezclar llamadas a Supabase dentro de componentes grandes.
- Reusar componentes base existentes: BaseButton, BaseCard, BaseInput, EmptyState, LoadingSpinner.
- Nombres en inglés para archivos/variables/funciones; textos visibles en español.
- Estética premium/minimalista: blanco, negro, gris; verde SOLO como acento (recomendado, activos, checks).
- RLS ya permite lectura anónima de packages activos. Paleta y modelo de datos en docs/technical-decisions.md y docs/database.md.
- Componentes limpios y modulares; separar views, components, services, composables, stores.`

const PLAN_TASK = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'details', 'files', 'acceptance'],
  properties: {
    title: { type: 'string' },
    details: { type: 'string' },
    files: { type: 'array', items: { type: 'string' } },
    acceptance: { type: 'array', items: { type: 'string' } },
  },
}

const PLAN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'backend', 'frontend', 'qa', 'risks'],
  properties: {
    summary: { type: 'string' },
    backend: { type: 'array', items: PLAN_TASK },
    frontend: { type: 'array', items: PLAN_TASK },
    qa: { type: 'array', items: PLAN_TASK },
    risks: { type: 'array', items: { type: 'string' } },
  },
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

function plannerPrompt() {
  return `Eres el PLANNER de un proyecto Vue 3 + Supabase en \`${DIR}\`.
Lee el estado ACTUAL del código (src/, supabase/, docs/) para no duplicar lo existente.
${CONVENTIONS}

Debes planear esta fase: "${phaseTitle}".
Especificación de la fase:
${spec}

Produce un plan accionable dividido por dominio (backend, frontend, qa). Para cada tarea da: título, detalles concretos, archivos a crear/modificar (rutas reales) y criterios de aceptación verificables. Ordena las tareas respetando dependencias (backend antes que frontend). Lista riesgos. NO escribas código todavía: solo el plan.`
}

function builderPrompt(domain, tasks, plan, priorContext) {
  return `Eres el desarrollador ${domain.toUpperCase()} del proyecto Vue 3 + Supabase en \`${DIR}\`.
${CONVENTIONS}

Plan aprobado (resumen): ${plan.summary}
${priorContext ? `Trabajo ya realizado por etapas previas: ${JSON.stringify(priorContext)}` : ''}

Implementa ESTAS tareas de tu dominio, editando/creando archivos reales en el working tree:
${JSON.stringify(tasks)}

Reglas:
- Cíñete a tu dominio; no invadas trabajo de otros dominios.
- Reusa lo existente; sigue el estilo del código actual.
- Migraciones de Supabase forward-only (crea una nueva si hace falta esquema; indícalo en notes).
- No corras build ni tests (el arnés de verificación lo hará después).
- Escribe código limpio y terminado, no placeholders, cumpliendo los criterios de aceptación.
Al terminar reporta archivos creados/modificados y notas relevantes.`
}

function qaPrompt(plan, backendResult, frontendResult) {
  return `Eres el ingeniero de QA del proyecto Vue 3 + Supabase en \`${DIR}\`.
${CONVENTIONS}

Plan aprobado (resumen): ${plan.summary}
Backend entregó: ${JSON.stringify(backendResult)}
Frontend entregó: ${JSON.stringify(frontendResult)}

Escribe/actualiza pruebas para esta fase siguiendo tus tareas:
${JSON.stringify(plan.qa)}

Detalles:
- Pruebas e2e con Playwright en tests/e2e/ (patrón existente: helpers.js, auth.spec.js; el dev server y Supabase ya corren, webServer reuseExistingServer).
- Si hubo cambios de esquema, agrega pruebas pgTAP en supabase/tests/database/.
- Cubre camino feliz y estados vacío/error relevantes; aserciones fuertes, sin falsos positivos.
- No corras los tests (el arnés los ejecutará). Reporta archivos creados/modificados y notas.`
}

// ── Modo 1: solo planear (checkpoint humano) ────────────────────────────────
if (!approvedPlan) {
  phase('Planificación')
  const plan = await agent(plannerPrompt(), { schema: PLAN_SCHEMA, label: 'planner', phase: 'Planificación' })
  log('Plan generado. Esperando aprobación humana antes de construir.')
  return { mode: 'plan', phaseTitle, plan }
}

// ── Modo 2: construir con el plan aprobado ───────────────────────────────────
phase('Backend')
const backendResult = await agent(builderPrompt('backend', approvedPlan.backend, approvedPlan), {
  schema: BUILD_RESULT_SCHEMA,
  label: 'backend-dev',
  phase: 'Backend',
})
log(`Backend listo: +${backendResult.created.length} archivos nuevos, ${backendResult.modified.length} modificados`)

phase('Frontend')
const frontendResult = await agent(builderPrompt('frontend', approvedPlan.frontend, approvedPlan, backendResult), {
  schema: BUILD_RESULT_SCHEMA,
  label: 'frontend-dev',
  phase: 'Frontend',
})
log(`Frontend listo: +${frontendResult.created.length} archivos nuevos, ${frontendResult.modified.length} modificados`)

phase('QA')
const qaResult = await agent(qaPrompt(approvedPlan, backendResult, frontendResult), {
  schema: BUILD_RESULT_SCHEMA,
  label: 'qa-tests',
  phase: 'QA',
})
log(`QA listo: +${qaResult.created.length} pruebas nuevas`)

// ── Verificación + auto-reparación (arnés anidado) ──────────────────────────
phase('Verificación')
log('Ejecutando el arnés de verificación (dev-harness)…')
const harness = await workflow({ scriptPath: `${DIR}/.claude/workflows/dev-harness.js` })

return { mode: 'build', phaseTitle, backendResult, frontendResult, qaResult, harness }
