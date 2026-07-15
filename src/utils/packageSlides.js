import { normalizeName } from './packageCovers'

/**
 * Diapositivas del slider superior del catálogo (estilo referencia): por cada
 * plan, un subtítulo corto (se muestra entre corchetes) y una imagen de fondo a
 * pantalla completa. La descripción de cada diapositiva sale de la base de datos
 * (packages.description); aquí solo va lo que no está en la DB.
 *
 * Las imágenes reutilizan las fotos del cliente ya cargadas en /public/images;
 * se pueden sustituir por material dedicado (foto o video horizontal) cuando lo
 * haya. Mapeado por nombre de paquete (insensible a acentos y mayúsculas).
 */
const SLIDES = {
  'plan personalizado': { subtitle: 'Coaching 1 a 1', image: '/images/paquetes.jpg' },
  'plan basico': { subtitle: 'Programa base', image: '/images/mision.jpg' },
  'plan premium': { subtitle: 'Programa avanzado · Coaching premium', image: '/images/comenzar.jpg' },
}

/**
 * Devuelve { subtitle, image } de la diapositiva de un plan, o null si no hay
 * configuración para ese nombre (la vista aplica valores por defecto).
 * @param {string} name
 * @returns {{subtitle: string, image: string}|null}
 */
export function slideFor(name) {
  return SLIDES[normalizeName(name)] ?? null
}
