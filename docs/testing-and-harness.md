# Pruebas y arnés de agentes

Este documento describe cómo se verifica el proyecto y cómo funciona el arnés
multi-agente que construye y valida cada fase.

## 1. Verificación determinista (gate normal)

El gate de calidad estándar es un solo comando:

```bash
npm run verify   # = build && db:test && test:e2e
```

- `npm run build` — compila el frontend con Vite.
- `npm run db:test` — pruebas pgTAP de esquema y RLS (`supabase/tests/database/`).
- `npm run test:e2e` — pruebas de navegador con Playwright (`tests/e2e/`).

Requisitos: Supabase local corriendo (`npm run supabase:start`) con el seed, y
el navegador de Playwright instalado (`npx playwright install chromium`). El dev
server se reutiliza si ya está arriba (webServer `reuseExistingServer`).

**Este es el gate por defecto.** Es gratuito en agentes, rápido y suficiente para
la mayoría de los cambios.

### Tests de las Edge Functions (Deno)

Las Edge Functions de pagos tienen pruebas unitarias en Deno que **no** forman
parte de `npm run verify`: Deno puede no estar disponible en CI, así que el gate
no las encadena. Se ejecutan aparte:

```bash
npm run test:functions   # = deno test --allow-env --allow-net --allow-read supabase/functions/
```

Deno está instalado en `~/.deno/bin` (puede no estar en el `PATH`; añádelo con
`export PATH="$HOME/.deno/bin:$PATH"`). Los tests son totalmente mockeados:

- Un `MercadoPagoClient` falso reemplaza la API de Mercado Pago (no hay red ni
  `MERCADO_PAGO_ACCESS_TOKEN` real).
- Un doble del client supabase admin mantiene la compra en memoria; no toca la
  base de datos.
- La firma se prueba firmando un manifest con un secreto de prueba y verificando
  que altera­ciones (hash, `ts`, `data.id`, secreto) la rechazan.

Casos cubiertos: create-preference (sin JWT → 401; paquete inexistente/inactivo;
`amount` manipulado en el body ignorado → el snapshot sale del paquete; happy →
`pending` + `preference_id` + `init_point`); webhook (firma inválida → 401 sin
cambios; `approved` → `approved` con fechas; **reenvío idempotente → no mueve
`start_date`**; `rejected` → `rejected`; `external_reference` desconocido → 200
sin excepción; 404/500 de la API de MP).

### Reglas al ejecutarlo

- No canalizar con `| tail`: el pipe enmascara el exit code y un fallo del gate
  puede verse como éxito. Redirigir a un archivo y luego inspeccionarlo.
- En pgTAP, `plan(N)` debe igualar el número real de asserts del archivo (un
  off-by-one hace fallar todo el archivo aunque cada assert pase).
- Los e2e usan Supabase local con seed y son 100% anónimos, salvo el camino admin,
  que se salta a menos que `SUPABASE_SERVICE_ROLE_KEY` esté en el entorno.

### Cobertura del bucket privado exercise-videos

- **pgTAP** (`supabase/tests/database/005_storage_policies.test.sql`): verifica las
  políticas de `storage.objects` del bucket `exercise-videos` insertando objetos
  con la service (sin RLS) y consultándolos como cada rol. Cubre: el admin sube
  bajo `exercises/` y lee cualquier objeto; el cliente no-admin no puede subir
  (42501); el cliente solo lee el video de un ejercicio de su rutina `assigned`
  (`private.can_access_exercise_video`), nunca el de una rutina `draft` ni el de
  otro cliente. `plan(N)` debe seguir igualando el número de asserts.
- **e2e** (`tests/e2e/admin-exercises.spec.js`): la subida/preview/reemplazo/borrado
  reales del video pasan por la UI admin (bucket privado + signed URL), cubriendo el
  camino de aplicación de punta a punta. Se salta sin `SUPABASE_SERVICE_ROLE_KEY`.

## Prueba manual del flujo completo (Fase 11)

El gate automatizado (`npm run verify`) cubre build, RLS/esquema y los caminos e2e.
Este checklist es la **prueba manual de punta a punta** que se ejecuta al cerrar la
Fase 11 (pulido final), para validar lo que los e2e no observan: experiencia real,
estados de UI, responsive y accesibilidad. Requiere Supabase local con seed y el dev
server (`npm run dev`). El estado de compra `approved` se crea vía seed/SQL, no con
Mercado Pago real.

> El gate sigue siendo `npm run verify` (sin `| tail`: el pipe enmascara el exit
> code; redirigir a archivo e inspeccionar). Este checklist es complementario, no
> lo reemplaza.

### Flujo principal (happy path)

- [ ] **Registro**: desde `/register`, crear una cuenta nueva. Tras registrarse, el
      usuario queda autenticado y aterriza en su área de cliente.
- [ ] **Catálogo**: en `/packages` se ven los 3 paquetes del seed (Plan Basico,
      Plan Personalizado, Plan Premium) con precio; solo el Personalizado muestra el
      badge "Recomendado".
- [ ] **Detalle**: "Ver detalle" navega a `/package/<id>` con nombre y precio.
- [ ] **Login con redirect**: como usuario anónimo, el CTA "Quiero este plan" lleva a
      `/login?redirect=/package/<id>`; tras autenticar, vuelve al detalle.
- [ ] **Compra approved (seed)**: con una compra `approved` sembrada, la vista de
      resultado (`/payment/...`) muestra el estado en español ("Aprobada", nunca el
      valor crudo) y el nombre del paquete.
