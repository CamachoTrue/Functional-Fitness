/**
 * Portadas (carátulas tipo "producto") de cada paquete, mapeadas por NOMBRE de
 * paquete normalizado (minúsculas, sin acentos, sin espacios extra). Se usan en
 * la Home (sección Programas), en el catálogo (/packages) y en el detalle del
 * paquete.
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
 * Normaliza un nombre para emparejar: minúsculas, sin espacios extra y SIN
 * acentos. Así "Plan Básico" (como puede estar en la base de datos de la nube) y
 * "Plan Basico" (seed local) coinciden con la misma clave del mapa. Exportada
 * para reutilizarla en otros mapeos por nombre de paquete (p. ej. las
 * diapositivas del slider).
 * @param {string} name
 * @returns {string}
 */
export function normalizeName(name) {
  return String(name ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
}

/**
 * Devuelve la ruta de la portada de un paquete por su nombre, o null si no tiene
 * portada asignada (en cuyo caso la UI muestra un placeholder). El emparejamiento
 * es insensible a acentos y mayúsculas.
 * @param {string} name Nombre del paquete (p. ej. "Plan Personalizado")
 * @returns {string|null}
 */
export function coverFor(name) {
  return COVERS[normalizeName(name)] ?? null
}
