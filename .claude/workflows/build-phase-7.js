export const meta = {
  name: 'build-phase-7',
  description: 'Equipo de agentes construye la Fase 7 (Cuestionario de evaluación) con plan aprobado',
  phases: [
    { title: 'Frontend', detail: 'BaseSelect/Textarea, service, composable, form, vista, ruta, entrada' },
    { title: 'QA', detail: 'e2e del cuestionario + ampliar pgTAP' },
  ],
}

const DIR = '/Users/camacho/Documents/Pagina Web Functional Fitness'

const CONVENTIONS = `Convenciones OBLIGATORIAS:
- Vue 3 Composition API con <script setup>; TailwindCSS v4 (verde SOLO acento, nada de verde de relleno en inputs/botones).
- Acceso a Supabase SIEMPRE vía services en src/services/ (patrón packagesService.js/paymentService.js: importan supabase de ./supabaseClient y lanzan en error). NUNCA importar supabase en componentes/vistas.
- Composables (patrón usePackage.js/useCheckout.js): try/catch, exponen error en español, no tocan supabase directo.
- Pinia solo sesión (useAuthStore expone user, isAuthenticated, homeRoute).
- Migraciones forward-only (última 20260701000100). En esta fase NO se crean migraciones.
- Nombres en inglés, textos de UI en español. Reusar BaseButton/BaseCard/BaseInput/EmptyState/LoadingSpinner.
- BaseInput usa defineOptions({ inheritAttrs:false }) + v-bind="$attrs" + patrón error/aria-invalid/aria-describedby con id \`\${id}-error\`. Replicar ese molde EXACTO en BaseSelect/BaseTextarea para que los e2e por getByLabel funcionen (label ligado por for=id).
- No corras build ni tests: el gate lo hará después.`

