<script setup>
import { computed } from 'vue'

/**
 * Avatar circular puramente presentacional. Recibe la URL YA FIRMADA (`src`) o,
 * si no hay foto, dibuja un círculo neutro con las iniciales derivadas de `name`.
 * No accede a Supabase ni a services: quien lo usa (UserMenu, AvatarUpload,
 * dashboard) le pasa la URL resuelta. Solo usa tokens semánticos, así que se
 * adapta a claro/oscuro y se ve con contraste incluso sobre superficies oscuras
 * (el borde delinea el círculo y el texto usa text-body de alto contraste).
 */
const props = defineProps({
  src: {
    type: String,
    default: null,
  },
  name: {
    type: String,
    default: '',
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg'].includes(value),
  },
  // Cuando el avatar vive sobre una superficie intencionalmente oscura
  // (surface-inverse: sidebar, hero, footer) el fallback con tokens de página se
  // funde con el fondo en modo oscuro. Con onInverse el círculo de respaldo usa
  // un tratamiento translúcido claro que contrasta sobre oscuro en ambos temas.
  onInverse: {
    type: Boolean,
    default: false,
  },
})

const SIZE_CLASSES = {
  sm: 'size-8 text-xs',
  md: 'size-12 text-sm',
  lg: 'size-20 text-2xl',
}

const sizeClasses = computed(() => SIZE_CLASSES[props.size] ?? SIZE_CLASSES.md)

// Clases del círculo de respaldo (sin foto). Sobre superficie inversa fijamos un
// fondo blanco translúcido + texto on-inverse, que contrasta en claro y oscuro.
const fallbackClasses = computed(() =>
  props.onInverse
    ? 'border-white/25 bg-white/10 text-on-inverse'
    : 'border-border-subtle bg-surface-muted text-body',
)

// 1-2 letras a partir del nombre: inicial de las dos primeras palabras, o las
// dos primeras letras de una sola palabra. Degrada a '?' si no hay nombre.
const initials = computed(() => {
  const words = String(props.name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
})

const altText = computed(() =>
  props.name ? `Foto de perfil de ${props.name}` : 'Foto de perfil',
)
</script>

<template>
  <img
    v-if="src"
    :src="src"
    :alt="altText"
    class="inline-block max-w-full shrink-0 rounded-full object-cover"
    :class="sizeClasses"
  />
  <span
    v-else
    class="inline-flex shrink-0 items-center justify-center rounded-full border font-semibold"
    :class="[sizeClasses, fallbackClasses]"
    role="img"
    :aria-label="altText"
  >
    {{ initials }}
  </span>
</template>