- [ ] **Cuestionario**: el cliente completa el cuestionario de esa compra
      (objetivo, nivel de experiencia, días por semana, equipo, etc.) y lo guarda;
      al volver a entrar, los valores persisten.
- [ ] **Admin arma/asigna rutina**: como admin, la ficha del cliente lista la compra
      en "Pendientes de asignar rutina" con enlace real al constructor
      (`admin-routine-create` con `userId`/`purchaseId`). El objetivo y el nivel del
      cuestionario se muestran en español (p. ej. "Bajar grasa", "Principiante"). El
      admin crea la rutina, agrega ejercicios (con video) y la asigna al cliente.
- [ ] **Cliente ve la rutina y reproduce video**: el cliente ve la rutina asignada,
      organizada por día, y cada ejercicio abre su video de referencia (signed URL
      del bucket privado `exercise-videos`).

### Estados de UI (vacío / carga / error)

- [ ] **Carga**: al entrar a listados (paquetes, cuestionarios admin, ejercicios,
      rutinas) se muestra el `LoadingSpinner` mientras resuelve.
- [ ] **Vacío**: sin datos, se muestra el `EmptyState`/`BaseTable` con título y
      descripción en español (no una tabla en blanco).
- [ ] **Error**: al forzar un fallo (p. ej. Supabase detenido), aparece el bloque
      `role="alert"` con mensaje y acción "Recargar"; no una pantalla en blanco.
- [ ] **Estados en español**: badges y celdas de estado (compra, cuestionario, pago)
      siempre en español, incluyendo estados distintos de `approved`
      (Pendiente/Rechazada/Cancelada/Reembolsada/Vencida).

### Responsive (320–390 px)

- [ ] En 320 px y 390 px de ancho, revisar Home, `/packages`, detalle, cuestionario,
      dashboards de cliente y admin: sin scroll horizontal, sin texto cortado ni
      botones solapados.
- [ ] Los `h1` de catálogo/detalle escalan (`text-3xl sm:text-4xl`) y el `h1` del
      área de cliente ("Mi evaluación") es legible en móvil.
- [ ] El botón flotante de WhatsApp no tapa CTAs ni contenido clave en móvil.

### Navegación por teclado y foco (a11y)

- [ ] **Skip link**: al cargar cualquiera de los 3 layouts (público, admin, cliente)
      y pulsar Tab, aparece "Saltar al contenido"; al activarlo, el foco salta al
      `<main id="main">`.
- [ ] **Foco visible**: todos los elementos interactivos (links, botones, inputs,
      `<summary>` de las FAQ) muestran el `focus-ring` al navegar con Tab.
- [ ] **FAQ por teclado**: los `<details>` de las FAQ expanden/colapsan con Enter/Espacio.
- [ ] **Orden lógico**: el orden de tabulación sigue el flujo visual; no hay trampas
      de foco.

### Botón de WhatsApp

- [ ] El botón flotante aparece en **todas** las páginas públicas (montado en
      `PublicLayout`), abajo a la derecha.
- [ ] Su `href` es `https://wa.me/<VITE_WHATSAPP_NUMBER>?text=<mensaje>` y abre
      WhatsApp en pestaña nueva (`target="_blank"`, `rel="noopener noreferrer"`) con
      el mensaje prellenado.
- [ ] Con `VITE_WHATSAPP_NUMBER` **no definida**, el botón no se renderiza (degrada
      con `v-if`) y no rompe el layout.

## 2. Arnés multi-agente (bajo demanda)

En `.claude/workflows/` viven workflows reutilizables:

| Workflow | Qué hace |
| --- | --- |
| `dev-harness.js` | Audita frontend/backend/QA, verifica cada hallazgo de forma adversarial y **auto-repara** en un loop hasta quedar verde. Gates = build/db:test/e2e. |
| `build-phase.js` | Equipo de una fase: planner → backend → frontend → QA → `dev-harness` anidado. Modo *plan-only* si no recibe plan; construye si recibe el plan aprobado. |

### Política de uso

- **`dev-harness` completo se ejecuta solo cuando se considere necesario** (hitos,
  auditoría profunda de seguridad/calidad, o sospecha de regresiones amplias). No
  en cada cambio: una corrida típica consume decenas de agentes y cientos de miles
  de tokens.
- Para el día a día, el gate es `npm run verify`.

### Flujo para construir una fase

1. Ejecutar `build-phase` en **modo plan** (sin plan aprobado) para obtener el
   plan por dominio.
2. **Checkpoint humano**: revisar y aprobar el plan.
3. Ejecutar la construcción con el plan aprobado (backend → frontend → QA).
4. Verificar con `npm run verify`; correr `dev-harness` solo si se justifica.

## 3. Gotchas de los workflows

- Los workflows locales **no** se resuelven por nombre desde `workflow('nombre')`
  (solo los integrados). Para anidar, usar `workflow({ scriptPath: '<ruta absoluta>' })`.
- El canal `args` puede no llegar al script; para datos críticos (p. ej. un plan
  aprobado) conviene incrustarlos en el propio script en lugar de depender de `args`.

## 4. Entorno local

Ver [Base de datos y Supabase](database.md) para levantar Supabase local (Colima),
llaves y comandos. Recordatorio: la CLI usa el formato de llaves `sb_publishable_…`
para `VITE_SUPABASE_ANON_KEY` en `.env.local`.
