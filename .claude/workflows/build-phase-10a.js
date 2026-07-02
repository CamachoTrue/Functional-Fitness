export const meta = {
  name: 'build-phase-10a',
  description: 'Equipo construye la Fase 10A: constructor de rutinas (admin) con plan aprobado',
  phases: [
    { title: 'Backend', detail: 'routineService (CRUD + asignar + reorder) + adminService.fetchAllRoutines' },
    { title: 'Frontend', detail: 'composables, RoutineBuilder/Table, vistas, rutas, nav, cablear botón' },
    { title: 'QA', detail: 'helper seedAssignedRoutine + e2e admin-routines' },
  ],
}

const DIR = '/Users/camacho/Documents/Pagina Web Functional Fitness'

const CONVENTIONS = `Convenciones OBLIGATORIAS:
- Vue 3 Composition API <script setup>; TailwindCSS v4 (verde SOLO acento).
- Acceso a Supabase SIEMPRE vía services en src/services/ (patrón exercisesService/adminService: importan supabase de ./supabaseClient, lanzan en error, devuelven fila/[]/null). NUNCA importar supabaseClient en componentes/vistas.
- Composables patrón useExercisesAdmin (refs loading/error/saving + load() idempotente; error en español; estado local sincronizado tras cada mutación; sin supabase directo).
- Pinia solo sesión. Reusar BaseButton/BaseCard/BaseInput/BaseSelect/BaseTextarea/BaseBadge/BaseTable/EmptyState/LoadingSpinner y useCurrency.
- Migraciones forward-only; en esta fase NO se crean migraciones (esquema/triggers/RLS ya soportan todo). Generar ids en cliente con crypto.randomUUID() (patrón de useExercisesAdmin).
- Área /admin con guard role:'admin' ya funciona. Nombres en inglés, textos UI en español.
- No corras build ni tests: el gate lo hará después.

REGLAS DE DOMINIO (no violar):
- routines: status enum draft/assigned/archived. CHECK: status='assigned' ⇒ purchase_id not null. routines_purchase_id_key UNIQUE parcial: UNA rutina por purchase (crear 2ª para la misma compra lanza 23505 → detectar y editar la existente).
- TRIGGER validate_assigned_routine: al pasar a status='assigned' EXIGE que exista una purchase approved del mismo user_id; si no, lanza excepción (raise exception con texto que incluye 'approved purchase', SIN code estándar). Detectar por error.message.includes('approved purchase') y relanzar un error tipado .code='no_approved_purchase' con mensaje español (patrón del 'in_use' de deleteExercise).
- unique(routine_id, day_number) y unique(routine_day_id, order_index): al REORDENAR usar two-pass con OFFSET ALTO (+1000) — NO negativos (CHECK exige order_index>=0, day_number>0). Fase 1: subir los índices afectados a rango temporal alto; Fase 2: bajarlos a su valor final contiguo. Recargar desde DB tras reordenar.`

