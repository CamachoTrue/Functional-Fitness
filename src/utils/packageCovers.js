/**
 * Portadas (carátulas tipo "producto") de cada paquete, mapeadas por NOMBRE de
 * paquete normalizado (minúsculas, sin espacios extra). Se usan en la Home
 * (sección Programas), en el catálogo (/packages) y en el detalle del paquete.
 *
 * A medida que el cliente envíe nuevas portadas se agregan aquí. Si en el futuro
 * conviene, esto puede migrar a una columna en la tabla `packages`; por ahora el
 * mapeo por nombre es suficiente y evita tocar el esquema.
 */
const COVERS = {
  'plan personalizado': '/images/covers/personalizado.jpg',
  'plan basico': '/images/covers/basico.jpg',
  'plan premium': '/images/covers/premium.jpg',
}

/**
 * Devuelve la ruta de la portada de un paquete por su nombre, o null si no tiene
 * portada asignada (en cuyo caso la UI muestra un placeholder).
 * @param {string} name Nombre del paquete (p. ej. "Plan Personalizado")
 * @returns {string|null}
 */
export function coverFor(name) {
  return COVERS[String(name ?? '').trim().toLowerCase()] ?? null
}
