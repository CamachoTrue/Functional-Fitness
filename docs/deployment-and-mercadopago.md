# Puesta en marcha de Mercado Pago y despliegue

Guía paso a paso para conectar Mercado Pago real y desplegar (Supabase en la nube
+ frontend en Vercel). El código ya está listo (aprobación solo por webhook,
snapshot desde la base, idempotencia, verificación de firma; soporta los formatos
Webhooks/JSON e IPN/query string de Mercado Pago).

> Regla de oro: el webhook necesita una **URL pública** que Mercado Pago pueda
> llamar. Por eso "MP funcionando de verdad" va de la mano con desplegar el
> backend (el proyecto Supabase en la nube da esa URL).

---

## 1. Crear la cuenta y la app de Mercado Pago

1. Entra a https://www.mercadopago.com.mx/developers y crea/inicia sesión.
2. **Tus integraciones → Crear aplicación**. Producto: **Checkout Pro**.
3. En la app tendrás dos juegos de credenciales:
   - **Credenciales de prueba** (`TEST-...`): para sandbox.
   - **Credenciales de producción** (`APP-...`): para cobrar de verdad.
4. **Cuentas de prueba** (menú de la app): crea un **vendedor de prueba** y un
   **comprador de prueba**. El `Access Token` de prueba que usarás es el del
   **vendedor de prueba**.
5. **Webhooks/Notificaciones**: registra la URL del webhook (ver §3, paso 6) y
   copia la **clave secreta** que MP genera → es `MERCADO_PAGO_WEBHOOK_SECRET`.
   Evento a suscribir: **Pagos** (`payment`).

Guardarás por separado: Access Token (prueba y producción) y Webhook secret
(prueba y producción). Nunca en el repo ni en variables `VITE_*`.

---

## 2. Probar en sandbox (opcional antes de desplegar)

El flujo real requiere URL pública. Dos caminos:

- **Recomendado:** despliega primero (§3) y prueba en el proyecto en la nube.
- **Túnel local:** `supabase functions serve --env-file supabase/functions/.env.local`
  (copia `supabase/functions/.env.example` → `.env.local`) y expón el puerto con
  un túnel (p. ej. `ngrok http 54321`), registrando esa URL pública en MP y
  poniéndola en `SUPABASE_URL`/`APP_URL` de pruebas.

**Tarjetas de prueba (MXN):** en el panel de MP, sección de tarjetas de prueba. El
resultado se controla con el **nombre del titular**: `APRO` (aprobado), `OTHE`
(rechazado), `CONT` (pendiente). Usa el **comprador de prueba** para pagar.

Verifica tras pagar con `APRO`: en la base, `purchases.payment_status='approved'`,
`start_date`/`end_date` seteadas, `mercado_pago_payment_id` guardado, y una fila en
`payment_events` con `signature_valid=true` y `processing_result='applied'`.
Reenvía la misma notificación y confirma `duplicate_ignored`/`stale_ignored`.

---

## 3. Desplegar

### Backend — Supabase en la nube

1. Crea un proyecto en https://supabase.com (elige región cercana; guarda la
   contraseña de la base). Anota el **project ref** (`xxxxxxxx`).
2. Enlaza el repo local:
   ```bash
   npx supabase link --project-ref <ref>
   ```
3. Aplica las migraciones (NO el seed, que es demo):
   ```bash
   npx supabase db push
   ```
4. Despliega las Edge Functions (el `verify_jwt` se toma de `config.toml`:
   create=true, webhook=false):
   ```bash
   npx supabase functions deploy create-payment-preference
   npx supabase functions deploy mercado-pago-webhook
   ```
5. Carga los secretos (los de Supabase se inyectan solos):
   ```bash
   npx supabase secrets set MERCADO_PAGO_ACCESS_TOKEN=<APP-... o TEST-...>
   npx supabase secrets set MERCADO_PAGO_WEBHOOK_SECRET=<secreto del panel>
   npx supabase secrets set APP_URL=https://tu-dominio-en-vercel.app
   ```
6. En el panel de MP registra la **notification_url**:
   `https://<ref>.supabase.co/functions/v1/mercado-pago-webhook`
   con su **clave secreta** = `MERCADO_PAGO_WEBHOOK_SECRET`.
7. En el **dashboard de Supabase → Authentication → URL Configuration**: pon el
   `Site URL` = tu dominio de Vercel y añade a *Redirect URLs* ese dominio (y
   `/payment/success|failure|pending`).
