import { expect, test } from '@playwright/test'

import {
  createUser,
  hasServiceRole,
  loginViaUi,
  seedPurchase,
  uniqueEmail,
} from './helpers.js'

// Cobertura e2e del flujo de checkout y de las vistas de retorno de pago.
// NUNCA usa Mercado Pago real: la invocación a la Edge Function se intercepta con
// page.route() y la redirección externa (window.location.assign) se stubbea. Las
// vistas de retorno leen el estado real desde la base (sembrada con service role).

const BASIC_PACKAGE_ID = '10000000-0000-4000-8000-000000000001'

// Ruta del detalle del Plan Basico (id estable del seed).
const BASIC_DETAIL_PATH = `/package/${BASIC_PACKAGE_ID}`

// Glob que casa con la invocación a la Edge Function create-payment-preference,
// sea cual sea el host de Supabase local.
const CREATE_PREFERENCE_GLOB = '**/functions/v1/create-payment-preference'

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type, apikey, x-client-info',
  'access-control-allow-methods': 'POST, OPTIONS',
}

test('sin sesión, el CTA de compra redirige a /login con redirect', async ({ page }) => {
  await page.goto(BASIC_DETAIL_PATH)
  await expect(page.getByRole('heading', { name: 'Plan Basico' })).toBeVisible()

  await page.getByRole('button', { name: 'Quiero este plan' }).click()

  await expect(page).toHaveURL(/\/login/)
  const loginUrl = new URL(page.url())
  expect(loginUrl.pathname).toBe('/login')
  expect(loginUrl.searchParams.get('redirect')).toBe(BASIC_DETAIL_PATH)
})

test('con sesión, el CTA arranca el checkout y redirige al init_point de Mercado Pago', async ({ page }) => {
  const email = uniqueEmail('checkout')
  await createUser({ email, password: 'secret123' })
  await loginViaUi(page, email, 'secret123')
  await expect(page).toHaveURL(/\/client\/dashboard/)

  const fakeInitPoint = 'https://mp.example.test/checkout/fake-init-point'

  // Interceptamos la invocación a la Edge Function: nunca sale a Mercado Pago.
  await page.route(CREATE_PREFERENCE_GLOB, async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS_HEADERS })
      return
    }
    await route.fulfill({
      status: 200,
      headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
      body: JSON.stringify({
        init_point: fakeInitPoint,
        purchase_id: '99999999-9999-4999-8999-999999999999',
      }),
    })
  })

  // window.location.assign no se puede sobreescribir en Chromium (es nativo y no
  // configurable). En su lugar interceptamos la navegación externa a Mercado Pago
  // con una página stub y verificamos la redirección REAL al init_point.
  await page.route('https://mp.example.test/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<html><body>MP checkout stub</body></html>',
    })
  })

  await page.goto(BASIC_DETAIL_PATH)
  await page.getByRole('button', { name: 'Quiero este plan' }).click()

  // El composable llama a window.location.assign(initPoint) tras crear la
  // preferencia: la app navega al init_point falso (servido por el stub).
  await expect(page).toHaveURL(fakeInitPoint)
})

test('con sesión, un error de la Edge Function muestra el mensaje en español', async ({ page }) => {
  const email = uniqueEmail('checkout-err')
  await createUser({ email, password: 'secret123' })
  await loginViaUi(page, email, 'secret123')
  await expect(page).toHaveURL(/\/client\/dashboard/)

  await page.route(CREATE_PREFERENCE_GLOB, async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS_HEADERS })
      return
    }
    await route.fulfill({
      status: 502,
      headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
      body: JSON.stringify({ error: 'Payment provider error' }),
    })
  })

  // Aun así stubbeamos assign para garantizar que un fallo NUNCA redirige.
  let assigned = null
  await page.addInitScript(() => {
    window.__assignedUrl = null
    window.location.assign = (url) => {
      window.__assignedUrl = url
    }
  })

  await page.goto(BASIC_DETAIL_PATH)
  await page.getByRole('button', { name: 'Quiero este plan' }).click()

  // El error se muestra en español con role=alert y el botón vuelve a estar activo.
  await expect(page.getByRole('alert')).toHaveText(
    'No pudimos iniciar el pago. Intenta de nuevo en unos minutos.',
  )
  await expect(page.getByRole('button', { name: 'Quiero este plan' })).toBeEnabled()

  assigned = await page.evaluate(() => window.__assignedUrl)
  expect(assigned).toBeNull()
})

test('la vista de éxito muestra el estado approved leído desde la base', async ({ page }) => {
  test.skip(!hasServiceRole, 'Requiere SUPABASE_SERVICE_ROLE_KEY para sembrar la compra')

  const email = uniqueEmail('pay-approved')
  const created = await createUser({ email, password: 'secret123' })
  const userId = created?.user?.id ?? created?.id
  const purchaseId = await seedPurchase({ userId, paymentStatus: 'approved' })

  // El dueño debe estar autenticado para que RLS le permita leer su compra.
  await loginViaUi(page, email, 'secret123')
  await expect(page).toHaveURL(/\/client\/dashboard/)

  await page.goto(`/payment/success?external_reference=${purchaseId}`)

  // El estado real (approved) proviene de la base, no de la URL de retorno.
  // La fila "Estado" muestra la etiqueta en español (approved→Aprobada).
  await expect(page.getByRole('heading', { name: 'Pago confirmado' })).toBeVisible()
  await expect(page.getByText('Aprobada')).toBeVisible()
  await expect(page.getByText('Plan Basico')).toBeVisible()
})

test('la vista de retorno muestra "confirmando" para una compra pending', async ({ page }) => {
  test.skip(!hasServiceRole, 'Requiere SUPABASE_SERVICE_ROLE_KEY para sembrar la compra')

  const email = uniqueEmail('pay-pending')
  const created = await createUser({ email, password: 'secret123' })
  const userId = created?.user?.id ?? created?.id
  const purchaseId = await seedPurchase({ userId, paymentStatus: 'pending' })

  await loginViaUi(page, email, 'secret123')
  await expect(page).toHaveURL(/\/client\/dashboard/)

  await page.goto(`/payment/pending?external_reference=${purchaseId}`)

  // Estado pending desde la base: mensaje de confirmación en curso y botón Recargar.
  await expect(page.getByText('Estamos confirmando tu pago', { exact: false })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Recargar' })).toBeVisible()
})
