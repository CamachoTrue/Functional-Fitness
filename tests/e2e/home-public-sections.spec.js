import { expect, test } from '@playwright/test'

// Cobertura e2e de las secciones públicas estáticas de la Home (rebrand Sera
// Trainer). 100% anónimo: no usa la service key, no crea usuarios ni toca la base.
// Los selectores se anclan por TEXTO visible (headings / nombres de enlaces).

test('la sección de FAQ muestra el heading y las preguntas se pueden expandir', async ({
  page,
}) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: /preguntas frecuentes/i })).toBeVisible()

  // Cada pregunta vive en un <details> nativo; localizamos la primera por texto.
  const firstQuestion = page.getByText('¿Necesito ir a un gimnasio o equipo especial?')
  await expect(firstQuestion).toBeVisible()

  // El <details> arranca colapsado: la respuesta no es visible hasta abrir.
  const answer = page.getByText(/Al comprar respondes un cuestionario/)
  await expect(answer).toBeHidden()

  // Al hacer clic en el <summary> se expande y la respuesta se vuelve visible.
  await firstQuestion.click()
  await expect(answer).toBeVisible()
})

test('desde el inicio, un programa destacado navega a su detalle', async ({ page }) => {
  await page.goto('/')

  // La sección "Programas" lista los paquetes activos como enlaces (cada tarjeta
  // contiene un <h3> con el nombre del plan). Debe llevar a /plan/<id>, no a 404.
  const programLink = page
    .getByRole('link')
    .filter({ has: page.getByRole('heading', { level: 3 }) })
    .first()
  await expect(programLink).toBeVisible()
  await programLink.click()

  await expect(page).toHaveURL(/\/plan\/[0-9a-f-]+$/)
})

test('la sección de reseñas muestra el heading y una reseña', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: /^reseñas$/i })).toBeVisible()
  await expect(page.getByText('Ana Ramírez')).toBeVisible()
})

test('el CTA del hero "Quiero comenzar" navega a /register', async ({ page }) => {
  await page.goto('/')

  // "Quiero comenzar" solo existe en el hero.
  await page.getByRole('link', { name: 'Quiero comenzar' }).click()
  await expect(page).toHaveURL(/\/register/)
})

test('el CTA del hero "Ver paquetes" navega a /planes', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('link', { name: 'Ver paquetes' }).click()
  await expect(page).toHaveURL(/\/planes/)
})

test('el botón flotante de WhatsApp apunta a wa.me con mensaje prellenado', async ({ page }) => {
  await page.goto('/')

  const whatsapp = page.getByRole('link', { name: 'Escríbenos por WhatsApp' })

  // El botón sólo se renderiza si VITE_WHATSAPP_NUMBER está definida (v-if).
  // Si el número no está configurado en el entorno, no hay nada que verificar.
  if ((await whatsapp.count()) === 0) {
    test.skip(true, 'VITE_WHATSAPP_NUMBER no está definida; el botón degrada y no se renderiza.')
    return
  }

  await expect(whatsapp).toBeVisible()

  const href = await whatsapp.getAttribute('href')
  // href = https://wa.me/<solo dígitos>?text=<mensaje codificado>
  expect(href).toMatch(/^https:\/\/wa\.me\/\d+/)
  expect(href).toContain('?text=')

  // Abre WhatsApp en una pestaña nueva de forma segura.
  await expect(whatsapp).toHaveAttribute('target', '_blank')
  await expect(whatsapp).toHaveAttribute('rel', /noopener/)
})
