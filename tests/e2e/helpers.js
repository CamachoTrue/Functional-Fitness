// Helpers para pruebas e2e contra el Supabase local.
import { readFileSync } from 'node:fs'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321'
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
// La service key es un secreto: no se versiona. Solo cuando está presente en el
// entorno se puede promover un usuario a admin y ejercitar el camino admin e2e.
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

/** Indica si hay una service key disponible para las pruebas que requieren admin. */
export const hasServiceRole = Boolean(SERVICE_ROLE_KEY)

export function uniqueEmail(prefix = 'e2e') {
  return `${prefix}+${Date.now()}${Math.floor(Math.random() * 1000)}@test.com`
}

/** Crea un usuario directamente por la API de Auth (evita depender de estado manual). */
export async function createUser({ email, password, fullName = 'E2E User' }) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, data: { full_name: fullName } }),
  })
  if (!res.ok) {
    throw new Error(`signup falló: ${res.status} ${await res.text()}`)
  }
  return res.json()
}

/**
 * Promueve un usuario a admin usando la service key (bypassa RLS). Requiere
 * SUPABASE_SERVICE_ROLE_KEY en el entorno; usar hasServiceRole para saltar el
 * test si no está disponible.
 */
export async function promoteToAdmin(userId) {
  if (!SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY no está definido')
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/user_roles`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ user_id: userId, role: 'admin' }),
  })
  if (!res.ok) {
    throw new Error(`promoción a admin falló: ${res.status} ${await res.text()}`)
  }
}

/**
 * Siembra una compra directamente con la service key (bypassa RLS y la Edge
 * Function) para las vistas de retorno de pago. Requiere
 * SUPABASE_SERVICE_ROLE_KEY en el entorno; usar hasServiceRole para saltar el
 * test si no está disponible. El snapshot se toma del paquete del seed indicado.
 * Devuelve el id de la compra creada.
 */
export async function seedPurchase({
  userId,
  packageId = '10000000-0000-4000-8000-000000000001',
  packageName = 'Plan Basico',
  amount = 499,
  currency = 'MXN',
  durationDays = 30,
  paymentStatus = 'approved',
}) {
  if (!SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY no está definido')
  }
  const now = new Date()
  const isApproved = paymentStatus === 'approved'
  const startDate = isApproved ? now.toISOString() : null
  const endDate = isApproved
    ? new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString()
    : null

  const res = await fetch(`${SUPABASE_URL}/rest/v1/purchases`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      user_id: userId,
      package_id: packageId,
      package_name: packageName,
      amount,
      currency,
      duration_days: durationDays,
      payment_status: paymentStatus,
      start_date: startDate,
      end_date: endDate,
    }),
  })
  if (!res.ok) {
    throw new Error(`seed de compra falló: ${res.status} ${await res.text()}`)
  }
  const rows = await res.json()
  return rows[0].id
}

/**
 * Siembra un cuestionario directamente con la service key (bypassa RLS) para el
 * camino admin e2e. Requiere SUPABASE_SERVICE_ROLE_KEY (usar hasServiceRole para
 * saltar el test si falta). El par (purchase_id, user_id) debe corresponder a una
 * compra approved existente (FK compuesta questionnaires_purchase_owner_fk) y los
 * valores respetan las restricciones del esquema: age 13-100, weight/height > 0,
 * days_per_week 1-7, time_per_session 10-360. Devuelve el id del cuestionario.
 */
export async function seedQuestionnaire({
  userId,
  purchaseId,
  values = {},
}) {
  if (!SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY no está definido')
  }
  const payload = {
    user_id: userId,
    purchase_id: purchaseId,
    objective: 'lose_fat',
    age: 30,
    weight: 75,
    height: 178,
    experience_level: 'basic',
    injuries: 'Ninguna',
    equipment_available: 'gym',
    training_place: 'gym',
    days_per_week: 4,
    time_per_session: 60,
    preferred_schedule: 'morning',
    ...values,
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/questionnaires`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(`seed de cuestionario falló: ${res.status} ${await res.text()}`)
  }
  const rows = await res.json()
  return rows[0].id
}

/**
 * Siembra un ejercicio directamente con la service key (bypassa RLS) para el
 * camino admin e2e. Requiere SUPABASE_SERVICE_ROLE_KEY (usar hasServiceRole para
 * saltar el test si falta). Si se pasa videoPath, debe cumplir el CHECK
 * exercises_video_path_format (^exercises/[0-9a-f-]{36}/[^/]+$). Devuelve el id
 * del ejercicio creado.
 */