8. Crea el primer **admin** (SQL Editor del dashboard, con el UUID de `auth.users`):
   ```sql
   insert into public.user_roles (user_id, role)
   values ('USER_UUID', 'admin') on conflict do nothing;
   ```

### Frontend — Vercel

1. Sube el repo a GitHub e **importa el proyecto en Vercel**. `vercel.json` ya
   define build (`npm run build`), output (`dist`) y el rewrite SPA.
2. En Vercel → Settings → **Environment Variables** (Production), define las
   variables públicas apuntando al proyecto en la nube:
   ```
   VITE_APP_URL=https://tu-dominio-en-vercel.app
   VITE_SUPABASE_URL=https://<ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon/publishable key de producción>
   VITE_WHATSAPP_NUMBER=<número real cuando lo tengas>
   ```
3. Deploy. Verifica que ninguna `VITE_*` contenga el service role ni el token de
   MP (son públicas y quedan en el bundle).

---

## 4. Checklist "listo para revisión"

- [ ] Migraciones aplicadas en la nube (`db push`) y reproducibles desde cero.
- [ ] Funciones desplegadas; webhook con `verify_jwt=false`, create con `true`.
- [ ] Secretos de **producción** de MP (`APP-...`) en Supabase (los `TEST-...`
      solo para staging/pruebas).
- [ ] Webhook registrado en MP con el mismo `MERCADO_PAGO_WEBHOOK_SECRET`.
- [ ] Pago de prueba de punta a punta → la compra pasa a `approved`.
- [ ] Idempotencia: reenviar la notificación no re-activa ni mueve fechas.
- [ ] Firma inválida → 401 y `signature_valid=false` en `payment_events`.
- [ ] Sin secretos en el bundle (`grep -r "APP-\|service_role\|access_token" dist/`).
- [ ] `Site URL`/redirects de Auth configurados con el dominio real.
- [ ] Primer admin creado por SQL.

---

## 4.b Aprendizajes de la integración real (ya resueltos)

- **CORS de la Edge Function**: `supabase-js` (`functions.invoke`) envía las cabeceras
  `x-client-info` y `x-supabase-api-version`. Deben estar en
  `Access-Control-Allow-Headers` (`_shared/cors.ts`) o el navegador bloquea el POST
  tras el preflight (se ve solo `OPTIONS 204` y nunca llega el POST).
- **Firma del webhook (informativa, no bloqueante)**: el esquema de firma de MP es
  inconsistente entre tipos de notificación (IPN legacy `?topic=payment&id=...` sin
  `data.id`, `merchant_order`) y entre entornos de prueba/producción (distinto
  secreto). Por eso el webhook **registra** `signature_valid` para auditoría pero
  **no rechaza** con 401. La seguridad real la da que el webhook **siempre consulta
  el pago en la API de MP** con el access token y solo activa la compra si el pago
  existe en la cuenta y su `external_reference` corresponde a una compra pendiente
  propia (imposible falsificar; la idempotencia evita reprocesos).
- **Modo prueba vs producción**: paga con un **usuario comprador de prueba** (una
  cuenta real no puede pagar un checkout de prueba). El resultado se controla con el
  titular de la tarjeta: `APRO` aprueba.
- **Cargar los secretos ANTES de invocar** el webhook, y **re-desplegar** si la
  función ya estaba caliente sin el secreto.

## 4.c Pasos para pasar a PRODUCCIÓN real (cuando haya cliente)

1. Reactivar **Confirm email** en Supabase Auth (con SMTP propio si se quiere).
2. Cambiar los secretos de MP a los de **producción** (`APP-...`) y registrar el
   webhook de producción con su secreto.
3. Configurar el número real de WhatsApp (`VITE_WHATSAPP_NUMBER` en Vercel).
4. Crear los paquetes reales desde `/admin/packages` (los de ejemplo se pueden
   desactivar/editar).
5. Dominio propio en Vercel + actualizar `Site URL`/redirects de Auth y `APP_URL`.

## 5. Pruebas locales del código (sin cuentas)

Toda la lógica de pago está cubierta por tests que NO requieren credenciales:

```bash
npm run test:functions   # Deno: create-preference + webhook (incluye idempotencia y formato IPN)
npm run verify           # build + db:test (RLS/Storage) + e2e
```
(`test:functions` requiere Deno en el PATH: `export PATH="$HOME/.deno/bin:$PATH"`.)
