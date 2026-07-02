export const meta = {
  name: 'build-phase-9',
  description: 'Equipo de agentes construye la Fase 9 (CRUD de paquetes y ejercicios con video/Storage) con plan aprobado',
  phases: [
    { title: 'Datos', detail: 'storageService, exercisesService, packagesService admin + composables' },
    { title: 'UI', detail: 'FileUpload, forms/tablas, vistas, rutas, navegación' },
    { title: 'QA', detail: 'e2e paquetes + ejercicios con subida de video + pgTAP storage' },
  ],
}

const DIR = '/Users/camacho/Documents/Pagina Web Functional Fitness'

const CONVENTIONS = `Convenciones OBLIGATORIAS:
- Vue 3 Composition API <script setup>; TailwindCSS v4 (verde SOLO acento).
- Acceso a Supabase SIEMPRE vía services en src/services/ (patrón packagesService/adminService: importan supabase de ./supabaseClient, lanzan en error). NUNCA importar supabaseClient en componentes/vistas. storageService es el ÚNICO módulo que toca supabase.storage.
- Composables patrón usePackages/useAdminClients (refs loading/error/data + load() idempotente, saving; error en español; sin supabase directo).
- Pinia solo sesión (useAuthStore, isAdmin). Reusar useCurrency.formatCurrency, BaseButton/BaseCard/BaseInput/BaseSelect/BaseTextarea/BaseBadge/BaseTable/EmptyState/LoadingSpinner.
- Migraciones forward-only; en esta fase NO se crean migraciones (RLS/Storage ya existen).
- Área /admin con guard role:'admin' ya funciona. Nombres en inglés, textos UI en español.
- No corras build ni tests: el gate lo hará después.

DECISIONES DE DISEÑO (no violar):
- video_path: generar el UUID del ejercicio en el cliente con crypto.randomUUID(); path = exercises/{id}/{filenameSanitizado}. Cumple el CHECK ^exercises/[0-9a-f-]{36}/[^/]+$. Flujo CREAR: generar id → validar file (<=50MB, mime video/mp4|webm|quicktime) → subir a Storage → INSERT con id y video_path; si el INSERT falla tras subir, BORRAR el objeto (rollback, sin huérfanos).
- REEMPLAZAR video: subir el nuevo (upsert si mismo filename), UPDATE video_path, y borrar el anterior SOLO tras UPDATE ok.
- ELIMINAR ejercicio: DELETE en DB primero; si falla por FK (Postgres 23503, en uso en routine_exercises) NO tocar Storage y exponer error 'en uso'; si borra bien y tenía video_path, borrar el objeto (best-effort).
- PAQUETES: NO ofrecer borrado duro (los referencian purchases, on delete restrict). Solo activar/desactivar (is_active). El catálogo público ya filtra is_active.`

