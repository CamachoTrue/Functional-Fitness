export const meta = {
  name: 'build-phase-10b',
  description: 'Equipo construye la Fase 10B: panel del cliente (rutina por días + videos) con plan aprobado',
  phases: [
    { title: 'Backend', detail: 'routineService lecturas cliente + fetchMyPurchases con fechas' },
    { title: 'Frontend', detail: 'composables, dashboard real, vista de rutina + videos, rutas/nav' },
    { title: 'QA', detail: 'helper subida de video + e2e cliente-rutina' },
  ],
}

const DIR = '/Users/camacho/Documents/Pagina Web Functional Fitness'

const CONVENTIONS = `Convenciones OBLIGATORIAS:
- Vue 3 Composition API <script setup>; TailwindCSS v4 (verde SOLO acento).
- Acceso a Supabase SIEMPRE vía services en src/services/; NUNCA importar supabaseClient en componentes/vistas. storageService es el único que toca supabase.storage (ya existe createSignedVideoUrl).
- Composables patrón usePackage/useClient* (refs loading/error/data + load(); error en español; sin supabase directo).
- Pinia solo sesión (useAuthStore, user, homeRoute). Reusar BaseButton/BaseCard/BaseBadge/EmptyState/LoadingSpinner y useCurrency.formatCurrency.
- Migraciones forward-only; en esta fase NO se crean migraciones. Nombres inglés, UI español.
- Área /client con guard role:'client' ya funciona. No corras build ni tests: el gate lo hará.

REGLAS DE DOMINIO (no violar):
- RLS: el cliente solo LEE su rutina si status='assigned' Y la compra asociada sigue approved y NO vencida (end_date>now o null), por las políticas de 20260618000300 + 20260618000500. Por eso fetchMyAssignedRoutine NO filtra por user_id (la RLS ya limita); si no hay rutina accesible devuelve null → la UI muestra 'en preparación'/vacío (refleja la RLS, sin fugas).
- Videos: bucket privado; el cliente genera signed URL con storageService.createSignedVideoUrl SOLO para videos de su rutina assigned vigente (policy exercise_videos_client_read_assigned). Firmar ON-DEMAND al reproducir; manejar video_path null (sin video) y error de firma (mensaje 'Video no disponible') sin romper el resto.
- Modelo: una rutina por compra vigente. Usar ruta /client/routine SIN :routineId (resolver la rutina assigned del usuario en el composable).`