export async function seedExercise({
  name = 'E2E Exercise',
  category = 'Pierna',
  muscleGroup = 'Cuádriceps',
  level = 'basic',
  equipment = 'Barra',
  videoPath = null,
} = {}) {
  if (!SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY no está definido')
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/exercises`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      name,
      category,
      muscle_group: muscleGroup,
      level,
      equipment,
      video_path: videoPath,
    }),
  })
  if (!res.ok) {
    throw new Error(`seed de ejercicio falló: ${res.status} ${await res.text()}`)
  }
  const rows = await res.json()
  return rows[0].id
}

/**
 * Siembra una rutina completa (routine + routine_day + routine_exercise) que
 * referencia un ejercicio existente, con la service key (bypassa RLS). Sirve para
 * ejercitar el bloqueo por FK (routine_exercises.exercise_id, on delete restrict)
 * al intentar borrar el ejercicio desde la UI. La rutina se crea en 'draft' (no
 * requiere compra approved por el disparador validate_assigned_routine). Devuelve
 * los ids creados.
 */
export async function seedRoutineWithExercise({
  userId,
  exerciseId,
  routineName = 'E2E Routine',
  dayTitle = 'Día 1',
}) {
  if (!SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY no está definido')
  }
  const headers = {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  }

  const routineRes = await fetch(`${SUPABASE_URL}/rest/v1/routines`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ user_id: userId, name: routineName, status: 'draft' }),
  })
  if (!routineRes.ok) {
    throw new Error(`seed de rutina falló: ${routineRes.status} ${await routineRes.text()}`)
  }
  const routineId = (await routineRes.json())[0].id

  const dayRes = await fetch(`${SUPABASE_URL}/rest/v1/routine_days`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ routine_id: routineId, day_number: 1, title: dayTitle }),
  })
  if (!dayRes.ok) {
    throw new Error(`seed de día de rutina falló: ${dayRes.status} ${await dayRes.text()}`)
  }
  const routineDayId = (await dayRes.json())[0].id

  const reRes = await fetch(`${SUPABASE_URL}/rest/v1/routine_exercises`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      routine_day_id: routineDayId,
      exercise_id: exerciseId,
      order_index: 0,
      sets: '4',
      reps: '12',
    }),
  })
  if (!reRes.ok) {
    throw new Error(`seed de ejercicio de rutina falló: ${reRes.status} ${await reRes.text()}`)
  }
  const routineExerciseId = (await reRes.json())[0].id

  return { routineId, routineDayId, routineExerciseId }
}

/**
 * Siembra una rutina ya ASIGNADA (routine + routine_day + routine_exercise + PATCH
 * status='assigned') ligada a una compra, con la service key (bypassa RLS). Sirve
 * para partir de una rutina asignada existente en los e2e admin (p. ej. verificar
 * el badge "Asignada" o el flujo una-rutina-por-compra). Reusa el patrón de
 * seedRoutineWithExercise: crea la rutina en 'draft' con user_id + purchase_id,
 * añade un día y un ejercicio, y luego hace PATCH a status='assigned'. El PATCH
 * dispara el trigger validate_assigned_routine, por lo que la purchase indicada
 * DEBE existir y estar 'approved' para el mismo user_id (usar seedPurchase con
 * paymentStatus='approved'). Requiere SUPABASE_SERVICE_ROLE_KEY (usar
 * hasServiceRole para saltar el test si falta). Devuelve los ids creados.
 */
export async function seedAssignedRoutine({
  userId,
  purchaseId,
  exerciseId,
  routineName = 'E2E Assigned Routine',
  dayTitle = 'Día 1',
}) {
  if (!SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY no está definido')
  }
  const headers = {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  }

  const routineRes = await fetch(`${SUPABASE_URL}/rest/v1/routines`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      user_id: userId,
      purchase_id: purchaseId,
      name: routineName,
      status: 'draft',
    }),
  })
  if (!routineRes.ok) {
    throw new Error(`seed de rutina asignada falló: ${routineRes.status} ${await routineRes.text()}`)
  }
  const routineId = (await routineRes.json())[0].id

  const dayRes = await fetch(`${SUPABASE_URL}/rest/v1/routine_days`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ routine_id: routineId, day_number: 1, title: dayTitle }),
  })
  if (!dayRes.ok) {
    throw new Error(`seed de día (asignada) falló: ${dayRes.status} ${await dayRes.text()}`)
  }
  const routineDayId = (await dayRes.json())[0].id

  const reRes = await fetch(`${SUPABASE_URL}/rest/v1/routine_exercises`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      routine_day_id: routineDayId,
      exercise_id: exerciseId,
      order_index: 0,
      sets: '4',
      reps: '12',
    }),
  })
  if (!reRes.ok) {
    throw new Error(`seed de ejercicio (asignada) falló: ${reRes.status} ${await reRes.text()}`)
  }
  const routineExerciseId = (await reRes.json())[0].id

  // PATCH a 'assigned': dispara validate_assigned_routine (exige compra approved
  // del mismo user_id) y fija assigned_at automáticamente. No se envía assigned_at.
  const assignRes = await fetch(`${SUPABASE_URL}/rest/v1/routines?id=eq.${routineId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status: 'assigned' }),
  })
  if (!assignRes.ok) {
    throw new Error(`asignación de rutina falló: ${assignRes.status} ${await assignRes.text()}`)
  }

  return { routineId, routineDayId, routineExerciseId }
}

