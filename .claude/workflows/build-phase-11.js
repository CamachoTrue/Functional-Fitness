export const meta = {
  name: 'build-phase-11',
  description: 'Equipo aplica la Fase 11 (pulido final): secciones públicas + pulido transversal + QA',
  phases: [
    { title: 'Secciones', detail: 'FAQ, testimonios, CTA, WhatsApp + integración' },
    { title: 'Pulido', detail: 'copy en español, responsive, a11y, estados' },
    { title: 'QA', detail: 'e2e secciones públicas + ajustar e2e afectados + checklist' },
  ],
}

const DIR = '/Users/camacho/Documents/Pagina Web Functional Fitness'

const CONVENTIONS = `Convenciones OBLIGATORIAS:
- Vue 3 <script setup>; TailwindCSS v4 (utilidades page-container/focus-ring; colores brand-green/ink/surface-muted; VERDE SOLO acento).
- Acceso a Supabase solo vía services (las secciones nuevas son ESTÁTICAS: no tocan services/DB). Nunca importar supabaseClient en componentes.
- Reusar componentes base (BaseButton/BaseCard/BaseBadge/EmptyState/LoadingSpinner). Textos UI en español, nombres en inglés. Sin migraciones.
- Tono de marca: profesional, motivador, directo (no 'coach cliché').
- IMPORTANTE (no romper tests): varios e2e anclan por TEXTO visible. ANTES de cambiar cualquier <h1>/copy/estado, hacer grep del string en tests/e2e/ y actualizar el test afectado EN EL MISMO cambio.
- No corras build ni tests: el gate lo hará después.
- Decisiones del usuario: el botón de WhatsApp va en PublicLayout (todas las páginas públicas); VITE_WHATSAPP_NUMBER ya está en .env.local (placeholder 5215555555555); el botón renderiza solo si la env está definida (v-if) y degrada si no.`