const plan = {
  summary:
    'Fase 10B — Panel del cliente. Sin migraciones. routineService gana lecturas de cliente: fetchMyAssignedRoutine() (RLS limita a la rutina assigned del usuario con compra vigente; embebe días→ejercicios→exercises; ordena en cliente). Se amplía paymentService.fetchMyPurchases para incluir start_date/end_date. Composables useClientRoutine y useClientDashboard. Se reemplaza el placeholder de ClientDashboardView (estado del plan, cuestionario, rutina lista/en preparación) y se crea ClientRoutineView (/client/routine) que muestra la rutina por días con ClientRoutineDay/ClientExerciseCard (series/reps/descanso/tempo/notas + reproducción de video vía signed URL on-demand). Navegación "Mi rutina". QA: helper para subir el video real del fixture con service role + e2e cliente (dashboard "Lista" → ver rutina → reproducir video; caso negativo de compra vencida/no aprobada → rutina no visible).',
  backend: [
    {
      title: 'Lecturas de cliente en routineService.js + fechas en fetchMyPurchases',
      details:
        "Editar src/services/routineService.js: añadir fetchMyAssignedRoutine() → select embebido routines(id,name,objective,general_notes,status,assigned_at, routine_days(id,day_number,title,notes, routine_exercises(id,exercise_id,order_index,sets,reps,rest_seconds,tempo,notes, exercises(id,name,video_path,muscle_group,level,description,common_mistakes)))) con .eq('status','assigned') SIN filtrar user_id (la RLS ya limita al dueño con compra vigente); order por assigned_at desc; tomar la primera (maybeSingle o [0]); ordenar days por day_number y routine_exercises por order_index EN CLIENTE. Devuelve null si no hay (RLS). throw en error. Editar src/services/paymentService.js: ampliar el select de fetchMyPurchases para incluir start_date y end_date (sin romper ClientPurchasesView).",
      files: ['src/services/routineService.js', 'src/services/paymentService.js'],
      acceptance: [
        'fetchMyAssignedRoutine devuelve la rutina assigned del usuario con días/ejercicios ordenados, o null si la RLS no la expone',
        'fetchMyPurchases incluye start_date/end_date',
      ],
    },
  ],
  frontend: [
    {
      title: 'Composables useClientRoutine y useClientDashboard',
      details:
        "Crear src/composables/useClientRoutine.js: routine, loading, error; load() → fetchMyAssignedRoutine(); getVideoUrl(path) → storageService.createSignedVideoUrl (lazy, al reproducir; si path null no llama; captura error y devuelve null/expone mensaje). Crear src/composables/useClientDashboard.js: usa paymentService.fetchMyPurchases (embebe questionnaires) + fetchMyAssignedRoutine; deriva: compra approved vigente (con start_date/end_date), estado del cuestionario (pendiente/completado por compra), y estado de la rutina (en preparación si no hay assigned / lista si la hay). loading/error en español.",
      files: ['src/composables/useClientRoutine.js', 'src/composables/useClientDashboard.js'],
      acceptance: ['sin supabase directo; getVideoUrl maneja path null y error; el dashboard deriva estados de plan/cuestionario/rutina'],
    },
    {
      title: 'Componentes ClientRoutineDay y ClientExerciseCard',
      details:
        "Crear src/components/routines/ClientRoutineDay.vue (BaseCard: título del día + notas + lista de ClientExerciseCard). Crear src/components/routines/ClientExerciseCard.vue (BaseCard): nombre del ejercicio, series (sets), reps, descanso (rest_seconds + 's'), tempo, notas del entrenador; botón 'Ver video' que pide la signed URL on-demand (recibe getVideoUrl por prop o inyección) y renderiza <video controls :src>; estado 'Sin video' cuando video_path es null; si la firma falla, mensaje 'Video no disponible' sin romper la tarjeta. Textos en español.",
      files: [
        'src/components/routines/ClientRoutineDay.vue',
        'src/components/routines/ClientExerciseCard.vue',
      ],
      acceptance: ['muestra los campos del ejercicio; el video se firma on-demand y reproduce; maneja sin-video y error de firma'],
    },
    {
      title: 'ClientDashboardView (reemplazar placeholder) + ClientRoutineView + rutas/nav',
      details:
        "Reescribir src/views/client/ClientDashboardView.vue (hoy EmptyState) con useClientDashboard: resumen del plan (paquete, fechas inicio/vencimiento con formato es-MX), estado del cuestionario (pendiente con link a /client/questionnaire/:purchaseId, o completado), estado de la rutina ('En preparación' si no hay assigned / 'Lista' con botón 'Ver mi rutina' → /client/routine). LoadingSpinner/EmptyState/error. Crear src/views/client/ClientRoutineView.vue (/client/routine, sin :routineId): usa useClientRoutine; onMounted load(); render de días ordenados con ClientRoutineDay; estados loading, vacío ('Tu rutina aún está en preparación'), error. Modificar src/router/index.js: en children de /client añadir { path:'routine', name:'client-routine', component: () => import('../views/client/ClientRoutineView.vue') }. Modificar src/layouts/ClientLayout.vue: añadir navegación 'Mi rutina' → /client/routine.",
      files: [
        'src/views/client/ClientDashboardView.vue',
        'src/views/client/ClientRoutineView.vue',
        'src/router/index.js',
        'src/layouts/ClientLayout.vue',
      ],
      acceptance: [
        'dashboard muestra plan/cuestionario/estado de rutina reales; /client/routine muestra la rutina por días o el estado vacío',
        'sin rutina assigned/vigente la vista muestra "en preparación" (refleja RLS), sin errores',
      ],
    },
  ],
  qa: [
    {
      title: 'Helper de subida de video + e2e cliente-rutina',
      details:
        "Modificar tests/e2e/helpers.js: añadir uploadExerciseVideoAsService(path, filePath) que suba el fixture real (tests/e2e/fixtures/sample.mp4) al bucket exercise-videos con la service key (POST a /storage/v1/object/exercise-videos/<path> con content-type video/mp4), para que el video_path del ejercicio corresponda a un objeto real y el cliente pueda firmarlo. Crear tests/e2e/client-routine.spec.js (test.skip(!hasServiceRole)): (1) crear cliente → seedPurchase(approved) → generar un exerciseId + video_path 'exercises/<exerciseId>/sample.mp4', subir el objeto con uploadExerciseVideoAsService y seedExercise con ese videoPath (o seedExercise y luego subir) → seedAssignedRoutine(userId,purchaseId,exerciseId) → login cliente → /client/dashboard muestra 'Lista' y botón 'Ver mi rutina' → /client/routine muestra el día y el ejercicio → click 'Ver video' → el <video> obtiene src (signed URL) sin error. (2) caso negativo: cliente con seedPurchase de compra VENCIDA (end_date en el pasado) o no approved → /client/routine NO muestra la rutina (estado 'en preparación'/vacío), confirmando la puerta RLS de 20260618000500. Reusar createUser/seedPurchase/seedExercise/seedAssignedRoutine; loginViaUi ya espera la redirección.",
      files: ['tests/e2e/helpers.js', 'tests/e2e/client-routine.spec.js'],
      acceptance: [
        'el cliente ve su rutina y reproduce el video (signed URL) sin error',
        'con compra vencida/no aprobada la rutina no se muestra (caso negativo pasa); no depende de Mercado Pago',
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

Reglas: cíñete a tus tareas; reusa lo existente; código limpio y terminado (sin placeholders) que cumpla los criterios de aceptación y las reglas de dominio. No corras build ni tests. Al terminar reporta archivos creados/modificados y notas (decisiones/riesgos).`
}

phase('Backend')
const backend = await agent(builderPrompt('BACKEND (lecturas cliente)', plan.backend), {
  schema: BUILD_RESULT_SCHEMA,
  label: 'backend',
  phase: 'Backend',
})
log(`Backend: +${backend.created.length} nuevos, ${backend.modified.length} modificados`)

phase('Frontend')
const frontend = await agent(builderPrompt('FRONTEND (composables + vistas cliente)', plan.frontend, backend), {
  schema: BUILD_RESULT_SCHEMA,
  label: 'frontend',
  phase: 'Frontend',
})
log(`Frontend: +${frontend.created.length} nuevos, ${frontend.modified.length} modificados`)

phase('QA')
const qa = await agent(builderPrompt('QA (helper + e2e cliente)', plan.qa, { backend, frontend }), {
  schema: BUILD_RESULT_SCHEMA,
  label: 'qa-tests',
  phase: 'QA',
})
log(`QA: +${qa.created.length} nuevos, ${qa.modified.length} modificados`)

return { phaseTitle: 'Fase 10B', backend, frontend, qa }
