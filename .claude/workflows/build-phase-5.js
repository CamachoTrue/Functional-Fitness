export const meta = {
  name: 'build-phase-5',
  description: 'Equipo de agentes construye la Fase 5 (catálogo de paquetes) con plan aprobado y arnés de verificación anidado',
  phases: [
    { title: 'Backend', detail: 'packagesService + verificación de lectura anónima' },
    { title: 'Frontend', detail: 'composables, PackageCard, vistas conectadas' },
    { title: 'QA', detail: 'e2e Playwright + pgTAP' },
    { title: 'Verificación', detail: 'arnés dev-harness anidado (verifica + auto-repara)' },
  ],
}

const DIR = '/Users/camacho/Documents/Pagina Web Functional Fitness'

const CONVENTIONS = `Convenciones OBLIGATORIAS del proyecto:
- Vue 3 + Vite + Composition API con <script setup>. Nunca Options API.
- TailwindCSS v4 (utilidades ya definidas: page-container, focus-ring; colores brand-green, ink, surface-muted).
- Vue Router para rutas; Pinia solo para estado global (existe stores/authStore.js con useAuthStore, isAuthenticated, homeRoute).
- Acceso a Supabase SIEMPRE vía un service en src/services/ (existen supabaseClient.js y authService.js — sigue ese patrón exacto). NUNCA importar supabase directo en vistas/componentes.
- Reusar componentes base: BaseButton (variant primary/secondary/ghost), BaseCard, BaseInput, EmptyState (props title/description), LoadingSpinner. Si necesitas un badge y no existe BaseBadge, créalo en components/common siguiendo el estilo.
- Nombres en inglés para archivos/variables/funciones; textos visibles en español.
- Estética premium/minimalista: blanco, negro, gris; verde (brand-green) SOLO como acento (badge recomendado).
- El router usa named routes: 'packages' (/packages) y 'package-detail' (/package/:id, props:true). Rutas de auth: 'login' con meta.guestOnly.
- No corras build ni tests: el arnés de verificación lo hará después.`

