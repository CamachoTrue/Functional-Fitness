<script setup>
const faqs = [
  {
    question: '¿Necesito ir a un gimnasio o equipo especial?',
    answer:
      'No es obligatorio. Al comprar respondes un cuestionario donde indicas el equipo que tienes disponible, y tu plan se arma en función de eso. Si solo cuentas con tu peso corporal, también trabajamos con ello.',
  },
  {
    question: '¿Cómo se personaliza mi plan?',
    answer:
      'Después de tu compra completas un cuestionario con tu nivel de experiencia, objetivos y equipo disponible. Con esa información diseñamos una rutina hecha para ti, no una plantilla genérica.',
  },
  {
    question: '¿Los ejercicios incluyen videos de referencia?',
    answer:
      'Sí. Cada ejercicio de tu rutina incluye un video de referencia para que puedas revisar la técnica y ejecutarlo con seguridad.',
  },
  {
    question: '¿Puedo entrenar desde casa?',
    answer:
      'Claro. El plan se adapta al espacio y al equipo que tengas. Muchas personas entrenan por completo desde casa con resultados sólidos.',
  },
  {
    question: '¿Qué pasa cuando termino mi plan?',
    answer:
      'Cuando concluye tu plan puedes renovar realizando una nueva compra. Así ajustamos tu rutina a tu progreso y a tus nuevos objetivos.',
  },
  {
    question: '¿Cómo realizo el pago?',
    answer:
      'Los pagos se procesan de forma segura a través de Mercado Pago, con las opciones que la plataforma ofrece en tu país.',
  },
]
</script>

<template>
  <section class="bg-surface-muted py-24 sm:py-28">
    <div class="page-container max-w-3xl text-center">
      <p class="text-xs font-medium tracking-[0.2em] text-muted uppercase">Dudas comunes</p>
      <h2 class="mt-4 font-display text-3xl font-light tracking-[0.06em] uppercase sm:text-4xl">
        Preguntas frecuentes
      </h2>

      <div class="mt-10 space-y-3 text-left">
        <details
          v-for="faq in faqs"
          :key="faq.question"
          class="group rounded-xl border border-border-subtle bg-surface-raised"
        >
          <summary
            class="focus-ring flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-5 py-4 font-semibold"
          >
            <span>{{ faq.question }}</span>
            <span
              class="text-xl leading-none text-faint transition-transform group-open:rotate-45"
              aria-hidden="true"
            >
              +
            </span>
          </summary>
          <p class="px-5 pb-5 text-sm leading-7 text-muted">{{ faq.answer }}</p>
        </details>
      </div>
    </div>
  </section>
</template>
