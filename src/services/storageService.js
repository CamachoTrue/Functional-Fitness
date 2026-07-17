import { supabase } from './supabaseClient'

/**
 * Único módulo que toca supabase.storage. Encapsula dos buckets privados:
 * `exercise-videos` (videos de ejercicios) y `avatars` (fotos de perfil del
 * cliente). Para cada uno cubre construcción y validación de paths, subida,
 * borrado y URLs firmadas. Sigue el patrón de los demás services (importa
 * `supabase` de supabaseClient y lanza ante error). Los componentes/composables
 * NUNCA deben acceder a supabase.storage directamente: usan estas funciones.
 */

export const BUCKET = 'exercise-videos'

// 50 MB. Coincide con el límite del bucket (file_size_limit) y con la
// validación de cliente para dar feedback inmediato antes de subir.
export const MAX_SIZE = 52428800

export const ALLOWED_MIME = ['video/mp4', 'video/webm', 'video/quicktime']

// TTL por defecto de las URLs firmadas (1 hora), suficiente para previsualizar.
export const SIGNED_URL_TTL = 3600

/**
 * Sanitiza un nombre de archivo para usarlo como último segmento del path:
 * quita separadores de ruta, colapsa espacios y conserva la extensión. El
 * resultado nunca contiene '/', de modo que el path cumple el CHECK
 * exercises_video_path_format: ^exercises/[0-9a-f-]{36}/[^/]+$.
 * @param {string} filename
 * @returns {string}
 */
function sanitizeFilename(filename) {
  const raw = String(filename ?? '').trim()
  // Elimina cualquier componente de directorio (por si viene una ruta completa).
  const base = raw.split('/').pop().split('\\').pop()
  const dotIndex = base.lastIndexOf('.')
  const hasExt = dotIndex > 0 && dotIndex < base.length - 1
  const namePart = hasExt ? base.slice(0, dotIndex) : base
  const extPart = hasExt ? base.slice(dotIndex + 1) : ''

  const cleanName = namePart
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // acentos
    .replace(/[^a-zA-Z0-9._-]+/g, ' ') // caracteres no seguros -> espacio
    .trim()
    .replace(/\s+/g, '-') // colapsa espacios en un guion
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')

  const cleanExt = extPart.replace(/[^a-zA-Z0-9]+/g, '').toLowerCase()
  const safeName = cleanName || 'video'
  return cleanExt ? `${safeName}.${cleanExt}` : safeName
}

/**
 * Construye el path del objeto para un ejercicio. El id debe ser el UUID del
 * ejercicio generado en el cliente (crypto.randomUUID) para que el objeto y la
 * fila compartan identidad y el CHECK del formato se cumpla.
 * @param {string} exerciseId
 * @param {string} filename
 * @returns {string} p.ej. exercises/<uuid>/mi-video.mp4
 */
export function buildVideoPath(exerciseId, filename) {
  return `exercises/${exerciseId}/${sanitizeFilename(filename)}`
}

/**
 * Valida en el cliente tamaño y tipo del archivo de video. Devuelve un mensaje
 * en español si es inválido, o null si es válido. No sustituye a las políticas
 * del bucket, solo da feedback inmediato.
 * @param {File} file
 * @returns {string|null}
 */
export function validateVideoFile(file) {
  if (!file) {
    return 'Selecciona un archivo de video.'
  }
  if (!ALLOWED_MIME.includes(file.type)) {
    return 'Formato no permitido. Usa MP4, WebM o MOV.'
  }
  if (file.size > MAX_SIZE) {
    return 'El video supera el límite de 50 MB.'
  }
  return null
}

/**
 * Sube un archivo de video al bucket. Con upsert=false falla si el objeto ya
 * existe; con upsert=true lo reemplaza (útil al reemplazar con el mismo nombre).
 * @param {string} path
 * @param {File} file
 * @param {{ upsert?: boolean }} [options]
 * @returns {Promise<{ path: string }>}
 */
export async function uploadExerciseVideo(path, file, { upsert = false } = {}) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert, contentType: file.type })

  if (error) throw error
  return data
}

/**
 * Borra un objeto del bucket. Se usa para rollback (INSERT falló tras subir) y
 * para limpiar el video anterior al reemplazar/eliminar.
 * @param {string} path
 * @returns {Promise<void>}
 */
export async function removeExerciseVideo(path) {
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) throw error
}

/**
 * Crea una URL firmada temporal para previsualizar un objeto privado.
 * @param {string} path
 * @param {number} [ttl=SIGNED_URL_TTL] segundos de validez
 * @returns {Promise<string>} signedUrl
 */
export async function createSignedVideoUrl(path, ttl = SIGNED_URL_TTL) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, ttl)

  if (error) throw error
  return data.signedUrl
}

// --- Avatares (foto de perfil del cliente) --------------------------------

export const AVATAR_BUCKET = 'avatars'

// 5 MB. Coincide con el límite del bucket (file_size_limit).
export const AVATAR_MAX_SIZE = 5242880

export const AVATAR_ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp']

