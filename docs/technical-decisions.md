# Decisiones tecnicas del MVP

Este documento resuelve las decisiones abiertas de la especificacion antes de
iniciar la implementacion.

## 1. Arquitectura

La aplicacion sera un frontend Vue de pagina unica desplegado como sitio estatico.
Vue se comunicara directamente con Supabase para las operaciones permitidas por
RLS. Las operaciones privilegiadas se ejecutaran en Supabase Edge Functions.

```text
Vue 3 SPA
  |-- Supabase Auth
  |-- PostgreSQL + RLS
  |-- Storage privado
  `-- Edge Functions
        `-- Mercado Pago API y webhooks
```

No se incorporara un servidor adicional en el MVP. Se evaluara solo si una
limitacion real de Edge Functions lo requiere.

## 2. Autenticacion antes del pago

El cliente debe registrarse o iniciar sesion antes de crear una compra. Esto
permite que `purchases.user_id` sea obligatorio y evita compras sin propietario.

Flujo definitivo:

1. El cliente elige un paquete.
2. Si no tiene sesion, inicia sesion o se registra.
3. Una funcion segura crea la compra pendiente y la preferencia de pago.
4. El cliente completa el pago en Mercado Pago.
5. El webhook verifica el pago y actualiza la compra.

La seleccion del paquete se preservara durante la autenticacion mediante la ruta
de retorno, sin guardar datos financieros como fuente de verdad en el navegador.

## 3. Compras e historial financiero

- Cada intento de compra crea un registro independiente.
- Cada renovacion crea una compra nueva.
- `amount`, moneda, nombre del paquete y duracion se copian a la compra como
  snapshot. Cambiar un paquete no modifica el historial.
- Los estados de pago son `pending`, `approved`, `rejected`, `cancelled`,
  `refunded` y `expired`.
- Solo una Edge Function con credenciales privilegiadas puede confirmar estados
  provenientes de Mercado Pago.
- La fecha de inicio se establece al aprobar el pago y la fecha final se calcula
  con la duracion guardada en la compra.

La moneda inicial sera configurable y se definira como `MXN` en los datos de cada
compra y preferencia. No se dependera de una variable del navegador para validar
montos.

## 4. Mercado Pago

Se usaran al menos dos Edge Functions:

- `create-payment-preference`: valida usuario y paquete, crea la compra pendiente
  y solicita la preferencia.
- `mercado-pago-webhook`: valida la notificacion, consulta el pago directamente
  en Mercado Pago y actualiza la compra de forma idempotente.

Reglas obligatorias:

- Nunca aprobar por la URL de retorno.
- Nunca confiar en monto, paquete o usuario enviados por el frontend.
- Validar la firma del webhook conforme al mecanismo vigente de Mercado Pago.
- Consultar el pago en la API antes de cambiar el estado local.
- Guardar identificadores externos con restricciones para evitar duplicados.
- Aceptar reintentos del webhook sin duplicar activaciones.
- Registrar el resultado tecnico necesario para diagnostico sin guardar secretos
  ni informacion sensible innecesaria.

## 5. Rutinas y compras

En el MVP, cada compra aprobada puede tener una rutina principal. Se aplicara una
restriccion unica sobre `routines.purchase_id` cuando el valor no sea nulo.

Los ajustes del entrenador se realizan sobre esa rutina mientras este activa. Al
renovar, se crea otra compra y una rutina nueva. La rutina anterior se conserva y
puede archivarse; no se sobrescribe el historial de compras.

## 6. Cuestionarios

Cada compra admite un cuestionario del usuario propietario. La unicidad real sera
por `purchase_id`; `user_id` se conserva para consultas y politicas claras. Solo
una compra aprobada del usuario puede recibir o actualizar su cuestionario.

## 7. Roles y autorizacion

- Los roles validos son `admin` y `client`.
- Todo usuario nuevo recibe `client` mediante una funcion o trigger controlado.
- El usuario no puede insertar, actualizar ni eliminar sus roles.
- La promocion a `admin` se realiza fuera del cliente con una operacion
  privilegiada y auditada.
- Las rutas de Vue mejoran la experiencia, pero RLS protege los datos incluso si
  se evita el router.
- Las funciones `security definer` fijaran un `search_path` seguro y tendran los
  permisos minimos necesarios.

## 8. Videos

El bucket `exercise-videos` sera privado desde el inicio. El administrador puede
subir, reemplazar y eliminar archivos. El cliente recibe URLs firmadas de corta
duracion solo para ejercicios incluidos en una rutina asignada.

Los archivos se organizan asi:

```text
exercises/{exercise_id}/{generated_filename}.mp4
```

La base de datos guarda `video_path` como referencia estable. Una URL firmada es
temporal y no se almacena en `exercises.video_url` como fuente de verdad.

## 9. Estado global y capas del frontend

Pinia se usara para sesion, perfil y rol. Los datos de cada pantalla se cargaran
mediante services y composables, sin convertir todo el dominio en estado global.

- `views`: composicion de pantallas.
- `components`: presentacion y controles reutilizables.
- `composables`: estado y comportamiento reutilizable de Vue.
- `services`: acceso a Supabase y funciones remotas.
- `stores`: sesion y estado global compartido.

## 10. Fuera del MVP

No se incluiran chat, comunidad, aplicacion movil, progreso corporal, calendario
avanzado, IA, cupones, suscripciones automaticas ni notificaciones complejas.
