-- Avatar del cliente: columna en profiles + bucket privado `avatars` con RLS.
-- Migración forward-only (no editar migraciones ya aplicadas). Completa el
-- soporte de foto de perfil: el path se guarda en profiles.avatar_path y el
-- objeto vive en el bucket privado `avatars`, servido siempre por URL firmada.

-- (1) Columna del path del avatar. Nullable (un cliente puede no tener foto).
-- El path es RELATIVO al bucket `avatars` y tiene el formato `<uid>/<filename>`
-- (la primera carpeta es el uid; ver las policies dueño-por-carpeta abajo); 300
-- caracteres cubren de sobra ese patrón (uuid + nombre saneado) sin permitir
-- valores absurdos.
alter table public.profiles
  add column avatar_path text
  constraint profiles_avatar_path_length check (char_length(avatar_path) <= 300);

-- (2) Re-emitir el grant de escritura del cliente incluyendo la nueva columna.
-- La migración 20260618000300 otorgó update (full_name, phone); ahora el cliente
-- también puede escribir su avatar_path. Las policies profiles_update_own_or_admin
-- siguen limitando las FILAS (solo la propia o admin); este grant limita las
-- COLUMNAS que puede tocar el cliente.
grant update (full_name, phone, avatar_path) on table public.profiles to authenticated;

-- (3) Bucket privado para los avatares (mismo patrón que `exercise-videos`).
-- 5 MB, solo imágenes JPG/PNG/WebP. Privado: el acceso es por URL firmada.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'avatars',
  'avatars',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- (4) Policies de storage.objects para el bucket `avatars`.
-- Modelo dueño-por-carpeta: el path (relativo al bucket) es `<uid>/<filename>`,
-- así que la primera carpeta del nombre del objeto (storage.foldername(name))[1]
-- es el uid del dueño. El cliente solo escribe/lee bajo su propia carpeta; el
-- admin lee todo el bucket (para mostrar avatares en el panel).

create policy avatars_owner_or_admin_read
on storage.objects
for select
to authenticated
using (
  bucket_id = 'avatars'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select private.is_admin())
  )
);

create policy avatars_owner_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy avatars_owner_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy avatars_owner_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
