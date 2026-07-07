# Roadmap de mejoras — Functional Fitness

Documento maestro de lo pendiente tras el MVP. Sirve como **contexto compartido**
para los agentes: cada fase se construye por separado, verificando que no rompa
nada de lo existente. Fuente de verdad de prioridades y alcance.

## Principios de diseño (NO cambiar)

- **Mantener la paleta y el estilo actuales.** Único acento: **verde de marca**
  (`brand-green`). Nada de naranja ni colores nuevos.
- **Usar los tokens semánticos de color** (`accent`, `surface`, `surface-muted`,
  `ink`, `body`, `muted`, `faint`, `danger`, `border-*`) — nunca colores fijos.
- **Modo claro/oscuro** en todo lo nuevo (via `useTheme` / tokens).
- **Reusar componentes base**: `BaseButton`, `BaseCard`, `BaseInput`, `EmptyState`,
  `LoadingSpinner`, `SaveButton`, etc.
- **Responsive** (desktop y móvil) siempre.
- **Acceso a Supabase solo vía services** (`src/services/`). Nunca importar
  `supabase` en componentes. Pinia solo para sesión.
- **La DB y RLS son la autoridad de acceso.** Toda tabla/bucket nuevo lleva RLS.
- **Migraciones forward-only.** Tras cambios de esquema: `npm run db:reset`.
- Gate tras cada fase: **`npm run verify`** en verde (build + db:test + e2e), sin
  romper los 44 e2e ni los 81 tests de DB existentes.

## Estado actual (ya hecho, en producción)

MVP completo + botón de guardado animado + modo oscuro + auth extendida
(recuperar/cambiar contraseña, menú de usuario con logout, verificación de correo
"dormida", cambio de plan, login con Google). RLS en todas las tablas. Desplegado
en Vercel (`main`) con Supabase en la nube (`pokwsnpmrynqxfcofllu`).

---

## Fase A — Rediseño del panel del cliente + perfil/avatar

**Objetivo:** que la experiencia post-pago (área de cliente) se sienta moderna y
motivadora, con la info importante arriba. Referencia: mockup aprobado (mantener
colores actuales).

**Alcance (frontend, datos existentes):**
- Dashboard del cliente rediseñado: saludo personalizado, **racha**, **tiles de
  métricas** (sesiones, adherencia, vigencia del plan), tarjeta **"Tu sesión de
  hoy"** (deriva de la rutina asignada), estado del plan y del cuestionario.
- **Perfil/avatar**: subir foto de usuario a Supabase Storage (bucket privado con
  RLS, patrón de `storageService`), mostrarla en el menú de usuario y el panel;
  editar nombre/teléfono en `/account`.
- Mantener toda la lógica y guards actuales.

**Backend/RLS:** bucket `avatars` privado + policies (dueño lee/escribe; lectura
por signed URL). Campo/uso de avatar en `profiles` si hace falta (columna
`avatar_path`).

**Criterio de hecho:** panel nuevo responsive en claro/oscuro, avatar sube y se ve,
`npm run verify` verde.

---

## Fase B — Diagrama de cuerpo muscular (MuscleMap)

**Objetivo:** mostrar los músculos que trabaja cada rutina/ejercicio, en modo
lectura, con intensidades (principal/secundario/estabilizador).

**Referencia:** `docs/muscle-map-spec.md` (spec detallada). **Adaptar a verde de
marca (no naranja)**; verificar compatibilidad de `vue-muscle-group-selector` con
Vue 3 — si no, **fallback SVG** propio con IDs de músculos + CSS por tokens.

**Alcance:** componente `MuscleMap.vue` (readOnly), mapa `exerciseMuscles.js`,
helper `getRoutineMuscles`, integración en detalle de rutina (cliente) y armado de
rutinas (admin). Los ejercicios ya tienen `muscle_group`.

**Dependencia:** definir el mapeo ejercicio→músculos (empezar por categoría/nombre).

---

## Fase C — Fotos de avance + consentimiento (reseñas)

**Objetivo:** foto de inicio y de fin del plan para comparar cambios; opcional y
privado; con permiso para usarlas en reseñas públicas.

**Alcance:**
- En la evaluación/panel: subir **foto inicio** y **foto fin** (opcionales).
- **Bucket privado** con RLS (solo dueño + admin).
- **Casilla de consentimiento** (booleano) "Autorizo usar mis fotos en reseñas".
- Vista de comparación antes/después en el **admin**.
- Solo fotos con consentimiento pueden alimentar la sección pública de **reseñas**.

**Backend/RLS:** bucket `progress-photos` + policies; tabla/campos para las fotos y
el flag de consentimiento; RLS estricta (privacidad de datos sensibles).

---

## Fase D — Registro de entrenamientos + progreso con gráficas

**Objetivo:** el gran diferenciador a largo plazo. Requiere datos primero.

**Alcance:**
1. **Registrar entrenamientos**: el cliente marca ejercicios completados y anota
   series/reps/peso durante la sesión → nueva(s) tabla(s) con RLS.
2. **Apartado de Progreso** con gráficas: volumen semanal, adherencia, racha,
   calendario de asistencia. Gráficas ligeras (SVG/canvas propio, con tokens).

**Dependencia:** el progreso con gráficas necesita el registro (paso 1) primero.

---

## Fase E — Pulido y negocio

- **Sitio/app**: favicon, meta tags/título (compartir bonito), **PWA instalable**
  ("agregar a inicio" en móvil).
- **Admin/negocio**: métricas (ingresos, clientes activos, retención), gestión de
  clientes más rica (buscar/filtrar/notas del entrenador).

---

## Infraestructura pendiente (requiere cuentas/dominio del cliente)

- **Correo (Resend) + dominio**: reactiva verificación de correo y recuperación de
  contraseña para clientes reales. Ver [memoria del proyecto].
- **Finalizar Google OAuth** (probar login real).
- **Pagos en producción**: desplegar Edge Functions + credenciales reales de MP.

## Diferido (decisión del usuario)

- **Auditoría de seguridad formal** (`/security-review`): el usuario tiene dudas;
  retomar antes de tener clientes reales. La base ya tiene RLS + políticas de
  Storage probadas.

---

## Orden sugerido

**A** (panel + avatar) → **B** (diagrama de cuerpo) → **C** (fotos de avance) →
**D** (registro + progreso) → **E** (pulido/negocio). Infraestructura, cuando el
cliente tenga dominio.
