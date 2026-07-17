import { expect, test } from '@playwright/test'

import { createUser, hasServiceRole, loginViaUi, promoteToAdmin, uniqueEmail } from './helpers.js'

// Cobertura e2e del CRUD admin de paquetes (Fase 9) y de su efecto en el catálogo
// público. Requiere la service key para promover el admin (promoteToAdmin); sin
// ella los casos se saltan. Los paquetes NO se borran en duro: solo se activan o
// desactivan (is_active), y el catálogo público (/packages) filtra por is_active.
//
// Se ancla por nombre único (uniqueEmail no aplica a paquetes; se usa un sufijo de
// tiempo) para no chocar con los 3 paquetes del seed ni con corridas previas.

test.describe('admin: CRUD de paquetes (requiere service role)', () => {
  test.skip(!hasServiceRole, 'Requiere SUPABASE_SERVICE_ROLE_KEY para promover al admin')

  const adminPassword = 'secret123'
  let adminEmail

  test.beforeAll(async () => {
    adminEmail = uniqueEmail('admin-pkg')
    const admin = await createUser({
      email: adminEmail,
      password: adminPassword,
      fullName: 'Admin Paquetes E2E',
    })
    const adminId = admin?.user?.id ?? admin?.id
    await promoteToAdmin(adminId)
  })

  // Localiza la fila de la tabla admin que contiene el nombre del paquete.
  function packageRow(page, name) {
    return page.getByRole('row').filter({ hasText: name })
  }

  // Localiza la tarjeta pública (BaseCard -> <article>) de un paquete por nombre.
  function publicCard(page, name) {
    return page
      .locator('article')
      .filter({ has: page.getByRole('heading', { name }) })
      .first()
  }

  test('crear, editar y alternar is_active con reflejo en el catálogo público', async ({
    page,
  }) => {
    const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`
    const packageName = `Plan E2E ${suffix}`

    await loginViaUi(page, adminEmail, adminPassword)

    // --- Crear ---
    await page.goto('/admin/packages')
    await expect(page.getByRole('heading', { name: 'Paquetes' })).toBeVisible()

    await page.getByRole('link', { name: 'Nuevo paquete' }).click()
    await expect(page).toHaveURL(/\/admin\/packages\/create/)
    await expect(page.getByRole('heading', { name: 'Nuevo paquete' })).toBeVisible()

    await page.getByLabel('Nombre').fill(packageName)
    await page.getByLabel('Descripción').fill('Paquete creado por la prueba e2e.')
    await page.getByLabel('Precio').fill('777')
    await page.getByLabel('Moneda').fill('MXN')
    await page.getByLabel('Duración (días)').fill('30')
    await page.getByLabel('Beneficio 1').fill('Rutina personalizada')
    // Debe quedar activo para verse en el catálogo público (checkbox por defecto on).

    await page.getByRole('button', { name: 'Crear paquete' }).click()

    // Vuelve a la lista y el paquete recién creado aparece.
    await expect(page).toHaveURL(/\/admin\/packages$/)
    await expect(packageRow(page, packageName)).toContainText(packageName)
    await expect(packageRow(page, packageName)).toContainText('Activo')

    // --- Editar (cambiar precio y descripción) ---
    await packageRow(page, packageName).getByRole('link', { name: 'Editar' }).click()
    await expect(page).toHaveURL(/\/admin\/packages\/[0-9a-f-]+\/edit/)
    await expect(page.getByRole('heading', { name: 'Editar paquete' })).toBeVisible()

    // El formulario está poblado con el valor guardado.
    await expect(page.getByLabel('Precio')).toHaveValue('777')

    await page.getByLabel('Precio').fill('888')
    await page.getByLabel('Descripción').fill('Descripción actualizada por e2e.')
    await page.getByRole('button', { name: 'Guardar cambios' }).click()

    await expect(page).toHaveURL(/\/admin\/packages$/)
    // El precio se muestra formateado con useCurrency (contiene los dígitos 888).
    await expect(packageRow(page, packageName)).toContainText('888')

    // El catálogo público lo muestra (is_active=true) con el nuevo precio.
    await page.goto('/planes')
    await expect(page.getByRole('heading', { name: packageName })).toBeVisible()
    await expect(publicCard(page, packageName)).toContainText('888')

    // --- Desactivar: desaparece del catálogo público ---
    await page.goto('/admin/packages')
    await packageRow(page, packageName).getByRole('button', { name: 'Desactivar' }).click()
    await expect(packageRow(page, packageName)).toContainText('Inactivo')

    await page.goto('/planes')
    await expect(page.getByRole('heading', { name: packageName })).toHaveCount(0)

    // --- Reactivar: vuelve a aparecer en el catálogo público ---
    await page.goto('/admin/packages')
    await packageRow(page, packageName).getByRole('button', { name: 'Activar' }).click()
    await expect(packageRow(page, packageName)).toContainText('Activo')

    await page.goto('/planes')
    await expect(page.getByRole('heading', { name: packageName })).toBeVisible()
  })
})