const plan = {
  summary:
    'Fase 11 — Pulido final. (A) Secciones públicas nuevas (FaqSection con <details>, TestimonialsSection con 3 placeholders, CtaSection banda negra → /register y /packages, WhatsAppButton flotante en PublicLayout con href wa.me y VITE_WHATSAPP_NUMBER) integradas en HomeView/PublicLayout. (B) Pulido transversal con hallazgos concretos: quitar copy obsoleto "Fase 9" en AdminClientDetailView y añadir enlace real al constructor; mapear a español el payment_status en PaymentResultView y los enums (experience_level/equipment) en las vistas admin de cuestionarios/ficha; unificar "Mis compras"/"Mi evaluación"; h1 responsive (text-3xl sm:text-4xl) en catálogo/detalle; skip link "Saltar al contenido" con id="main" en los 3 layouts; badges de estado siempre en español. (C) QA: e2e de secciones públicas + ajustar e2e afectados por copy + checklist manual. Sin migraciones.',
  sections: [
    {
      title: 'FaqSection, TestimonialsSection, CtaSection',
      details:
        "Crear src/components/public/FaqSection.vue: array local faqs (4-6 en español: equipo/gimnasio, cómo se personaliza [menciona el cuestionario], videos de ejercicios, entrenar desde casa, qué pasa al terminar el plan [renovación=nueva compra], cómo pago [Mercado Pago]); usar <details>/<summary> nativos con focus-ring en el summary; un <h2> 'Preguntas frecuentes' + eyebrow verde; page-container. Crear src/components/public/TestimonialsSection.vue: array local con 3 testimonios placeholder (comentario 'TODO: reemplazar por testimonios reales'), grid sm:grid-cols-2 lg:grid-cols-3 con BaseCard, iniciales decorativas aria-hidden (sin <img> sin alt), <h2>. Crear src/components/public/CtaSection.vue: banda bg-black text-white con <h2> motivador ('¿Listo para empezar?') y dos RouterLink: 'Quiero comenzar' a /register y 'Ver paquetes' a /packages (estilo botón del hero, focus-ring, min-h-12). Verde solo acento. IMPORTANTE: usar textos del CTA final DISTINTOS o acotables respecto al hero para no crear selectores ambiguos en e2e (p.ej. 'Quiero comenzar' en el CTA final).",
      files: [
        'src/components/public/FaqSection.vue',
        'src/components/public/TestimonialsSection.vue',
        'src/components/public/CtaSection.vue',
      ],
      acceptance: [
        'FAQ: ≥4 preguntas, expand/colapsa por teclado, un solo <h2>, focus-ring en summary',
        'Testimonios: 3 tarjetas, sin <img> sin alt; CTA: enlaces a /register y /packages con focus-ring',
      ],
    },
    {
      title: 'WhatsAppButton + integración en layout/home',
      details:
        "Crear src/components/common/WhatsAppButton.vue: enlace fixed bottom-5 right-5 z-40, redondeado, focus-ring; href = `https://wa.me/${num}?text=${encodeURIComponent('Hola, tengo una duda sobre los planes de Functional Fitness')}` con num = import.meta.env.VITE_WHATSAPP_NUMBER; v-if=Boolean(num) (degrada si no está); aria-label='Escríbenos por WhatsApp', target='_blank', rel='noopener noreferrer'; icono SVG inline aria-hidden. Modificar src/layouts/PublicLayout.vue: montar <WhatsAppButton /> (acompaña todas las públicas). Modificar src/views/public/HomeView.vue: importar y montar en orden hero → sección clara existente → TestimonialsSection → FaqSection → CtaSection; mantener el ÚNICO <h1> del hero. Modificar .env.example: añadir VITE_WHATSAPP_NUMBER con comentario de formato (código país + número, solo dígitos, ej. México) y nota de que es público.",
      files: [
        'src/components/common/WhatsAppButton.vue',
        'src/layouts/PublicLayout.vue',
        'src/views/public/HomeView.vue',
        '.env.example',
      ],
      acceptance: [
        'con la env definida el href es https://wa.me/<digitos>?text=...; target _blank + rel noopener; aria-label español; sin env no rompe',
        'Home monta las 3 secciones y sigue habiendo exactamente un <h1>; el botón WA aparece en las páginas públicas',
      ],
    },
  ],
  polish: [
    {
      title: 'Copy obsoleto y enlace real a rutinas + enums/estado en español',
      details:
        "AdminClientDetailView.vue: eliminar el texto 'La creación de rutinas llega en la Fase 9' (línea ~256) y añadir un RouterLink a { name:'admin-routine-create', query:{ userId, purchaseId } } (patrón de AdminQuestionnairesView) para 'Crear/asignar rutina' sobre pendingRoutinePurchases; además mapear experience_level (basic→Principiante, intermediate→Intermedio, advanced→Avanzado) y equipment/training_place/objective/preferred_schedule a etiquetas en español (reusar los mapeos de QuestionnaireForm si existen o definir un mapa compartido pequeño). PaymentResultView.vue: mapear la celda 'Estado' (payment_status) a etiqueta español (approved→Aprobada, pending→Pendiente, rejected→Rechazada, cancelled→Cancelada, refunded→Reembolsada, expired→Vencida), no mostrar el valor crudo. AdminQuestionnairesView.vue: badge de purchase_status y celdas de nivel/objetivo/equipo en español. NINGUNA mención a 'Fase N' debe quedar en la UI. Antes de cambiar textos, grep en tests/e2e/ y actualizar los asserts afectados.",
      files: [
        'src/views/admin/AdminClientDetailView.vue',
        'src/views/payment/PaymentResultView.vue',
        'src/views/admin/AdminQuestionnairesView.vue',
      ],
      acceptance: [
        'no queda copy de "Fase N" ni enums en inglés en la UI; el enlace del detalle navega al constructor con userId+purchaseId',
        'la fila Estado de PaymentResultView siempre muestra texto en español',
      ],
    },
    {
      title: 'Consistencia de nombres, responsive h1 y skip links',
      details:
        "Unificar el destino /client/purchases: que el <h1> de ClientPurchasesView y el label del sidebar en ClientLayout coincidan conceptualmente (elegir 'Mi evaluación' en ambos o 'Mis compras' en ambos; ser consistente y actualizar e2e que anclen por 'Mis compras'). Responsive: en PackagesView y PackageDetailView cambiar el <h1> a 'text-3xl sm:text-4xl' (evitar apretar en 320px); opcionalmente en headers admin/cliente 'text-2xl sm:text-3xl'. Accesibilidad — skip link: en PublicLayout, AdminLayout y ClientLayout añadir un enlace 'Saltar al contenido' con clases sr-only + focus:not-sr-only apuntando a #main, y dar id='main' al <main> correspondiente. Verificar que AdminExercisesView/AdminPackagesView/AdminExerciseFormView/AdminPackageFormView tengan los 3 estados (loading/empty/error) y alinear si falta alguno.",
      files: [
        'src/views/client/ClientPurchasesView.vue',
        'src/layouts/ClientLayout.vue',
        'src/layouts/PublicLayout.vue',
        'src/layouts/AdminLayout.vue',
        'src/views/public/PackagesView.vue',
        'src/views/public/PackageDetailView.vue',
      ],
      acceptance: [
        'label del sidebar y <h1> coinciden; catálogo/detalle sin desbordes en móvil',
        'skip link presente en los 3 layouts (visible al enfocar) apuntando a #main; los 4 forms admin tienen los 3 estados',
      ],
    },
  ],
  qa: [
    {
      title: 'e2e de secciones públicas + ajustar e2e afectados',
      details:
        "Crear tests/e2e/home-public-sections.spec.js (100% anónimo, patrón packages.spec.js): (1) FAQ visible (heading /preguntas frecuentes/i + al menos una pregunta; opcional expandir un <details>); (2) Testimonios: heading visible + 3 tarjetas; (3) CTA final navega a /register (acotar el selector al CtaSection por su heading/sección para no chocar con el hero) → toHaveURL(/\\/register/); (4) CTA 'Ver paquetes' del CtaSection → /packages; (5) WhatsApp: localizar por aria-label 'Escríbenos por WhatsApp', getAttribute('href') matchea /^https:\\/\\/wa\\.me\\/\\d+/ y contiene '?text='; si VITE_WHATSAPP_NUMBER no está, test.skip. AJUSTAR e2e existentes afectados por los cambios de copy: revisar tests/e2e/checkout.spec.js (estado de pago en español), tests/e2e/questionnaire.spec.js (si cambió el h1 'Mis compras'), y cualquier assert sobre textos cambiados; hacer grep y actualizar. Verificar que el botón flotante WA (z-40) no tape CTAs que otros e2e clican; si solapa, ajustar.",
      files: [
        'tests/e2e/home-public-sections.spec.js',
        'tests/e2e/checkout.spec.js',
        'tests/e2e/questionnaire.spec.js',
      ],
      acceptance: [
        'home-public-sections pasa (FAQ, testimonios, CTA→register/packages, href WA); e2e existentes siguen verdes tras los ajustes de copy',
        'el botón WA no rompe selectores/clicks de otros e2e',
      ],
    },
    {
      title: 'Checklist de prueba manual (docs)',
      details:
        "Añadir a docs/testing-and-harness.md una sección 'Prueba manual del flujo completo (Fase 11)' con el checklist de punta a punta: registro→catálogo→detalle→login(redirect)→compra approved (seed)→cuestionario→admin arma/asigna rutina→cliente ve rutina y reproduce video; más verificación de estados vacío/carga/error, responsive 320-390px, navegación por teclado (skip link, foco visible) y el botón de WhatsApp. Nota de que el gate es npm run verify (sin | tail).",
      files: ['docs/testing-and-harness.md'],
      acceptance: ['el checklist manual queda documentado y cubre el flujo completo + a11y/responsive'],
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

Reglas: cíñete a tus tareas; reusa lo existente; código limpio y terminado (sin placeholders funcionales) que cumpla los criterios de aceptación. Antes de cambiar textos visibles, grep en tests/e2e/ y actualiza los asserts afectados. No corras build ni tests. Al terminar reporta archivos creados/modificados y notas (decisiones/riesgos, incluidos los tests que ajustaste).`
}

phase('Secciones')
const sections = await agent(builderPrompt('FRONTEND (secciones públicas)', plan.sections), {
  schema: BUILD_RESULT_SCHEMA,
  label: 'public-sections',
  phase: 'Secciones',
})
log(`Secciones: +${sections.created.length} nuevos, ${sections.modified.length} modificados`)

phase('Pulido')
const polish = await agent(builderPrompt('FRONTEND (pulido transversal)', plan.polish, sections), {
  schema: BUILD_RESULT_SCHEMA,
  label: 'polish',
  phase: 'Pulido',
})
log(`Pulido: +${polish.created.length} nuevos, ${polish.modified.length} modificados`)

phase('QA')
const qa = await agent(builderPrompt('QA (e2e + checklist)', plan.qa, { sections, polish }), {
  schema: BUILD_RESULT_SCHEMA,
  label: 'qa-tests',
  phase: 'QA',
})
log(`QA: +${qa.created.length} nuevos, ${qa.modified.length} modificados`)

return { phaseTitle: 'Fase 11', sections, polish, qa }
