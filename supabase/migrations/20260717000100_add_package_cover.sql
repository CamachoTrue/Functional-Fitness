-- Portada del plan editable por el admin: columna en packages + bucket PÚBLICO.
-- Migración forward-only (no editar migraciones ya aplicadas). La portada (imagen
-- tipo "producto" del plan) se guarda en packages.cover_path y el objeto vive en
-- el bucket PÚBLICO `package-covers`. Es público porque las portadas se muestran
-- en el catálogo a usuarios anónimos; la escritura queda restringida a admin.

-- (1) Columna del path de la portada. Nullable: un plan puede no tener portada
-- (el frontend cae a un respaldo). El path es RELATIVO al bucket; 300 caracteres
-- cubren de sobra el patrón (uuid + nombre saneado).
alter table public.packages
  add column cover_path text
  constraint packages_cover_path_length check (char_length(cover_path) <= 300);

-- El admin ya puede actualizar packages (grant de tabla + policy packages_admin_all),
-- así que puede escribir cover_path sin grant adicional.

-- (2) Bucket PÚBLICO para las portadas. 5 MB, solo imágenes JPG/PNG/WebP.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'package-covers',
  'package-covers',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- (3) Policies de storage.objects para `package-covers`:
--   - SELECT público: cualquiera lee las portadas (catálogo anónimo). Además del
--     acceso por URL pública del bucket, esta policy permite listarlas por API.
--   - INSERT/UPDATE/DELETE: solo admin (private.is_admin()).

create policy package_covers_public_read
on storage.objects
for select
to public
using (bucket_id = 'package-covers');

create policy package_covers_admin_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'package-covers'
  and (select private.is_admin())
);

create policy package_covers_admin_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'package-covers'
  and (select private.is_admin())
)
with check (
  bucket_id = 'package-covers'
  and (select private.is_admin())
);

create policy package_covers_admin_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'package-covers'
  and (select private.is_admin())
);
