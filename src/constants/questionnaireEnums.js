/**
 * Etiquetas en español de los enums del cuestionario. Fuente única compartida
 * por el formulario del cliente (QuestionnaireForm) y las vistas de admin
 * (ficha del cliente / lista de cuestionarios), para que un mismo valor crudo
 * (p.ej. `basic`, `gym`, `lose_fat`) se muestre siempre igual en toda la UI.
 *
 * Las opciones exponen { value, label } listas para BaseSelect; los mapas
 * value→label se derivan de esas mismas listas.
 */

export const objectiveOptions = [
  { value: 'lose_fat', label: 'Bajar grasa' },
  { value: 'gain_muscle', label: 'Ganar músculo' },
  { value: 'improve_condition', label: 'Mejorar condición' },
  { value: 'improve_performance', label: 'Mejorar rendimiento' },
  { value: 'general_health', label: 'Salud general' },
]

export const experienceOptions = [
  { value: 'basic', label: 'Principiante' },
  { value: 'intermediate', label: 'Intermedio' },
  { value: 'advanced', label: 'Avanzado' },
]

export const trainingPlaceOptions = [
  { value: 'home', label: 'Casa' },
  { value: 'gym', label: 'Gimnasio' },
  { value: 'outdoor', label: 'Exterior' },
]

export const scheduleOptions = [
  { value: 'morning', label: 'Mañana' },
  { value: 'afternoon', label: 'Tarde' },
  { value: 'evening', label: 'Noche' },
]

function toLabelMap(options) {
  return Object.fromEntries(options.map((option) => [option.value, option.label]))
}

const objectiveLabels = toLabelMap(objectiveOptions)
const experienceLabels = toLabelMap(experienceOptions)
const trainingPlaceLabels = toLabelMap(trainingPlaceOptions)
const scheduleLabels = toLabelMap(scheduleOptions)

/**
 * Devuelve la etiqueta en español para un valor de enum. Si el valor es nulo/
 * vacío muestra un guion; si no está mapeado (dato inesperado) devuelve el
 * valor crudo para no ocultar información.
 */
function labelFor(map, value) {
  if (value === null || value === undefined || value === '') return '—'
  return map[value] ?? value
}

export const objectiveLabel = (value) => labelFor(objectiveLabels, value)
export const experienceLabel = (value) => labelFor(experienceLabels, value)
export const trainingPlaceLabel = (value) => labelFor(trainingPlaceLabels, value)
export const scheduleLabel = (value) => labelFor(scheduleLabels, value)
