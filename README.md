# Functional Fitness

Plataforma web para vender y entregar entrenamientos personalizados de functional
fitness. El proyecto se construira por fases con Vue 3, Supabase y Mercado Pago.

## Estado

- Fase 1 completada: definiciones tecnicas, entornos y despliegue.
- Fase 2 completada: base Vue, sistema visual, layouts, rutas y vistas iniciales.

## Desarrollo local

Requiere Node.js `^20.19.0` o `>=22.12.0`.

```bash
npm install
npm run dev
```

Para verificar la compilacion de produccion:

```bash
npm run build
```

## Documentacion

- [Decisiones tecnicas](docs/technical-decisions.md)
- [Entornos y despliegue](docs/environments-and-deployment.md)

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
