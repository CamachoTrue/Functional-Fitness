# Especificación: componente de anatomía muscular (MuscleMap)

> Guardado para implementar más adelante (fase del diagrama de cuerpo). Base
> aportada por el usuario. Antes de codificar: revisar la estructura actual del
> proyecto e implementar de la forma más limpia posible.

## ⚠️ Adaptaciones obligatorias para ESTE proyecto (leer primero)

1. **Color de acento = VERDE de la marca, NO naranja.** La spec de abajo usa
   `#f97316` (naranja) como ejemplo; en este proyecto el único acento es
   `brand-green`. Los músculos resaltados deben usar el verde de la marca con
   distintas **opacidades** para las intensidades (primary/secondary/stabilizer),
   y respetar los **tokens de color** (modo claro/oscuro) — nada de colores fijos.
2. **Compatibilidad Vue 3.** `vue-muscle-group-selector` (itsalb3rt) es probablemente
   **Vue 2**; verificar antes de instalar. Si no es compatible con Vue 3 + Vite,
   ir directo al **fallback SVG** (opción 10 de la spec), que además nos da control
   total del estilo y del modo oscuro.
3. **Datos de músculos.** Los ejercicios ya tienen un campo `muscle_group` (un solo
   grupo). Para el modelo primary/secondary/stabilizer hará falta o un archivo de
   mapeo (`exerciseMuscles.js`) o extender el esquema de `exercises`. Decidir al
   implementar (probablemente empezar por un mapeo local por categoría/nombre).
4. **Modo lectura** (`readOnly`) en la vista de rutina/ejercicio del cliente: solo
   se ven los músculos iluminados, no se seleccionan.
5. Cuerpo **frontal y trasero**, responsive (desktop y móvil), sin romper el diseño.

## Objetivo

Componente visual reutilizable (`MuscleMap.vue`) que muestre una silueta humana
(frontal + trasera) e ilumine los músculos que trabaja una rutina o ejercicio.

## Librería candidata

- `vue-muscle-group-selector` — demo: https://vue-muscle-group-selector.netlify.app/
  · repo: https://github.com/itsalb3rt/vue-muscle-group-selector
- Si no funciona con la versión actual de Vue → fallback SVG propio.

## Props del componente

```js
{
  selectedMuscles: Array,   // uso simple
  muscles: Object,          // { primary: [], secondary: [], stabilizers: [] }
  readOnly: Boolean,
  darkMode: Boolean,
}
```

Ejemplos:

```vue
<MuscleMap :selected-muscles="['pectorals','abs','triceps']" :read-only="true" />

<MuscleMap :muscles="{ primary:['pectorals'], secondary:['triceps'], stabilizers:['core'] }" />
```

## Mapeo ejercicio → músculos (con intensidades)

```js
const exerciseMuscles = {
  press_banca: { primary: ['pectorals'], secondary: ['triceps','front-deltoids'], stabilizers: ['core'] },
  sentadilla:  { primary: ['quadriceps','glutes'], secondary: ['hamstrings'], stabilizers: ['core','calves'] },
  peso_muerto: { primary: ['hamstrings','glutes'], secondary: ['back','traps'], stabilizers: ['core'] },
  dominadas:   { primary: ['lats'], secondary: ['biceps','forearms'], stabilizers: ['core'] },
}
```

## Helper: músculos de una rutina completa (sin repetir)

```js
function getRoutineMuscles(routineExercises) {
  const muscles = new Set()
  routineExercises.forEach((exercise) => {
    const id = exercise.id || exercise.slug || exercise.name
    ;(exerciseMuscles[id] || []).forEach((m) => muscles.add(m))
  })
  return Array.from(muscles)
}
```

## Fallback SVG (si la librería no sirve)

- SVG de cuerpo humano con cada músculo separado por `id`.
- Clases dinámicas según selección; iluminar con CSS + transición.

```vue
<path id="pectorals" :class="{ active: selectedMuscles.includes('pectorals') }" />
```

```css
.muscle { fill: var(--muscle-base); stroke: var(--muscle-stroke); transition: all .25s ease; }
.muscle.active { fill: var(--brand-green); filter: drop-shadow(0 0 8px color-mix(in srgb, var(--brand-green) 60%, transparent)); }
/* Intensidades: primary opacidad 1 · secondary ~.6 · stabilizer ~.3 */
```

## Intensidades visuales

- **Primary**: más brillante.
- **Secondary**: media.
- **Stabilizers**: suave.

## Integración

- Vista de **detalle de rutina** y **detalle de ejercicio** (cliente).
- También en el **armado de rutinas del admin** (para que el entrenador lo vea).

```vue
<MuscleMap :selected-muscles="getRoutineMuscles(routine.exercises)" :read-only="true" />
```

## Entregables

- Instalar la librería (si funciona) o crear el SVG.
- `MuscleMap.vue`.
- Archivo de mapeo `exerciseMuscles.js`.
- Integración en rutina/ejercicio.
- Responsive + modo oscuro.
- Documentar los IDs/nombres de músculos usados.
