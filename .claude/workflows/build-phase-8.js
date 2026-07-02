export const meta = {
  name: 'build-phase-8',
  description: 'Equipo de agentes construye la Fase 8 (Administrador básico, solo lectura) con plan aprobado',
  phases: [
    { title: 'Base+Datos', detail: 'BaseTable/BaseBadge + adminService + composables' },
    { title: 'Vistas', detail: 'dashboard, clientes, detalle, compras, cuestionarios + rutas/nav' },
    { title: 'QA', detail: 'e2e admin + helper seedQuestionnaire' },
  ],
}

const DIR = '/Users/camacho/Documents/Pagina Web Functional Fitness'

const CONVENTIONS = `Convenciones OBLIGATORIAS:
- Vue 3 Composition API con <script setup>; TailwindCSS v4 (verde SOLO acento).
- Acceso a Supabase SIEMPRE vía services en src/services/ (patrón packagesService/paymentService/questionnaireService: importan supabase de ./supabaseClient y lanzan en error). NUNCA importar supabaseClient en componentes/vistas.
- Composables (patrón usePackages/useQuestionnaire): refs loading/error/data + load(); error en español; no tocan supabase directo.
- Pinia solo sesión (useAuthStore expone user, isAdmin, homeRoute).
- Migraciones forward-only (última 20260701000100). En esta fase NO se crean migraciones.
- Nombres en inglés, textos de UI en español. Reusar BaseButton/BaseCard/BaseInput/BaseSelect/BaseTextarea/EmptyState/LoadingSpinner y el helper useCurrency.formatCurrency.
- DECISIÓN TÉCNICA: NO usar embedding PostgREST entre profiles y purchases/questionnaires/routines (no hay FK directa; todas apuntan a auth.users). Leer por separado y unir por user_id EN EL CLIENTE. Sí se puede embeber donde hay FK real (purchases.package_id→packages, etc.) pero para admin basta el snapshot package_name de purchases.
- El área /admin ya tiene guard (meta requiresAuth + role:'admin'); un no-admin es redirigido a homeRoute.
- No corras build ni tests: el gate lo hará después.`

