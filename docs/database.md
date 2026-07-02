# Base de datos y Supabase

## Estructura

Las migraciones viven en `supabase/migrations` y se aplican en orden:

1. Dominio, tipos, restricciones e indices.
2. Triggers de perfiles, roles y timestamps.
3. Privilegios, RLS y Storage privado.

El seed local crea tres paquetes de demostracion. No crea usuarios ni pagos.

## Desarrollo local

Requisitos:

- Node.js compatible con el proyecto.
- Un runtime compatible con Docker, como Docker Desktop o Colima.

En macOS se puede iniciar Colima antes de Supabase:

```bash
colima start
```

Comandos:

```bash
npm run supabase:start
npm run db:reset
npm run db:test
npm run supabase:stop
```

`db:reset` recrea la base, aplica las migraciones y carga `supabase/seed.sql`.
`db:test` ejecuta las pruebas pgTAP de esquema y aislamiento por rol.

La analitica local esta desactivada porque no forma parte del MVP. Auth,
PostgreSQL, REST, Storage, Studio y Edge Functions permanecen disponibles.

## Reglas de seguridad

- Un trigger crea `profiles` y el rol `client` al registrar un usuario.
- No existen permisos de escritura de cliente sobre `user_roles`.
- Los helpers `security definer` viven en `private`, que no se expone por API.
- El cliente solo ve sus perfiles, compras, cuestionarios y rutinas asignadas.
- Los cuestionarios solo se crean para compras propias aprobadas.
- Las compras solo se escriben desde operaciones privilegiadas.
- Los administradores gestionan paquetes, ejercicios y rutinas mediante RLS.
- El catalogo publico expone unicamente paquetes con `is_active = true` a traves
  del rol `anon`: la policy `packages_read_active` (`using (is_active)`) y el
  `grant select ... to anon` limitan la anon key a leer solo paquetes activos.
  Los inactivos nunca se devuelven al visitante sin sesion.
- Los videos viven en el bucket privado `exercise-videos`.

## Crear el primer administrador

El primer administrador se promueve desde una sesion SQL privilegiada, nunca
desde el navegador. Sustituir el UUID por el identificador de `auth.users`:

```sql
insert into public.user_roles (user_id, role)
values ('USER_UUID', 'admin')
on conflict (user_id, role) do nothing;
```

Un administrador conserva tambien su rol `client`; `is_admin()` comprueba la
existencia del rol administrativo sin depender de metadata editable por el usuario.

## Área de administración (Fase 8, solo lectura)

La Fase 8 añade el panel de administración en modo SOLO LECTURA. No introduce
migraciones: se apoya por completo en la RLS ya existente.

- Sin migraciones. `private.is_admin()` ya autoriza al administrador a leer
  `profiles`, `user_roles`, `purchases`, `questionnaires`, `routines` y
  `exercises`. La creación y asignación de rutinas llega en la Fase 9.
- Lectura vía RLS. El admin lee cada tabla por separado con su propia sesión; no
  hay endpoints privilegiados ni service key en el cliente.
- Sin embedding `profiles` ↔ `purchases`/`questionnaires`/`routines`. Esas tablas
  apuntan a `auth.users`, no a `profiles`, así que no existe FK directa que
  PostgREST pueda embeber. Cada colección se lee por separado y se une **por
  `user_id` en el cliente** (en los composables `useAdmin*`). Donde sí hay FK real
  (por ejemplo `purchases.package_id → packages`) se podría embeber, pero para el
  panel basta el snapshot `package_name` guardado en la propia compra.

Criterios de negocio (documentados también en el JSDoc de `adminService` y los
composables, y en la propia UI del panel):

- **Cliente activo**: tiene al menos una compra con `payment_status = 'approved'`
  vigente, es decir `end_date > now()` o `end_date` nulo (una compra aprobada sin
  caducidad se considera vigente). La "venta" se cuenta por `created_at`.
- **Rutina pendiente**: compra `approved` que aún no tiene una `routine` en estado
  `assigned` para ese `user_id`/`purchase_id`.

## Videos

Los paths siguen este formato:

```text
exercises/{exercise_id}/{generated_filename}.mp4
```

El admin puede administrar objetos dentro de `exercises/`. Un cliente solo puede
leer un video si el ejercicio pertenece a una rutina asignada a su usuario. Las
URLs firmadas se generan bajo demanda y no se guardan en la tabla `exercises`.