// Plan aprobado por el usuario (checkpoint humano).
const plan = {
  summary:
    'Fase 5 — Catálogo público de paquetes conectado a Supabase. La DB ya está lista (tabla packages, grant anon, policy packages_read_active, seed con 3 paquetes). Crear packagesService, composables (usePackages/usePackage + formato de moneda), PackageCard sobre BaseCard, conectar PackagesView y PackageDetailView con estados carga/vacío/error, enlazar navegación, y cobertura e2e + pgTAP. Compra/Mercado Pago queda fuera (Fase 6); el CTA del detalle solo prepara la autenticación previa preservando el return path.',
  backend: [
    {
      title: 'Verificar y documentar la lectura anónima del catálogo',
      details:
        'No crear migraciones nuevas ni cambiar el esquema de public.packages. Confirmar que el seed deja 3 paquetes activos y que la anon key solo devuelve activos. Documentar en docs/database.md (sección de reglas de seguridad) que el catálogo público expone únicamente paquetes con is_active=true mediante el rol anon.',
      files: ['docs/database.md'],
      acceptance: [
        'docs/database.md menciona explícitamente que el catálogo público expone únicamente paquetes activos vía anon',
        'No se añaden migraciones nuevas ni se modifica el esquema de public.packages',
      ],
    },
    {
      title: 'Crear src/services/packagesService.js',
      details:
        "Seguir el patrón de authService.js: importar { supabase } de ./supabaseClient y exponer funciones async puras. fetchActivePackages(): select de id,name,description,price,currency,duration_days,includes,is_recommended de 'packages' con .eq('is_active', true), orden determinista .order('is_recommended', { ascending: false }).order('price', { ascending: true }); devolver data ?? []. fetchPackageById(id): mismo select con .eq('id', id).eq('is_active', true).maybeSingle(); devolver el objeto o null. Ambas relanzan el error con if (error) throw error. Sin lógica de formato/presentación.",
      files: ['src/services/packagesService.js'],
      acceptance: [
        'fetchActivePackages() filtra is_active=true, orden determinista, devuelve siempre array',
        'fetchPackageById(id) filtra id e is_active=true, usa maybeSingle(), devuelve objeto o null',
        'Ambas relanzan el error de Supabase; ninguna vista importa supabase directo',
      ],
    },
  ],
  frontend: [
    {
      title: 'Composables usePackages, usePackage y helper de moneda',
      details:
        "src/composables/usePackages.js: expone refs packages(array), loading(bool), error(string|null) y load() que llama packagesService.fetchActivePackages() con loading en try/finally y mensaje de error en español ('No pudimos cargar los paquetes. Intenta de nuevo.'), dejando packages=[] ante error. src/composables/usePackage.js: usePackage(id) con pkg, loading, error, load() usando fetchPackageById. src/composables/useCurrency.js: helper formatCurrency(amount, currency='MXN') con Intl.NumberFormat('es-MX', { style:'currency', currency }). Nunca hardcodear símbolos ni llamar a Supabase desde composables (solo el service).",
      files: ['src/composables/usePackages.js', 'src/composables/usePackage.js', 'src/composables/useCurrency.js'],
      acceptance: [
        'usePackages() devuelve { packages, loading, error, load } reactivos y solo usa el service',
        'loading true durante la carga y false en éxito/error (try/finally); error en español; packages=[] ante error',
        'El precio se formatea con Intl.NumberFormat es-MX usando la moneda del paquete',
      ],
    },
    {
      title: 'Componente PackageCard.vue',
      details:
        "src/components/packages/PackageCard.vue con <script setup>. Prop pkg (Object, required). Construir sobre BaseCard. Mostrar nombre, descripción, precio formateado (useCurrency), duración legible ('30 días' desde duration_days) e includes como lista. Badge 'Recomendado' en brand-green solo si pkg.is_recommended (único uso destacado del verde). Link 'Ver detalle' vía RouterLink a { name:'package-detail', params:{ id: pkg.id } }. Estética minimalista, focus-ring en enlaces.",
      files: ['src/components/packages/PackageCard.vue'],
      acceptance: [
        'Usa <script setup>, prop pkg validada, reutiliza BaseCard',
        'Precio con helper de formato y moneda de pkg.currency; badge verde solo si is_recommended',
        "Link 'Ver detalle' por named route a package-detail con params.id; lista includes y duración en español",
      ],
    },
    {
      title: 'Conectar PackagesView.vue al catálogo real',
      details:
        "Reescribir src/views/public/PackagesView.vue para usar usePackages y llamar load() en onMounted. Render: LoadingSpinner mientras loading; mensaje de error (EmptyState con description=error) si error; grid responsive (grid gap, sm:grid-cols-2 lg:grid-cols-3) de PackageCard si hay paquetes; EmptyState ('No hay paquetes disponibles por ahora.') si vacío. Conservar encabezado y page-container. Eliminar el texto placeholder actual. No importar supabase/packagesService directo (solo composable y componentes).",
      files: ['src/views/public/PackagesView.vue'],
      acceptance: [
        'Al montar llama a load(); con el seed muestra 3 PackageCard y el Personalizado marcado Recomendado',
        'Estados loading/vacío/error en español, sin pantalla en blanco',
        'Sin texto placeholder ni import directo de supabase/packagesService',
      ],
    },
    {
      title: 'Conectar PackageDetailView.vue al paquete real',
      details:
        "Reescribir src/views/public/PackageDetailView.vue usando usePackage(id) (id llega por props:true). Cargar en onMounted. Render: LoadingSpinner mientras carga; contenido real (nombre, descripción, precio formateado, duración, includes, badge Recomendado si aplica) en BaseCard/page-container; EmptyState 'Paquete no disponible' si load() devuelve null o error. Mantener RouterLink 'Volver a paquetes'. CTA 'Quiero este plan' (BaseButton): si NO hay sesión (useAuthStore) navegar a { name:'login', query:{ redirect: ruta actual } }; si SÍ hay sesión, dejar preparado con comentario de que la compra/Mercado Pago es Fase futura. Textos en español.",
      files: ['src/views/public/PackageDetailView.vue'],
      acceptance: [
        'Carga el paquete por id y muestra datos reales; id inexistente/inactivo → EmptyState sin error visual',
        'CTA sin sesión redirige a login con query.redirect a la ruta del paquete',
        "Conserva 'Volver a paquetes'; sin placeholder; sin import directo de supabase",
      ],
    },
    {
      title: 'Enlazar el catálogo desde header y landing',
      details:
        'Confirmar/añadir enlace a { name:"packages" } en src/components/layout/PublicHeader.vue (ya existe link a /packages) y que HomeView.vue enlace a /packages. Solo navegación, sin estado nuevo. IMPORTANTE: respetar los cambios recientes del arnés en PublicHeader (logout con try/finally, links condicionados por sesión) — no revertirlos.',
      files: ['src/components/layout/PublicHeader.vue', 'src/views/public/HomeView.vue'],
      acceptance: [
        'Enlace visible a paquetes desde header y landing con focus-ring; sin estado nuevo en Pinia',
      ],
    },
  ],
  qa: [
    {
      title: 'e2e del catálogo público (anónimo)',
      details:
        "Crear tests/e2e/packages.spec.js (estilo de auth.spec.js, reutilizar helpers.js). Casos: (1) /packages muestra los 3 nombres del seed ('Plan Basico','Plan Personalizado','Plan Premium') y el Personalizado tiene badge 'Recomendado'; (2) click en 'Ver detalle' navega a /package/<id> y muestra nombre/precio; (3) en el detalle, el CTA de compra sin sesión redirige a /login con query redirect. Localizar por NOMBRE (no por posición) y verificar precio por dígitos (ej. '499'), no por string formateado exacto. 100% anónimo, sin service role.",
      files: ['tests/e2e/packages.spec.js'],
      acceptance: [
        'test:e2e ejecuta packages.spec.js y pasa contra Supabase local con seed',
        'Verifica los 3 paquetes, el badge Recomendado, navegación al detalle y CTA sin sesión → login',
        'No depende de SUPABASE_SERVICE_ROLE_KEY; selectores por nombre y precio por dígitos',
      ],
    },
    {
      title: 'pgTAP: lectura anónima solo de paquetes activos',
      details:
        'Crear supabase/tests/database/003_packages_read.test.sql (patrón de 002_rls.test.sql: begin, plan, set role, tests, finish, rollback). Cubrir: (1) anon ve los paquetes activos del seed; (2) tras insertar un paquete inactivo (rol setup) y cambiar a anon, ese paquete NO aparece; (3) anon no puede insert/update/delete en packages. Ejecutable con db:test.',
      files: ['supabase/tests/database/003_packages_read.test.sql'],
      acceptance: [
        'db:test pasa incluyendo los nuevos asserts',
        'Verifica que anon ve activos, NO ve inactivos y no puede escribir en packages',
      ],
    },
  ],
  risks: [
    'Compra/Mercado Pago fuera de alcance (Fase 6): el CTA solo prepara la autenticación previa.',
    'Tests dependen de Supabase local con seed (ya corriendo).',
    'No acoplar e2e a posiciones fijas ni al formato exacto del precio.',
    'El arnés de la Fase 4 modificó PublicHeader/DashboardSidebar/authStore/router/vistas de auth: no revertir esos cambios.',
  ],
}