const plan = {
  summary:
    'Fase 8 — Administrador básico SOLO LECTURA. La RLS de admin (private.is_admin()) ya permite leer profiles/user_roles/purchases/questionnaires/routines/exercises; sin migraciones. Se agregan BaseBadge y BaseTable, un adminService con lecturas y agregaciones de dashboard (join por user_id en cliente, sin embedding profiles↔purchases), composables por vista, y las vistas dashboard/clientes/detalle/compras/cuestionarios con sus rutas y navegación. Cuestionarios incluye un botón "Crear/asignar rutina" que SOLO prepara/enlaza (la creación es Fase 9). Definir y documentar en la UI/JSDoc los criterios de "cliente activo" (con compra approved vigente: end_date>now o approved) y "rutina pendiente" (compra approved sin routine assigned).',
  baseData: [
    {
      title: 'BaseBadge.vue',
      details:
        "Crear src/components/common/BaseBadge.vue: badge de estado con prop variant (neutral|success|warning|danger|info) mapeada a clases Tailwind (success usa el verde de acento: bg-brand-green/10 text-brand-green; el resto neutral/amber/red/blue suaves). Slot para el texto. Estilo pill 'rounded-full px-3 py-1 text-xs font-semibold' consistente con el usado en ClientPurchasesView. Validator en la prop como BaseButton; variant inválido cae a neutral.",
      files: ['src/components/common/BaseBadge.vue'],
      acceptance: ['renderiza texto con clases según variant; variant inválido → neutral; verde solo en success'],
    },
    {
      title: 'BaseTable.vue',
      details:
        "Crear src/components/common/BaseTable.vue accesible y responsive. Props: columns (array {key,label,align?}) y rows (array de objetos). Slots por columna con nombre #cell-<key> (fallback a row[key]). Estado vacío vía slot #empty o EmptyState cuando rows.length===0. Contenedor estilo BaseCard (border neutral-200, bg-white, rounded-xl shadow-sm), overflow-x-auto para móvil, thead con estilo del proyecto. <script setup>.",
      files: ['src/components/common/BaseTable.vue'],
      acceptance: ['pinta filas desde columns/rows; usa slot custom si se provee; muestra vacío cuando no hay filas'],
    },
    {
      title: 'adminService.js',
      details:
        "Crear src/services/adminService.js (funciones exportadas + JSDoc; solo importa supabase de supabaseClient; throw en error; [] o null en vacío). Funciones: fetchClients() (profiles: id, full_name, email, phone, created_at, order created_at desc); fetchAllRoles() (user_roles: user_id, role); fetchAllPurchases() (purchases: id,user_id,package_name,amount,currency,payment_status,mercado_pago_payment_id,start_date,end_date,created_at order created_at desc); fetchClientById(userId) (profile maybeSingle); fetchPurchasesByUser(userId); fetchAllQuestionnaires() y fetchQuestionnairesByUser(userId) (objetivo/nivel/días/equipo/lesiones + purchase_id + user_id); fetchRoutinesByUser(userId) (id,name,status,purchase_id,assigned_at); y agregaciones: pending purchases via count exact head; approved purchases del mes (created_at>=inicio de mes) seleccionando amount/currency para sumar en cliente; clientes activos (user_id distintos con compra approved vigente); rutinas pendientes de asignar (purchase_id de approved menos purchase_id de routines assigned, unido en cliente). JSDoc que explique la estrategia de join por user_id y la ausencia de embedding profiles↔purchases.",
      files: ['src/services/adminService.js'],
      acceptance: [
        'ninguna función hace embedding profiles↔purchases; todas lanzan en error',
        'agregaciones documentadas (criterio de activo/pendiente y uso de created_at como fecha de venta)',
      ],
    },
    {
      title: 'Composables admin',
      details:
        "Crear src/composables/useAdminDashboard.js (metrics, latestPurchases, topPackages, loading, error, load; carga en paralelo con Promise.all; paquetes más vendidos = agrupar approved por package_name en cliente); useAdminClients.js (lista de clientes unida con rol y plan/estado derivados por user_id); useAdminClient.js (detalle: profile + purchases + questionnaires + routines por user_id); useAdminPurchases.js (compras + full_name/email del cliente unidos por user_id); useAdminQuestionnaires.js (cuestionarios + compra relacionada + datos de cliente unidos por user_id). Patrón usePackages; error en español; sin supabase directo.",
      files: [
        'src/composables/useAdminDashboard.js',
        'src/composables/useAdminClients.js',
        'src/composables/useAdminClient.js',
        'src/composables/useAdminPurchases.js',
        'src/composables/useAdminQuestionnaires.js',
      ],
      acceptance: ['el join por user_id produce nombre/correo correctos; load() idempotente; errores en español'],
    },
  ],
  views: [
    {
      title: 'AdminDashboardView (reemplazar placeholder)',
      details:
        "Reescribir src/views/admin/AdminDashboardView.vue con useAdminDashboard. Tarjetas (BaseCard) con métricas reales: ventas del mes (useCurrency.formatCurrency), clientes activos, compras pendientes, rutinas pendientes de asignar. Sección 'Últimas compras' (BaseTable: cliente, paquete, monto, estado con BaseBadge, fecha). Sección 'Paquetes más vendidos' (nombre + conteo). LoadingSpinner/error/EmptyState. Mantener eyebrow verde y tipografía.",
      files: ['src/views/admin/AdminDashboardView.vue'],
      acceptance: ['con datos sembrados las 4 métricas muestran números reales (no —); últimas compras listadas'],
    },
    {
      title: 'AdminClientsView + AdminClientDetailView',
      details:
        "Crear src/views/admin/AdminClientsView.vue (BaseTable: nombre, correo, teléfono, plan actual [paquete de la compra approved vigente más reciente], estado [BaseBadge activo/inactivo], fecha registro, enlace RouterLink a /admin/clients/:id). Crear src/views/admin/AdminClientDetailView.vue (props:true id; useAdminClient(id)): secciones en BaseCard — datos del cliente, historial de compras (BaseTable), cuestionarios contestados (objetivo/nivel/días/equipo/lesiones), rutinas asignadas (nombre + estado BaseBadge), estado actual. Loading/error/EmptyState por sección.",
      files: [
        'src/views/admin/AdminClientsView.vue',
        'src/views/admin/AdminClientDetailView.vue',
      ],
      acceptance: [
        'la lista muestra un cliente sembrado con plan/estado derivados y enlace al detalle',
        'el detalle muestra datos + compra + cuestionario unidos por user_id',
      ],
    },
    {
      title: 'AdminPurchasesView + AdminQuestionnairesView',
      details:
        "Crear src/views/admin/AdminPurchasesView.vue (BaseTable solo lectura: cliente [unido por user_id], paquete [package_name], precio [formatCurrency], estado [BaseBadge de payment_status], id de Mercado Pago, fecha, inicio, vencimiento; sin controles de edición). Crear src/views/admin/AdminQuestionnairesView.vue (cliente, compra relacionada [package_name], objetivo, nivel, días, equipo, lesiones; botón 'Crear/asignar rutina' por fila que SOLO enlaza/prepara: RouterLink a una ruta futura de constructor con query purchaseId, o BaseButton deshabilitado con texto 'Disponible en Fase 9' — NO realiza escritura). Loading/error/EmptyState.",
      files: [
        'src/views/admin/AdminPurchasesView.vue',
        'src/views/admin/AdminQuestionnairesView.vue',
      ],
      acceptance: [
        'compra approved sembrada aparece con estado/fechas; sin controles de edición',
        'cuestionario sembrado se lista con objetivo/nivel/días; el botón de rutina no escribe nada',
      ],
    },
    {
      title: 'Rutas admin + navegación',
      details:
        "Modificar src/router/index.js: añadir como children de /admin (heredan meta requiresAuth+role:admin): clients (name admin-clients → AdminClientsView), clients/:id (name admin-client-detail → AdminClientDetailView, props:true), purchases (name admin-purchases → AdminPurchasesView), questionnaires (name admin-questionnaires → AdminQuestionnairesView). Lazy import(). Modificar src/layouts/AdminLayout.vue: ampliar el array navigation con Dashboard, Clientes, Compras, Cuestionarios (label español, to correcto).",
      files: ['src/router/index.js', 'src/layouts/AdminLayout.vue'],
      acceptance: ['cada ruta admin funciona para admin y rebota a homeRoute para no-admin; sidebar con 4 enlaces'],
    },
  ],
  qa: [
    {
      title: 'Helper seedQuestionnaire + e2e admin (con service role)',
      details:
        "Modificar tests/e2e/helpers.js: añadir seedQuestionnaire({ userId, purchaseId, values }) que POSTee a /rest/v1/questionnaires con SUPABASE_SERVICE_ROLE_KEY (patrón de seedPurchase), respetando la FK compuesta (purchase_id,user_id) a una compra approved y rangos válidos (age, days_per_week, etc.). Crear tests/e2e/admin.spec.js (patrón questionnaire.spec.js, test.skip(!hasServiceRole)): crear admin (promoteToAdmin) y un cliente distinto con compra approved (seedPurchase) y cuestionario (seedQuestionnaire); login admin por UI; afirmar dashboard con métricas reales y últimas compras; /admin/clients lista al cliente; detalle muestra compra + cuestionario; /admin/purchases muestra la compra con estado/fechas; /admin/questionnaires muestra objetivo/nivel/días y el botón de rutina.",
      files: ['tests/e2e/helpers.js', 'tests/e2e/admin.spec.js'],
      acceptance: ['con service role los tests ven datos reales; sin service role se saltan; seedQuestionnaire respeta constraints'],
    },
    {
      title: 'e2e guard no-admin (sin service role) + docs',
      details:
        "En tests/e2e/admin.spec.js añadir un test SIN service role (no skip): crear un cliente normal, login por UI, page.goto('/admin/dashboard'), afirmar redirección a /client/dashboard y que no se ve contenido admin. Documentar en docs/database.md la decisión de la Fase 8 (sin migraciones; admin lee vía RLS; join por user_id en cliente; sin embedding profiles↔purchases; criterios de 'cliente activo' y 'rutina pendiente').",
      files: ['tests/e2e/admin.spec.js', 'docs/database.md'],
      acceptance: ['el cliente no-admin termina en /client/dashboard sin ver contenido admin; doc actualizada'],
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

phase('Base+Datos')
const base = await agent(builderPrompt('FRONTEND (componentes base + service + composables)', plan.baseData), {
  schema: BUILD_RESULT_SCHEMA,
  label: 'base-data',
  phase: 'Base+Datos',
})
log(`Base+Datos: +${base.created.length} nuevos, ${base.modified.length} modificados`)

phase('Vistas')
const views = await agent(builderPrompt('FRONTEND (vistas admin + rutas + navegación)', plan.views, base), {
  schema: BUILD_RESULT_SCHEMA,
  label: 'views',
  phase: 'Vistas',
})
log(`Vistas: +${views.created.length} nuevos, ${views.modified.length} modificados`)

phase('QA')
const qa = await agent(builderPrompt('QA (pruebas e2e + helper)', plan.qa, { base, views }), {
  schema: BUILD_RESULT_SCHEMA,
  label: 'qa-tests',
  phase: 'QA',
})
log(`QA: +${qa.created.length} nuevos, ${qa.modified.length} modificados`)

return { phaseTitle: 'Fase 8', base, views, qa }
