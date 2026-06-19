# Entornos y despliegue

## Entornos

Se trabajara con tres entornos logicos:

| Entorno | Frontend | Supabase | Mercado Pago |
| --- | --- | --- | --- |
| Local | Vite local | Proyecto de desarrollo | Credenciales de prueba |
| Preview | URL por rama o PR | Proyecto de staging | Credenciales de prueba |
| Produccion | Dominio final | Proyecto de produccion | Credenciales de produccion |

Desarrollo y produccion nunca deben compartir base de datos, Storage ni secretos.
Si inicialmente no hay presupuesto para staging, los previews usaran desarrollo y
esa limitacion quedara documentada antes de publicar datos reales.

## Variables del frontend

Solo estas variables pueden llegar al navegador:

- `VITE_APP_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

La anon key es publica por diseno; su uso seguro depende de RLS. Ninguna service
role key ni credencial privada de Mercado Pago puede usar el prefijo `VITE_`.

## Secretos de Edge Functions

Se configuraran en Supabase y no se guardaran en Git:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MERCADO_PAGO_ACCESS_TOKEN`
- `MERCADO_PAGO_WEBHOOK_SECRET`
- `APP_URL`

Los nombres exactos se mantendran iguales en desarrollo, staging y produccion;
solo cambian sus valores.

## Estrategia de despliegue

Frontend recomendado: Vercel. La SPA necesita una regla de rewrite para enviar
las rutas de Vue a `index.html`. Netlify o Cloudflare Pages son alternativas
validas si se configura el mismo fallback.

Backend administrado: Supabase.

1. Aplicar migraciones versionadas a Supabase.
2. Desplegar Edge Functions.
3. Configurar secretos del entorno.
4. Configurar la URL publica del webhook en Mercado Pago.
5. Desplegar el frontend con sus variables publicas.
6. Ejecutar una prueba completa con una cuenta y pago de prueba.
7. Verificar RLS con usuarios `client`, `admin` y sin sesion.

## Dominios y redirecciones

Cada entorno debe registrar en Supabase Auth sus URLs autorizadas. Mercado Pago
usara rutas separadas para experiencia de retorno:

```text
/payment/success
/payment/failure
/payment/pending
```

Estas rutas muestran el estado y consultan la compra; no la aprueban.

## Migraciones y datos

- Todo cambio de esquema o RLS vive en `supabase/migrations`.
- Los datos de demostracion viven en un seed separado y no se aplican a
  produccion automaticamente.
- No se editara el esquema de produccion manualmente salvo una emergencia
  documentada.
- Antes de cambios destructivos se comprobara el respaldo del proyecto.

## Criterios para publicar

- Build del frontend sin errores.
- Migraciones reproducibles desde una base vacia.
- RLS probado para cada tabla sensible.
- Webhook autentico, idempotente y probado con reintentos.
- Ningun secreto presente en el bundle ni en Git.
- Flujo responsive validado desde registro hasta rutina asignada.