/**
 * Construye el path del avatar de un usuario, RELATIVO al bucket `avatars` (el
 * bucket ya se selecciona con .from(AVATAR_BUCKET), así que NO se repite en el
 * path). El path tiene la forma `<uid>/<filename>`: la primera carpeta es el uid,
 * de modo que las policies de storage (dueño-por-carpeta, foldername(name)[1] =
 * auth.uid()) permiten al cliente escribir/leer solo bajo su propia carpeta.
 * Reutiliza sanitizeFilename para que el último segmento nunca contenga '/'.
 * @param {string} userId UUID del dueño (auth.uid())
 * @param {string} filename
 * @returns {string} p.ej. <uuid>/mi-foto.jpg
 */
export function buildAvatarPath(userId, filename) {
  return `${userId}/${sanitizeFilename(filename)}`
}

/**
 * Valida en el cliente tamaño y tipo del archivo de avatar. Devuelve un mensaje
 * en español si es inválido, o null si es válido. No sustituye a las políticas
 * del bucket, solo da feedback inmediato.
 * @param {File} file
 * @returns {string|null}
 */
export function validateAvatarFile(file) {
  if (!file) {
    return 'Selecciona una imagen.'
  }
  if (!AVATAR_ALLOWED_MIME.includes(file.type)) {
    return 'Formato no permitido. Usa JPG, PNG o WebP.'
  }
  if (file.size > AVATAR_MAX_SIZE) {
    return 'La imagen supera el límite de 5 MB.'
  }
  return null
}

/**
 * Sube (o reemplaza, con upsert=true por defecto) el avatar del usuario. El
 * upsert permite reutilizar el mismo nombre al actualizar la foto.
 * @param {string} path
 * @param {File} file
 * @param {{ upsert?: boolean }} [options]
 * @returns {Promise<{ path: string }>}
 */
export async function uploadAvatar(path, file, { upsert = true } = {}) {
  const { data, error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { upsert, contentType: file.type })

  if (error) throw error
  return data
}

/**
 * Borra el objeto del avatar. Se usa para rollback y al eliminar la foto.
 * @param {string} path
 * @returns {Promise<void>}
 */
export async function removeAvatar(path) {
  const { error } = await supabase.storage.from(AVATAR_BUCKET).remove([path])
  if (error) throw error
}

/**
 * Crea una URL firmada temporal para mostrar el avatar (bucket privado).
 * @param {string} path
 * @param {number} [ttl=SIGNED_URL_TTL] segundos de validez
 * @returns {Promise<string>} signedUrl
 */
export async function createSignedAvatarUrl(path, ttl = SIGNED_URL_TTL) {
  const { data, error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(path, ttl)

  if (error) throw error
  return data.signedUrl
}

// --- Portadas de plan (imagen "producto" del paquete) --------------------

// Bucket PÚBLICO: las portadas se ven en el catálogo anónimo, así que se sirven
// por URL pública (sin firmar). La escritura la restringe la RLS a admin.
export const PACKAGE_COVER_BUCKET = 'package-covers'

// 5 MB. Coincide con el límite del bucket (file_size_limit).
export const PACKAGE_COVER_MAX_SIZE = 5242880

export const PACKAGE_COVER_ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp']

/**
 * Construye el path de una portada, RELATIVO al bucket `package-covers`. Usa un
 * UUID aleatorio como carpeta (no depende del id del paquete, que en creación aún
 * no existe) y reutiliza sanitizeFilename para el último segmento.
 * @param {string} filename
 * @returns {string} p.ej. <uuid>/mi-portada.jpg
 */
export function buildPackageCoverPath(filename) {
  return `${crypto.randomUUID()}/${sanitizeFilename(filename)}`
}

/**
 * Valida en el cliente tamaño y tipo de la portada. Devuelve un mensaje en
 * español si es inválida, o null si es válida. No sustituye a las policies del
 * bucket, solo da feedback inmediato.
 * @param {File} file
 * @returns {string|null}
 */
export function validatePackageCoverFile(file) {
  if (!file) {
    return 'Selecciona una imagen.'
  }
  if (!PACKAGE_COVER_ALLOWED_MIME.includes(file.type)) {
    return 'Formato no permitido. Usa JPG, PNG o WebP.'
  }
  if (file.size > PACKAGE_COVER_MAX_SIZE) {
    return 'La imagen supera el límite de 5 MB.'
  }
  return null
}

/**
 * Sube (o reemplaza, con upsert) la portada al bucket público. Solo un admin
 * pasa la RLS (package_covers_admin_insert/update).
 * @param {string} path
 * @param {File} file
 * @param {{ upsert?: boolean }} [options]
 * @returns {Promise<{ path: string }>}
 */
export async function uploadPackageCover(path, file, { upsert = true } = {}) {
  const { data, error } = await supabase.storage
    .from(PACKAGE_COVER_BUCKET)
    .upload(path, file, { upsert, contentType: file.type })

  if (error) throw error
  return data
}

/**
 * Borra el objeto de una portada (rollback o al reemplazar/quitar).
 * @param {string} path
 * @returns {Promise<void>}
 */
export async function removePackageCover(path) {
  const { error } = await supabase.storage.from(PACKAGE_COVER_BUCKET).remove([path])
  if (error) throw error
}

/**
 * URL pública (permanente, sin firmar) de una portada del bucket público.
 * @param {string} path
 * @returns {string}
 */
export function getPackageCoverUrl(path) {
  const { data } = supabase.storage.from(PACKAGE_COVER_BUCKET).getPublicUrl(path)
  return data.publicUrl
}