const plan = {
  summary:
    'Fase 7 — Cuestionario de evaluación del cliente. La tabla questionnaires y su RLS ya existen (Fase 3): unique(purchase_id), FK compuesta (purchase_id,user_id), el cliente solo crea/edita el cuestionario de SU compra approved. experience_level usa el enum exercise_level (basic/intermediate/advanced). Sin migraciones nuevas. Se agregan BaseSelect/BaseTextarea, questionnaireService (upsert por purchase_id), useQuestionnaire, QuestionnaireForm en 5 secciones, QuestionnaireView (/client/questionnaire/:purchaseId), una vista mínima de compras del cliente como punto de entrada, y cobertura e2e + pgTAP. El panel de cliente completo es Fase 10 (no invadir).',
  frontend: [
    {
      title: 'BaseSelect.vue',
      details:
        "Crear src/components/common/BaseSelect.vue replicando el molde de BaseInput.vue: defineOptions({inheritAttrs:false}), props id(req), label(req), modelValue(String default ''), error(String), options(Array de {value,label}). Emitir update:modelValue en @change. Opción placeholder deshabilitada ('Selecciona…'). Mismas clases Tailwind y tratamiento de error/aria-invalid/aria-describedby que BaseInput. Verde solo acento.",
      files: ['src/components/common/BaseSelect.vue'],
      acceptance: ['label ligado por for=id; v-model funcional vía @change; error accesible con id ${id}-error'],
    },
    {
      title: 'BaseTextarea.vue',
      details:
        'Crear src/components/common/BaseTextarea.vue igual molde que BaseInput pero <textarea> con prop rows (default 3), v-bind="$attrs", inheritAttrs:false, mismas clases + altura mínima, mismo patrón de error. Emitir update:modelValue en @input.',
      files: ['src/components/common/BaseTextarea.vue'],
      acceptance: ['v-model funcional vía @input; error accesible igual que BaseInput'],
    },
    {
      title: 'questionnaireService.js',
      details:
        "Crear src/services/questionnaireService.js. QUESTIONNAIRE_FIELDS con id, purchase_id, los 14 campos (objective, age, weight, height, experience_level, injuries, medical_notes, equipment_available, training_place, days_per_week, time_per_session, preferred_schedule, limitations, additional_notes), created_at, updated_at. fetchQuestionnaireByPurchaseId(purchaseId): .from('questionnaires').select(FIELDS).eq('purchase_id', purchaseId).maybeSingle(); throw en error; devuelve data ?? null. saveQuestionnaire({ purchaseId, userId, values }): .from('questionnaires').upsert({ user_id: userId, purchase_id: purchaseId, ...values }, { onConflict: 'purchase_id' }).select(FIELDS).single(); throw en error (consistente con los otros services). Para leer la compra reusar fetchPurchaseById de paymentService (ya trae payment_status). No importar supabase en UI.",
      files: ['src/services/questionnaireService.js'],
      acceptance: [
        'upsert onConflict purchase_id (crea y actualiza en una vía)',
        'errores propagados con throw; solo importa supabase de supabaseClient',
      ],
    },
    {
      title: 'useQuestionnaire.js',
      details:
        "Crear src/composables/useQuestionnaire.js (patrón usePackage/useCheckout). Expone refs: purchase, questionnaire, loading, saving, error, saveError, saved; form reactivo con los 14 campos (strings; experience_level enum-string); computed isCompleted=Boolean(questionnaire.value). load(purchaseId): en paralelo fetchPurchaseById + fetchQuestionnaireByPurchaseId; si existe cuestionario hidrata form; distingue compra inexistente/no visible, compra no approved, y error de red (mensajes español). validate(): refleja los CHECK con mensajes español, devuelve errores por campo, se limpian al corregir. submit(userId): valida; normaliza (Number para age/weight/height/days_per_week/time_per_session; '' o vacío → null; experience_level ''→null) para no violar CHECK/enum; llama saveQuestionnaire; setea questionnaire/saved; error→saveError español.",
      files: ['src/composables/useQuestionnaire.js'],
      acceptance: [
        'sin acceso directo a supabase; estados PENDIENTE/COMPLETADO derivados de questionnaire',
        'valores numéricos vacíos y experience_level vacío se envían como null',
      ],
    },
    {
      title: 'QuestionnaireForm.vue (5 secciones)',
      details:
        "Crear src/components/questionnaire/QuestionnaireForm.vue presentacional. 5 secciones con encabezado español, cada una en BaseCard: (1) Objetivo y nivel: objective (BaseSelect: bajar grasa/ganar músculo/mejorar condición/mejorar rendimiento/salud general), experience_level (BaseSelect: principiante→basic, intermedio→intermediate, avanzado→advanced); (2) Datos físicos: age/weight/height (BaseInput type=number, min/max acordes a CHECK: age 13-100, time 10-360); (3) Salud/lesiones: injuries, medical_notes, limitations (BaseTextarea); (4) Logística: training_place (BaseSelect casa/gimnasio/exterior), equipment_available (BaseTextarea), days_per_week (BaseSelect 1-7), time_per_session (BaseInput number), preferred_schedule (BaseSelect mañana/tarde/noche); (5) Notas: additional_notes (BaseTextarea). BaseButton submit con label 'Guardar cuestionario'/'Actualizar cuestionario' según isCompleted y 'Guardando…' si saving. Errores por campo vía prop error de cada Base*; error global de guardado con role='alert'. Recibe form/errors/saving/isCompleted y emite submit (o defineModel sobre form). Verde solo acento.",
      files: ['src/components/questionnaire/QuestionnaireForm.vue'],
      acceptance: [
        '5 secciones con encabezados español; usa solo componentes base',
        'label del botón cambia crear/actualizar según isCompleted',
      ],
    },
    {
      title: 'QuestionnaireView.vue + ruta',
      details:
        "Crear src/views/client/QuestionnaireView.vue bajo /client. Recibe purchaseId por props (router props:true). onMounted → useQuestionnaire().load(purchaseId). Estados: LoadingSpinner mientras loading; si compra inexistente/no del usuario/no approved → EmptyState español ('Esta compra no admite cuestionario' o similar) con enlace a /client/dashboard, SIN formulario (refleja en UI la barrera RLS); si approved → eyebrow 'TU EVALUACIÓN', badge/texto PENDIENTE/COMPLETADO, y <QuestionnaireForm>; tras guardar, confirmación español (permite editar de nuevo); error de red de carga → mensaje español + botón recargar. userId desde useAuthStore().user.id para submit. Modificar src/router/index.js: añadir a children de /client { path:'questionnaire/:purchaseId', name:'client-questionnaire', component: () => import('../views/client/QuestionnaireView.vue'), props:true }.",
      files: ['src/views/client/QuestionnaireView.vue', 'src/router/index.js'],
      acceptance: [
        'distingue cargando/compra-no-apta/pendiente/completado; no importa supabase directo',
        'sin sesión, la ruta redirige a /login?redirect=... (guard existente)',
      ],
    },
    {
      title: 'Punto de entrada mínimo: ClientPurchasesView',
      details:
        "Crear src/views/client/ClientPurchasesView.vue: lista las compras approved del usuario con su estado de cuestionario (pendiente/completado) y enlace a /client/questionnaire/:purchaseId. Añadir en paymentService.js una función fetchMyPurchases() (RLS ya filtra a dueño; select id, package_name, amount, currency, payment_status, created_at; order created_at desc) y una forma de saber el estado de cuestionario (p.ej. fetchQuestionnaireByPurchaseId por compra, o un select embebido questionnaires(purchase_id)). Añadir ruta { path:'purchases', name:'client-purchases', component: () => import('../views/client/ClientPurchasesView.vue') } en children de /client. Añadir ítem de navegación (p.ej. 'Mi evaluación' o 'Mis compras') en src/layouts/ClientLayout.vue (array navigation del DashboardSidebar). NO construir dashboard/rutina/historial completos (Fase 10); dejar ClientDashboardView intacto. Estados carga/vacío/error en español.",
      files: [
        'src/views/client/ClientPurchasesView.vue',
        'src/services/paymentService.js',
        'src/router/index.js',
        'src/layouts/ClientLayout.vue',
      ],
      acceptance: [
        'ruta navegable en el área cliente que lista compras approved con estado de cuestionario y enlace',
        'no se construye dashboard/rutina/historial (fuera de alcance)',
      ],
    },
  ],
  qa: [
    {
      title: 'Ampliar pgTAP de la RLS del cuestionario',
      details:
        "Modificar supabase/tests/database/002_rls.test.sql: añadir aserciones (y actualizar select plan(N) al total EXACTO) para: INSERT de cuestionario sobre compra pending del cliente A → falla (throws_ok, patrón del archivo); INSERT sobre compra de otro cliente → falla; un CHECK de valores (p.ej. age=5 sobre la compra approved) → throws_ok '23514'; cliente B no lee el cuestionario del cliente A (0 filas). Reusar las compras ya sembradas (0001 approved, 0003 pending del cliente A; 0002 del cliente B) y respetar unique(purchase_id) usando compras distintas para cada INSERT que deba tener éxito.",
      files: ['supabase/tests/database/002_rls.test.sql'],
      acceptance: ['npm run db:test verde con plan(N) exacto; al menos un assert prueba que una compra pending no permite crear cuestionario'],
    },
    {
      title: 'e2e del cuestionario',
      details:
        "Crear tests/e2e/questionnaire.spec.js siguiendo checkout.spec.js. Usar createUser, seedPurchase (service role → test.skip(!hasServiceRole)), loginViaUi. Casos: (1) crear: sembrar compra approved, login, ir a /client/questionnaire/:id, llenar las secciones con valores válidos, guardar, ver confirmación, recargar y verificar persistencia (COMPLETADO); (2) editar: cambiar un campo, guardar, verificar persistencia (upsert); (3) validación: age=5 (o time_per_session=5) → mensaje español y NO guarda; (4) compra no approved: seedPurchase pending → la vista muestra EmptyState y NO el formulario; (5) punto de entrada: la vista de compras lista la compra approved con enlace y estado. Selección por getByLabel/getByRole. Nada de Mercado Pago.",
      files: ['tests/e2e/questionnaire.spec.js'],
      acceptance: [
        'casos con service role usan test.skip si no hay SUPABASE_SERVICE_ROLE_KEY',
        'cubre crear/editar/validación/compra-no-apta/entrada; sin dependencia de MP',
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
  return `Eres el desarrollador ${role} del proyecto Vue 3 + Supabase en \`${DIR}\`.
${CONVENTIONS}

Plan aprobado (resumen): ${plan.summary}
${priorContext ? `Trabajo ya realizado por etapas previas: ${JSON.stringify(priorContext)}` : ''}

Implementa ESTAS tareas, creando/editando archivos reales en el working tree:
${JSON.stringify(tasks)}

Reglas: cíñete a tus tareas; reusa lo existente; código limpio y terminado (sin placeholders) que cumpla los criterios de aceptación. No corras build ni tests. Al terminar reporta archivos creados/modificados y notas (decisiones/riesgos).`
}

phase('Frontend')
const frontend = await agent(builderPrompt('FRONTEND', plan.frontend), {
  schema: BUILD_RESULT_SCHEMA,
  label: 'frontend-dev',
  phase: 'Frontend',
})
log(`Frontend: +${frontend.created.length} nuevos, ${frontend.modified.length} modificados`)

phase('QA')
const qa = await agent(builderPrompt('QA (pruebas)', plan.qa, frontend), {
  schema: BUILD_RESULT_SCHEMA,
  label: 'qa-tests',
  phase: 'QA',
})
log(`QA: +${qa.created.length} nuevos, ${qa.modified.length} modificados`)

return { phaseTitle: 'Fase 7', frontend, qa }
