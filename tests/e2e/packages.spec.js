import { expect, test } from '@playwright/test'

// Cobertura e2e del catálogo público de paquetes. 100% anónimo: no usa la
// service key ni crea usuarios. Los datos provienen del seed de Supabase local
// (3 paquetes activos). Los selectores se anclan por NOMBRE visible (no por
// posición) y el precio se verifica por dígitos, no por el string formateado.

// Nombres de los paquetes del seed (todos con is_active=true).
const PACKAGE_NAMES = ['Plan Basico', 'Plan Personalizado', 'Plan Premium']

// Localiza la tarjeta (BaseCard) que contiene un nombre de paquete concreto.
function packageCard(page, name) {
  // BaseCard renderiza un <article>; acotar a 'article' evita capturar el div
  // contenedor de la grilla (que envuelve las 3 tarjetas a la vez).
  return page
    .locator('article')
    .filter({ has: page.getByRole('heading', { name }) })
    .first()
}

test('el catálogo público muestra los 3 paquetes del seed', async ({ page }) => {
  await page.goto('/packages')

  for (const name of PACKAGE_NAMES) {
    await expect(page.getByRole('heading', { name })).toBeVisible()
  }
})

test('solo el Plan Personalizado muestra el badge Recomendado', async ({ page }) => {
  await page.goto('/packages')

  // El badge del seed corresponde únicamente al Plan Personalizado.
  await expect(page.getByRole('heading', { name: 'Plan Personalizado' })).toBeVisible()

  const recommendedBadges = page.getByText('Recomendado', { exact: true })
  await expect(recommendedBadges).toHaveCount(1)

  // El badge vive dentro de la tarjeta del Plan Personalizado.
  const personalizado = packageCard(page, 'Plan Personalizado')
  await expect(personalizado.getByText('Recomendado', { exact: true })).toBeVisible()

  // Y no aparece en las tarjetas de los otros planes.
  await expect(
    packageCard(page, 'Plan Basico').getByText('Recomendado', { exact: true }),
  ).toHaveCount(0)
  await expect(
    packageCard(page, 'Plan Premium').getByText('Recomendado', { exact: true }),
  ).toHaveCount(0)
})

test('el catálogo muestra un precio para cada paquete', async ({ page }) => {
  await page.goto('/packages')

  // Precio por dígitos del seed (499, 899, 1499), no por string formateado exacto.
  await expect(packageCard(page, 'Plan Basico')).toContainText('499')
  await expect(packageCard(page, 'Plan Personalizado')).toContainText('899')
  await expect(packageCard(page, 'Plan Premium')).toContainText('1,499')
})

test('Ver detalle navega al detalle del paquete con nombre y precio', async ({ page }) => {
  await page.goto('/packages')

  const card = packageCard(page, 'Plan Basico')
  await card.getByRole('link', { name: 'Ver detalle' }).click()

  // La URL cambia a /package/<id> (id del seed para Plan Basico).
  await expect(page).toHaveURL(/\/package\/[0-9a-f-]+$/)

  // El detalle muestra el nombre y el precio del paquete (precio por dígitos).
  await expect(page.getByRole('heading', { name: 'Plan Basico' })).toBeVisible()
  await expect(page.getByText('499')).toBeVisible()
})

test('sin sesión, el CTA de compra redirige a /login con redirect', async ({ page }) => {
  await page.goto('/packages')

  await packageCard(page, 'Plan Personalizado')
    .getByRole('link', { name: 'Ver detalle' })
    .click()

  await expect(page).toHaveURL(/\/package\/[0-9a-f-]+$/)
  const detailUrl = new URL(page.url())
  const detailPath = detailUrl.pathname

  // Usuario anónimo: el CTA lleva a login preservando el return path.
  await page.getByRole('button', { name: 'Quiero este plan' }).click()

  await expect(page).toHaveURL(/\/login/)
  const loginUrl = new URL(page.url())
  expect(loginUrl.pathname).toBe('/login')
  // El query redirect preserva la ruta del detalle para volver tras autenticar.
  expect(loginUrl.searchParams.get('redirect')).toBe(detailPath)
})