const plan = {
  summary:
    'Fase 9 — CRUD admin de paquetes y de ejercicios con video en el bucket privado exercise-videos. Sin migraciones (RLS packages_admin_all/exercises_admin_write y políticas de Storage ya existen). Se extiende packagesService (CRUD admin), se crean exercisesService y storageService (subir/reemplazar/borrar + signed URLs), composables usePackagesAdmin/useExercisesAdmin, componente FileUpload, forms/tablas de paquetes y ejercicios (con preview de video vía signed URL), vistas y rutas /admin/packages y /admin/exercises (+create/edit), navegación, y cobertura e2e (subida real de video con tests/e2e/fixtures/sample.mp4 ya creado) + pgTAP de Storage.',
  data: [
    {
      title: 'storageService.js',
      details:
        "Crear src/services/storageService.js (único módulo que toca supabase.storage). Constantes BUCKET='exercise-videos', MAX_SIZE=52428800, ALLOWED_MIME=['video/mp4','video/webm','video/quicktime'], SIGNED_URL_TTL=3600. buildVideoPath(exerciseId, filename): sanitiza filename (sin '/', colapsa espacios, conserva extensión) → 'exercises/'+exerciseId+'/'+safe. validateVideoFile(file): valida tamaño y mimetype en cliente, devuelve mensaje en español si inválido. uploadExerciseVideo(path, file, { upsert=false }): supabase.storage.from(BUCKET).upload(path, file, { upsert, contentType: file.type }); throw en error. removeExerciseVideo(path): .remove([path]). createSignedVideoUrl(path, ttl=SIGNED_URL_TTL): .createSignedUrl(path, ttl) → devuelve signedUrl; throw en error.",
      files: ['src/services/storageService.js'],
      acceptance: ['subir/borrar/firmar funcionan con sesión admin; validateVideoFile rechaza >50MB o mime no permitido'],
    },
    {
      title: 'exercisesService.js',
      details:
        "Crear src/services/exercisesService.js. fetchAllExercises() (id,name,category,muscle_group,level,equipment,video_path,created_at; order name). fetchExerciseById(id) (todos los campos, maybeSingle). createExercise(payload) (recibe id uuid del cliente + campos + video_path opcional; INSERT return=representation single). updateExercise(id, payload). deleteExercise(id): DELETE; si el error es FK (code '23503') relanzar un error tipado (p.ej. Error con .code='in_use') para que la UI muestre 'en uso'. throw en error genérico.",
      files: ['src/services/exercisesService.js'],
      acceptance: ['CRUD bajo RLS admin; deleteExercise sobre ejercicio en uso reporta caso en_use (23503)'],
    },
    {
      title: 'Extender packagesService.js (CRUD admin)',
      details:
        "Modificar src/services/packagesService.js sin romper las funciones públicas. Añadir ADMIN_PACKAGE_FIELDS (incluye is_active, is_recommended, created_at, updated_at). fetchAllPackages() (activos+inactivos, order is_active desc, is_recommended desc, price asc; el admin ve inactivos vía packages_admin_all). fetchPackageByIdAdmin(id) (sin filtrar is_active). createPackage(payload) (INSERT single). updatePackage(id, payload). setPackageActive(id, isActive) (UPDATE is_active). throw en error.",
      files: ['src/services/packagesService.js'],
      acceptance: ['admin obtiene inactivos con fetchAllPackages; crear/editar/toggle respeta CHECKs (price>0, currency ^[A-Z]{3}$, duration>0)'],
    },
    {
      title: 'Composables usePackagesAdmin y useExercisesAdmin',
      details:
        "Crear src/composables/usePackagesAdmin.js (patrón useAdminClients): packages, loading, error, saving; load(), create(payload), update(id,payload), toggleActive(id,isActive); errores en español, mapear violaciones de CHECK a mensajes útiles. Crear src/composables/useExercisesAdmin.js orquestando exercisesService + storageService: exercises, loading, error, saving; load(); createWithVideo({fields,file}) (genera id, valida file, sube, INSERT, rollback de Storage si INSERT falla); updateWithVideo(id,{fields,file,currentPath}) (si hay file nuevo: subir/upsert, UPDATE, borrar anterior tras éxito); remove(id, videoPath) (DELETE DB primero; si éxito y hay path borrar Storage; si FK exponer 'en uso'); getPreviewUrl(path) → createSignedVideoUrl.",
      files: ['src/composables/usePackagesAdmin.js', 'src/composables/useExercisesAdmin.js'],
      acceptance: ['flujos crear/reemplazar/borrar respetan orden y limpieza; mensajes en español; sin huérfanos en camino feliz'],
    },
  ],
  ui: [
    {
      title: 'FileUpload.vue',
      details:
        "Crear src/components/common/FileUpload.vue: input type=file accesible (label ligado por for=id, estilo consistente con BaseInput), prop id/label/accept (default 'video/mp4,video/webm,video/quicktime')/error. Emite update:modelValue con el File seleccionado. Muestra nombre y tamaño del archivo elegido y el error de validación (patrón error de BaseInput). Sin lógica de Supabase.",
      files: ['src/components/common/FileUpload.vue'],
      acceptance: ['page.setInputFiles funciona sobre el input; muestra nombre del archivo; respeta accept; label ligado por for=id'],
    },
    {
      title: 'Componentes de Paquetes (PackageTable + PackageForm)',
      details:
        "Crear src/components/packages/PackageTable.vue (BaseTable: name, price con useCurrency, duration_days, is_recommended BaseBadge, is_active BaseBadge, acciones: Editar RouterLink a admin-package-edit y toggle Activar/Desactivar con BaseButton). Crear src/components/packages/PackageForm.vue: BaseInput (name, price number, duration_days number), BaseTextarea (description), input/BaseInput currency (default 'MXN', uppercase), editor de includes (inputs dinámicos add/remove → array de strings), checkboxes is_recommended e is_active. Validación cliente alineada a CHECKs (price>0, currency 3 mayúsculas, duration>0, name 1-120). Props initialValue, saving; emite submit con payload.",
      files: ['src/components/packages/PackageTable.vue', 'src/components/packages/PackageForm.vue'],
      acceptance: ['el form valida antes de enviar; includes produce array de strings; currency default MXN'],
    },
    {
      title: 'Componentes de Ejercicios (ExerciseTable + ExerciseForm)',
      details:
        "Crear src/components/exercises/ExerciseTable.vue (BaseTable: name, category, muscle_group, level BaseBadge con etiqueta español básico/intermedio/avanzado, indicador 'tiene video' BaseBadge, acciones: Editar RouterLink + Eliminar BaseButton con confirmación; mostrar visualmente el error 'en uso'). Crear src/components/exercises/ExerciseForm.vue: BaseInput (name, muscle_group, equipment), BaseSelect category (Pierna, Empuje, Jalón, Core, Movilidad, Cardio, Metcon, Full body), BaseSelect level (valores basic/intermediate/advanced, etiquetas español), BaseTextarea (description, common_mistakes), FileUpload para el video con preview (<video>: para archivo local usar URL.createObjectURL; para video ya guardado en edición pedir signed URL con getPreviewUrl), botón 'Reemplazar video'. Emite submit con { fields, file }.",
      files: ['src/components/exercises/ExerciseTable.vue', 'src/components/exercises/ExerciseForm.vue'],
      acceptance: ['en edición muestra preview del video guardado (signed URL); al elegir archivo nuevo muestra preview local; validación de tamaño/mime visible'],
    },
    {
      title: 'Vistas admin + rutas + navegación',
      details:
        "Crear src/views/admin/AdminPackagesView.vue (lista con PackageTable + botón 'Nuevo paquete'; usePackagesAdmin; patrón visual de AdminPurchasesView). src/views/admin/AdminPackageFormView.vue (crear y editar; detecta id de props; PackageForm + composable; al guardar navega a /admin/packages). src/views/admin/AdminExercisesView.vue (lista con ExerciseTable + botón 'Nuevo ejercicio'; useExercisesAdmin). src/views/admin/AdminExerciseFormView.vue (crear/editar; ExerciseForm + composable). Modificar src/router/index.js: añadir en /admin: packages (admin-packages), packages/create (admin-package-create), packages/:id/edit (admin-package-edit, props:true), exercises (admin-exercises), exercises/create (admin-exercise-create), exercises/:id/edit (admin-exercise-edit, props:true), todas lazy import(). Modificar src/layouts/AdminLayout.vue: añadir navegación 'Paquetes' → /admin/packages y 'Ejercicios' → /admin/exercises.",
      files: [
        'src/views/admin/AdminPackagesView.vue',
        'src/views/admin/AdminPackageFormView.vue',
        'src/views/admin/AdminExercisesView.vue',
        'src/views/admin/AdminExerciseFormView.vue',
        'src/router/index.js',
        'src/layouts/AdminLayout.vue',
      ],
      acceptance: ['navegación crear→lista y editar→lista fluida; estados loading/error/empty consistentes; rutas bajo guard admin'],
    },
  ],
  qa: [
    {
      title: 'Helpers de seed + e2e de paquetes',
      details:
        "En tests/e2e/helpers.js añadir (si hace falta) seedExercise({ videoPath }) y seedRoutineWithExercise(...) con service role (patrón seedPurchase, respetando FK compuestas y CHECKs). Crear tests/e2e/admin-packages.spec.js (test.skip(!hasServiceRole); beforeAll crea admin+promoteToAdmin): crear paquete (name único, price, currency MXN, duration, includes) y verlo en /admin/packages; editar (cambiar price/description) y ver el cambio; desactivar → visitar /packages (público) y verificar que NO aparece; reactivar → aparece. Selección por getByLabel/getByRole; usa loginViaUi (ya espera la redirección).",
      files: ['tests/e2e/helpers.js', 'tests/e2e/admin-packages.spec.js'],
      acceptance: ['crear/editar pasan; el catálogo público refleja is_active (desactivar oculta, reactivar muestra)'],
    },
    {
      title: 'e2e de ejercicios con subida de video',
      details:
        "Crear tests/e2e/admin-exercises.spec.js (test.skip(!hasServiceRole); admin en beforeAll). El fixture ya existe en tests/e2e/fixtures/sample.mp4. Casos: (1) crear ejercicio con todos los campos + setInputFiles(fixtures/sample.mp4) → aparece en /admin/exercises con indicador 'tiene video'; (2) abrir editar y verificar que el preview <video> tiene src no vacío (signed URL); (3) reemplazar el video con otro archivo y verificar que sigue con video (opcional: leer exercises.video_path vía service key y ver que cambió); (4) borrado bloqueado por FK: sembrar routine+routine_days+routine_exercises que referencie el ejercicio (seedRoutineWithExercise), intentar eliminar desde la UI → mensaje 'en uso' y el ejercicio permanece; (5) borrado exitoso: crear ejercicio con video, eliminarlo (sin uso), verificar que la fila se borró (vía service key) y el flujo no dejó error.",
      files: ['tests/e2e/admin-exercises.spec.js'],
      acceptance: ['crear/editar/reemplazar/borrar cubiertos; borrado en uso bloqueado con mensaje; sin error en borrado exitoso; no depende de MP'],
    },
    {
      title: 'pgTAP de políticas de Storage (o degradar a e2e)',
      details:
        "Intentar crear supabase/tests/database/005_storage_policies.test.sql (patrón 002_rls): admin puede INSERT en storage.objects con name bajo 'exercises/...'; cliente no-admin NO puede insertar; cliente solo SELECT un objeto cuyo exercises.video_path pertenece a una rutina assigned suya (can_access_exercise_video); admin SELECT cualquiera del bucket. Si insertar en storage.objects resulta frágil en el harness local, DEGRADAR: no incluir el archivo (o dejarlo mínimo y estable) y documentar en docs/testing-and-harness.md que la cobertura de Storage se hace vía e2e (caso ejercicios). Si se añade el archivo, cuidar plan(N) exacto y no romper db:test.",
      files: ['supabase/tests/database/005_storage_policies.test.sql', 'docs/testing-and-harness.md'],
      acceptance: ['db:test sigue verde (con el nuevo archivo con plan(N) exacto, o sin él documentando la cobertura e2e)'],
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

Reglas: cíñete a tus tareas; reusa lo existente; código limpio y terminado (sin placeholders) que cumpla los criterios de aceptación y las decisiones de diseño. No corras build ni tests. Al terminar reporta archivos creados/modificados y notas (decisiones/riesgos).`
}

phase('Datos')
const data = await agent(builderPrompt('BACKEND/DATOS (services + composables)', plan.data), {
  schema: BUILD_RESULT_SCHEMA,
  label: 'data',
  phase: 'Datos',
})
log(`Datos: +${data.created.length} nuevos, ${data.modified.length} modificados`)

phase('UI')
const ui = await agent(builderPrompt('FRONTEND (componentes + vistas + rutas + nav)', plan.ui, data), {
  schema: BUILD_RESULT_SCHEMA,
  label: 'ui',
  phase: 'UI',
})
log(`UI: +${ui.created.length} nuevos, ${ui.modified.length} modificados`)

phase('QA')
const qa = await agent(builderPrompt('QA (pruebas e2e + pgTAP)', plan.qa, { data, ui }), {
  schema: BUILD_RESULT_SCHEMA,
  label: 'qa-tests',
  phase: 'QA',
})
log(`QA: +${qa.created.length} nuevos, ${qa.modified.length} modificados`)

return { phaseTitle: 'Fase 9', data, ui, qa }