function builderPrompt(domain, tasks, priorContext) {
  return `Eres el desarrollador ${domain.toUpperCase()} del proyecto Vue 3 + Supabase en \`${DIR}\`.
${CONVENTIONS}

Plan aprobado (resumen): ${plan.summary}
${priorContext ? `Trabajo ya realizado por etapas previas: ${JSON.stringify(priorContext)}` : ''}

Implementa ESTAS tareas de tu dominio, creando/editando archivos reales en el working tree:
${JSON.stringify(tasks)}

Reglas: cíñete a tu dominio; reusa lo existente; migraciones forward-only; código limpio y terminado (sin placeholders) que cumpla los criterios de aceptación. Al terminar reporta archivos creados/modificados y notas.`
}

function qaPrompt(backendResult, frontendResult) {
  return `Eres el ingeniero de QA del proyecto Vue 3 + Supabase en \`${DIR}\`.
${CONVENTIONS}

Plan aprobado (resumen): ${plan.summary}
Backend entregó: ${JSON.stringify(backendResult)}
Frontend entregó: ${JSON.stringify(frontendResult)}

Escribe/actualiza las pruebas de esta fase siguiendo estas tareas:
${JSON.stringify(plan.qa)}

Detalles: e2e Playwright en tests/e2e/ (patrón de helpers.js/auth.spec.js; dev server y Supabase ya corren, webServer reuseExistingServer). pgTAP en supabase/tests/database/. Cubre camino feliz y estados vacío/error; aserciones fuertes sin falsos positivos; selectores por nombre. No corras los tests. Reporta archivos creados/modificados y notas.`
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

phase('Backend')
const backendResult = await agent(builderPrompt('backend', plan.backend), {
  schema: BUILD_RESULT_SCHEMA,
  label: 'backend-dev',
  phase: 'Backend',
})
log(`Backend: +${backendResult.created.length} nuevos, ${backendResult.modified.length} modificados`)

phase('Frontend')
const frontendResult = await agent(builderPrompt('frontend', plan.frontend, backendResult), {
  schema: BUILD_RESULT_SCHEMA,
  label: 'frontend-dev',
  phase: 'Frontend',
})
log(`Frontend: +${frontendResult.created.length} nuevos, ${frontendResult.modified.length} modificados`)

phase('QA')
const qaResult = await agent(qaPrompt(backendResult, frontendResult), {
  schema: BUILD_RESULT_SCHEMA,
  label: 'qa-tests',
  phase: 'QA',
})
log(`QA: +${qaResult.created.length} pruebas nuevas`)

phase('Verificación')
log('Ejecutando el arnés de verificación (dev-harness)…')
const harness = await workflow({ scriptPath: `${DIR}/.claude/workflows/dev-harness.js` })

return { phaseTitle: 'Fase 5', backendResult, frontendResult, qaResult, harness }
