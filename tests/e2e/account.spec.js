import { fileURLToPath } from 'node:url'

import { expect, test } from '@playwright/test'

import { createUser, loginViaUi, uniqueEmail } from './helpers.js'

const AVATAR_FIXTURE = fileURLToPath(new URL('./fixtures/avatar.png', import.meta.url))

test('la vista de cuenta muestra el perfil y guarda el nombre', async ({ page }) => {
  const email = uniqueEmail('account')
  await createUser({ email, password: 'secret123', fullName: 'Cuenta Cliente' })
  await loginViaUi(page, email, 'secret123')

  await page.goto('/cuenta')
  await expect(page.getByRole('heading', { name: 'Configuración de cuenta' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Tu perfil' })).toBeVisible()

  // Editar el nombre y guardar: el formulario persiste vía profileService y
  // muestra el mensaje de éxito en español.
  await page.getByLabel('Nombre completo').fill('Cuenta Cliente Editado')
  await page.getByRole('button', { name: /Guardar cambios/ }).click()
  await expect(page.getByText('Datos actualizados correctamente.')).toBeVisible()
})

test('el cliente sube su avatar y persiste tras recargar', async ({ page }) => {
  const email = uniqueEmail('avatar')
  await createUser({ email, password: 'secret123', fullName: 'Avatar Cliente' })
  await loginViaUi(page, email, 'secret123')

  await page.goto('/cuenta')

  // Sin foto, el avatar de respaldo dibuja las iniciales (no hay <img>).
  await expect(page.getByRole('button', { name: 'Cambiar foto' })).toBeVisible()

  // Subir la foto: el input file está oculto; setInputFiles dispara el flujo real
  // (validar → subir al bucket avatars bajo la carpeta del usuario → persistir
  // avatar_path → refrescar el store). Ejercita la policy avatars_owner_insert.
  await page.locator('input[type="file"]').setInputFiles(AVATAR_FIXTURE)

  // La subida termina (el botón vuelve a "Cambiar foto") y no hay error.
  await expect(page.getByRole('button', { name: 'Cambiar foto' })).toBeVisible()
  await expect(page.getByText('No pudimos actualizar tu foto.')).toHaveCount(0)

  // Aserción decisiva del round-trip: al recargar, el avatar_path persistido se
  // firma y se muestra como <img>. Si la subida hubiera fallado (p. ej. RLS), no
  // habría avatar_path y se verían las iniciales, no una imagen.
  // Tras recargar aparece en ambos lugares (tarjeta de perfil y menú de usuario);
  // basta con que el avatar de la tarjeta sea una imagen firmada visible.
  await page.reload()
  await expect(
    page.getByRole('img', { name: /Foto de perfil de Avatar Cliente/ }).first(),
  ).toBeVisible()
})
