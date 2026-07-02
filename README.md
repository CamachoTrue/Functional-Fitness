# Functional Fitness

Plataforma web para vender y entregar entrenamientos personalizados de functional
fitness. El proyecto se construira por fases con Vue 3, Supabase y Mercado Pago.

## Estado

- Fase 1 completada: definiciones tecnicas, entornos y despliegue.
- Fase 2 completada: base Vue, sistema visual, layouts, rutas y vistas iniciales.
- Fase 3 completada: esquema Supabase, RLS, Storage, seed y pruebas de base de datos.
- Fase 4 completada: autenticacion, recuperacion de sesion, guards y redireccion por rol.
- Fase 5 completada: catalogo publico de paquetes (lista y detalle) conectado a Supabase.
- Fase 6 completada: compras y Mercado Pago (Edge Functions, webhook idempotente, vistas de pago).
- Fase 7 completada: cuestionario de evaluacion del cliente (formulario por secciones, upsert, RLS).
- Fase 8 completada: administrador basico (dashboard, clientes, detalle, compras, cuestionarios; solo lectura).
- Fase 9 completada: CRUD admin de paquetes y de ejercicios con video (Supabase Storage).
- Fase 10 completada: constructor de rutinas (admin) y panel del cliente (rutina por dias + videos).
- Fase 11 completada: pulido final (secciones publicas FAQ/testimonios/CTA/WhatsApp, responsive, accesibilidad, estados y copy). MVP completo.

## Desarrollo local

Requiere Node.js `^20.19.0` o `>=22.12.0`.

```bash
npm install
npm run dev
```

Para verificar todo (build, base de datos y e2e):

```bash
npm run verify
```

## Documentacion

- [Decisiones tecnicas](docs/technical-decisions.md)
- [Entornos y despliegue](docs/environments-and-deployment.md)
- [Base de datos y Supabase](docs/database.md)
- [Pruebas y arnes de agentes](docs/testing-and-harness.md)
- [Puesta en marcha de Mercado Pago y despliegue](docs/deployment-and-mercadopago.md)
- [Guia de trabajo para agentes](CLAUDE.md)

## Stack acordado

- Vue 3 + Vite
- Composition API con `<script setup>`
- Vue Router
- Tailwind CSS
- Pinia para sesion y estado global compartido
- Supabase Auth, PostgreSQL, Row Level Security y Storage
- Supabase Edge Functions para la integracion con Mercado Pago

## Principios del MVP

- La base de datos y RLS son la autoridad de acceso; el frontend no es una barrera
  de seguridad.
- Una compra se activa solo despues de verificar el pago desde un webhook.
- Cada renovacion crea una compra nueva y conserva el historial anterior.
- Los secretos nunca se exponen mediante variables `VITE_*`.
- La interfaz se desarrolla en espanol y el codigo usa nombres en ingles.