/**
 * Lee un ejercicio por id con la service key (bypassa RLS) para verificar en los
 * e2e efectos que no son visibles en la UI (p. ej. que video_path cambió tras un
 * reemplazo, o que la fila se borró). Devuelve el registro o null si no existe.
 */
export async function fetchExerciseByIdAsService(id) {
  if (!SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY no está definido')
  }
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/exercises?id=eq.${id}&select=id,name,video_path`,
    {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
    },
  )
  if (!res.ok) {
    throw new Error(`lectura de ejercicio falló: ${res.status} ${await res.text()}`)
  }
  const rows = await res.json()
  return rows[0] ?? null
}

/**
 * Vence una compra poniendo su end_date en el pasado con la service key
 * (bypassa RLS). Se usa para el caso negativo del panel del cliente: una rutina
 * ASIGNADA sobre una compra approved deja de ser visible en cuanto la compra
 * expira, porque la ruta de lectura (funciones can_access_* + policy
 * routines_read_assigned_or_admin de 20260618000500) exige end_date nulo o
 * futuro. Permite asignar primero (el trigger validate_assigned_routine exige
 * approved al escribir) y luego expirar sin tocar el estado de la rutina.
 * Requiere SUPABASE_SERVICE_ROLE_KEY.
 * @param {string} purchaseId
 */
export async function expirePurchaseAsService(purchaseId) {
  if (!SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY no está definido')
  }
  // Ambas fechas en el pasado con end_date > start_date, para respetar el CHECK
  // purchases_valid_dates y dejar la compra VENCIDA (end_date < now): así se
  // ejercita la puerta de lectura de 20260618000500 sin violar la restricción.
  const startDate = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
  const endDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const res = await fetch(`${SUPABASE_URL}/rest/v1/purchases?id=eq.${purchaseId}`, {
    method: 'PATCH',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ start_date: startDate, end_date: endDate }),
  })
  if (!res.ok) {
    throw new Error(`expiración de compra falló: ${res.status} ${await res.text()}`)
  }
}

/**
 * Sube un objeto real al bucket privado exercise-videos con la service key
 * (bypassa las policies de storage.objects). Sirve para que el video_path de un
 * ejercicio corresponda a un objeto que EXISTE, de modo que el cliente pueda
 * firmarlo on-demand (policy exercise_videos_client_read_assigned) y el <video>
 * resuelva una signed URL válida en los e2e del panel del cliente. Requiere
 * SUPABASE_SERVICE_ROLE_KEY (usar hasServiceRole para saltar el test si falta).
 *
 * El path debe cumplir el CHECK exercises_video_path_format
 * (^exercises/[0-9a-f-]{36}/[^/]+$) para que luego encaje con exercises.video_path.
 * @param {string} path ej. 'exercises/<uuid>/sample.mp4'
 * @param {string} filePath ruta absoluta al fixture (p. ej. sample.mp4)
 */
export async function uploadExerciseVideoAsService(path, filePath) {
  if (!SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY no está definido')
  }
  const body = readFileSync(filePath)
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/exercise-videos/${path}`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'video/mp4',
      // upsert para que el test sea idempotente si el objeto ya existiera.
      'x-upsert': 'true',
    },
    body,
  })
  if (!res.ok) {
    throw new Error(`subida de video falló: ${res.status} ${await res.text()}`)
  }
  return res.json()
}

/** Inicia sesión a través de la UI. */
export async function loginViaUi(page, email, password) {
  await page.goto('/entrar')
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña').fill(password)
  await page.getByRole('button', { name: /^Entrar$/ }).click()
  // Espera a que el login termine y redirija fuera de /entrar (sesión persistida),
  // para que un page.goto posterior no corra antes de establecerse la sesión.
  await page.waitForURL((url) => !url.pathname.startsWith('/entrar'))
}