const plan = {
  summary:
    'Fase 10A — Constructor de rutinas (admin). Sin migraciones. routineService con CRUD de routines/routine_days/routine_exercises, asignar (draft→assigned, maneja el trigger que exige compra approved), reordenar (two-pass con offset por los unique), y fetchRoutineByPurchaseId (una rutina por compra). Composables useRoutineBuilder y useAdminRoutines. Componentes RoutineTable y RoutineBuilder (días + ejercicios ordenados con ↑/↓, ExercisePicker desde la biblioteca de exercises). Vistas /admin/routines (+create/edit) con navegación. Se cablea el botón "Crear/asignar rutina" de AdminQuestionnairesView (hoy deshabilitado) hacia el constructor con userId+purchaseId. QA: helper seedAssignedRoutine + e2e admin-routines (crear/reordenar/asignar, caso compra no aprobada, una-rutina-por-compra).',
  backend: [
    {
      title: 'routineService.js (CRUD admin + asignar + reorder)',
      details:
        "Crear src/services/routineService.js (patrón exercisesService). Funciones: fetchRoutineWithContent(routineId) → select embebido routine + routine_days(routine_exercises(exercises(id,name,video_path,muscle_group,level))) con .order('day_number',{foreignTable:'routine_days'}) y order de order_index en routine_exercises (o reordenar en cliente), .eq('id',routineId).maybeSingle(). fetchRoutineByPurchaseId(purchaseId) maybeSingle (para respetar una-rutina-por-compra). createRoutine({id,userId,purchaseId,name,objective,generalNotes}) INSERT draft (genera id en cliente). updateRoutine(id,fields). createDay({id,routineId,dayNumber,title,notes}), updateDay(id,fields), deleteDay(id). createRoutineExercise({id,routineDayId,exerciseId,orderIndex,sets,reps,restSeconds,tempo,notes}), updateRoutineExercise(id,fields), deleteRoutineExercise(id). assignRoutine(id): update status='assigned'; si el error incluye 'approved purchase' relanzar Error con .code='no_approved_purchase' y mensaje español; también si 23505 (rutina ya existe para la compra) tratar. unassignRoutine(id)/archiveRoutine(id). reorderExercises(routineDayId, orderedIds) y reorderDays(routineId, orderedIds): two-pass con offset +1000 (updates individuales), dejando índices contiguos (0..n-1 ejercicios, 1..n días).",
      files: ['src/services/routineService.js'],
      acceptance: [
        'cada función lanza en error; assignRoutine traduce el fallo del trigger a no_approved_purchase',
        'reorder no lanza 23505 y deja índices contiguos; fetchRoutineByPurchaseId permite editar la rutina existente',
      ],
    },
    {
      title: 'adminService.fetchAllRoutines',
      details:
        "Añadir a src/services/adminService.js: fetchAllRoutines() → select('id,user_id,purchase_id,name,status,assigned_at,created_at').order('created_at',{ascending:false}). Reusar el patrón de las otras lecturas admin.",
      files: ['src/services/adminService.js'],
      acceptance: ['devuelve todas las rutinas para el admin (RLS admin); lanza en error'],
    },
  ],
  frontend: [
    {
      title: 'Composables useRoutineBuilder y useAdminRoutines',
      details:
        "Crear src/composables/useRoutineBuilder.js (patrón useExercisesAdmin): estado routine, days (con ejercicios anidados, ordenados), loading, error, saving; load(routineId), create({...}), addDay/updateDay/removeDay, addExercise/updateExercise/removeExercise, moveDay/moveExercise (llaman a reorder y recargan), assign() (maneja no_approved_purchase → error.value con mensaje claro). Mantener estado local sincronizado. Crear src/composables/useAdminRoutines.js: routines, loading, error, load(); usa adminService.fetchAllRoutines + fetchClients y une client_name/client_email por user_id (como useAdminQuestionnaires).",
      files: ['src/composables/useRoutineBuilder.js', 'src/composables/useAdminRoutines.js'],
      acceptance: ['useRoutineBuilder cubre CRUD+reorder+assign con errores en español; useAdminRoutines une nombre del cliente por user_id'],
    },
    {
      title: 'Componentes RoutineTable y RoutineBuilder (+ subcomponentes)',
      details:
        "Crear src/components/routines/RoutineTable.vue (BaseTable: cliente [nombre], nombre rutina, status BaseBadge draft/assigned/archived, fecha, acción Editar RouterLink a admin-routine-edit). Crear src/components/routines/RoutineBuilder.vue: editor de metadatos (name/objective/general_notes con BaseInput/BaseTextarea), lista de días (cada uno en BaseCard con title/notes, botones ↑/↓/eliminar, añadir día) y por día lista ordenada de ejercicios. Subcomponentes: src/components/routines/RoutineDayCard.vue, src/components/routines/RoutineExerciseRow.vue (sets/reps/rest_seconds/tempo/notes con Base*, botones ↑/↓/eliminar), src/components/routines/ExercisePicker.vue (selecciona de fetchAllExercises de exercisesService; BaseSelect o buscador por nombre). Reordenamiento con botones ↑/↓ (sin drag-and-drop). Emite eventos al composable.",
      files: [
        'src/components/routines/RoutineTable.vue',
        'src/components/routines/RoutineBuilder.vue',
        'src/components/routines/RoutineDayCard.vue',
        'src/components/routines/RoutineExerciseRow.vue',
        'src/components/routines/ExercisePicker.vue',
      ],
      acceptance: ['se arma una rutina completa (días+ejercicios) con orden reflejado; usa solo componentes base'],
    },
    {
      title: 'Vistas y rutas admin + navegación + cablear botón',
      details:
        "Crear src/views/admin/AdminRoutinesView.vue (lista con useAdminRoutines + RoutineTable + botón 'Nueva rutina'). Crear src/views/admin/AdminRoutineBuilderView.vue (create+edit; detecta modo por prop id; en create lee ?userId=&purchaseId= de la query y, antes de crear, llama fetchRoutineByPurchaseId(purchaseId) → si existe redirige a editar esa rutina; botón 'Asignar rutina' visible en edit con status draft; muestra el error no_approved_purchase). Modificar src/router/index.js: en children de /admin añadir routines (admin-routines), routines/create (admin-routine-create), routines/:id/edit (admin-routine-edit, props:true), lazy import(). Modificar src/layouts/AdminLayout.vue: añadir navegación 'Rutinas' → /admin/routines. Modificar src/views/admin/AdminQuestionnairesView.vue: el botón 'Crear/asignar rutina' (hoy disabled '· Fase 9') → habilitarlo cuando row.purchase_status==='approved' como RouterLink/BaseButton a { name:'admin-routine-create', query:{ userId: row.user_id, purchaseId: row.purchase_id } }; si no aprobado, dejar deshabilitado con texto 'Requiere compra aprobada'. Actualizar el subtítulo que menciona la Fase 9.",
      files: [
        'src/views/admin/AdminRoutinesView.vue',
        'src/views/admin/AdminRoutineBuilderView.vue',
        'src/router/index.js',
        'src/layouts/AdminLayout.vue',
        'src/views/admin/AdminQuestionnairesView.vue',
      ],
      acceptance: [
        'navegación crear→lista y editar funcionan; el botón de cuestionarios lleva al constructor con userId+purchaseId cuando la compra está approved',
        'crear rutina para una compra que ya tiene rutina redirige a editar la existente',
      ],
    },
  ],
  qa: [
    {
      title: 'Helper seedAssignedRoutine + e2e admin-routines',
      details:
        "Modificar tests/e2e/helpers.js: añadir seedAssignedRoutine({ userId, purchaseId, exerciseId, ... }) con service role — crea routine (con purchase_id + user), routine_day, routine_exercise y luego PATCH status='assigned' (requiere que la purchase ya esté approved para el trigger). Reusar patrón de seedRoutineWithExercise. Crear tests/e2e/admin-routines.spec.js (test.skip(!hasServiceRole); beforeAll admin+promoteToAdmin): (1) seedPurchase(approved) para un cliente + seedExercise → login admin → ir a /admin/questionnaires o /admin/routines, crear rutina, añadir un día + un ejercicio, (reordenar si aplica), asignar → verificar badge 'assigned' (Asignada); (2) caso negativo: seedPurchase(pending) → intentar asignar → mensaje no_approved_purchase visible; (3) una-rutina-por-compra: crear rutina para una purchaseId que ya tiene rutina → redirige a editar la existente (verificar URL /admin/routines/<id>/edit). loginViaUi ya espera la redirección.",
      files: ['tests/e2e/helpers.js', 'tests/e2e/admin-routines.spec.js'],
      acceptance: [
        'crear/añadir día+ejercicio/asignar pasan; badge assigned visible',
        'compra no aprobada muestra mensaje; segunda rutina para misma compra redirige a editar',
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
const backend = await agent(builderPrompt('BACKEND (routineService + adminService)', plan.backend), {
  schema: BUILD_RESULT_SCHEMA,
  label: 'backend',
  phase: 'Backend',
})
log(`Backend: +${backend.created.length} nuevos, ${backend.modified.length} modificados`)

phase('Frontend')
const frontend = await agent(builderPrompt('FRONTEND (composables + componentes + vistas + rutas)', plan.frontend, backend), {
  schema: BUILD_RESULT_SCHEMA,
  label: 'frontend',
  phase: 'Frontend',
})
log(`Frontend: +${frontend.created.length} nuevos, ${frontend.modified.length} modificados`)

phase('QA')
const qa = await agent(builderPrompt('QA (helper + e2e)', plan.qa, { backend, frontend }), {
  schema: BUILD_RESULT_SCHEMA,
  label: 'qa-tests',
  phase: 'QA',
})
log(`QA: +${qa.created.length} nuevos, ${qa.modified.length} modificados`)

return { phaseTitle: 'Fase 10A', backend, frontend, qa }
