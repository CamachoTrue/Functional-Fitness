# CLAUDE.md — Guía de trabajo para agentes

Plataforma de functional fitness: Vue 3 + Vite + Supabase + Mercado Pago. Se
construye **por fases**. Lee también `docs/technical-decisions.md`,
`docs/database.md` y `docs/testing-and-harness.md`.

## Idioma

- Conversación e interfaz de usuario: **español**.
- Código (archivos, variables, funciones): **inglés**.

## Verificación (política acordada con el usuario)

- El gate por defecto es **`npm run verify`** (`build && db:test && test:e2e`).
  Úsalo tras cambios; es gratuito en agentes y rápido.
- El **arnés multi-agente completo (`.claude/workflows/dev-harness.js`) se ejecuta
  SOLO cuando se considere necesario** (hitos, auditoría profunda, regresiones
  amplias). No en cada cambio: es caro (decenas de agentes, cientos de miles de
  tokens).
- No canalices `npm run verify` con `| tail` (enmascara el exit code).

## Construir una fase (con checkpoint humano)

1. `build-phase` en modo plan → obtén el plan por dominio.
2. **Muestra el plan al usuario y espera su aprobación** antes de escribir código.
3. Construye con el plan aprobado: backend → frontend → QA (secuencial; no editar
   los mismos archivos en paralelo).
4. `npm run verify` hasta verde; `dev-harness` solo si se justifica.

Ver `docs/testing-and-harness.md` para detalles y gotchas de los workflows
(anidar con `{ scriptPath }`, no depender de `args`).

## Convenciones de código

- Vue 3 Composition API con `<script setup>`. Nunca Options API.
- TailwindCSS v4 (utilidades `page-container`, `focus-ring`; colores `brand-green`,
  `ink`, `surface-muted`). Verde **solo** como acento.
- Acceso a Supabase **siempre** vía un service en `src/services/` (patrón de
  `authService.js`/`packagesService.js`). Nunca importar `supabase` en componentes.
- Reusar componentes base (`BaseButton`, `BaseCard`, `BaseInput`, `EmptyState`,
  `LoadingSpinner`). Pinia solo para sesión/estado global (`stores/authStore.js`).
- Migraciones de Supabase **forward-only**: crear una nueva, nunca editar una
  aplicada. Tras cambios de esquema: `npm run db:reset`.

## Principios del MVP (seguridad)

- La base de datos y RLS son la autoridad de acceso; el frontend no es barrera.
- Una compra se activa solo tras verificar el pago por webhook (nunca por la URL
  de retorno). Cada renovación crea una compra nueva.
- Secretos nunca en variables `VITE_*` (van en secrets de Edge Functions).

## Estado por fases

- Fase 1-3: definiciones, base Vue, esquema Supabase + RLS + seed + tests. ✅
- Fase 4: autenticación, sesión, guards y redirección por rol. ✅
- Fase 5: catálogo público de paquetes (lista + detalle) conectado a Supabase. ✅
- Fase 6: compras y Mercado Pago (Edge Functions, webhook idempotente, vistas de pago). ✅
- Fase 7: cuestionario de evaluación del cliente (formulario por secciones, upsert, RLS). ✅
- Fase 8: administrador básico (dashboard, clientes, detalle, compras, cuestionarios; solo lectura). ✅
- Fase 9: CRUD admin de paquetes y de ejercicios con video (Supabase Storage). ✅
- Fase 10: constructor de rutinas (admin) + panel del cliente (rutina por días, videos). ✅
- Fase 11: pulido final (secciones públicas, responsive, accesibilidad, estados, copy). ✅ — MVP completo.
- Pendiente para producción: conectar credenciales reales de Mercado Pago (sandbox → prod) y servir/desplegar las Edge Functions; número real de WhatsApp; despliegue.
