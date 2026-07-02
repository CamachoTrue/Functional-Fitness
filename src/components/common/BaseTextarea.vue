<script setup>
defineOptions({ inheritAttrs: false })

defineProps({
  id: {
    type: String,
    required: true,
  },
  label: {
    type: String,
    required: true,
  },
  modelValue: {
    type: String,
    default: '',
  },
  error: {
    type: String,
    default: '',
  },
  rows: {
    type: Number,
    default: 3,
  },
})

defineEmits(['update:modelValue'])
</script>

<template>
  <div>
    <label class="mb-2 block text-sm font-semibold text-neutral-800" :for="id">{{ label }}</label>
    <textarea
      v-bind="$attrs"
      :id="id"
      class="focus-ring min-h-24 w-full rounded-md border bg-white px-3.5 py-2.5 text-sm"
      :class="error ? 'border-red-500' : 'border-neutral-300'"
      :rows="rows"
      :value="modelValue"
      :aria-invalid="Boolean(error)"
      :aria-describedby="error ? `${id}-error` : undefined"
      @input="$emit('update:modelValue', $event.target.value)"
    />
    <p v-if="error" :id="`${id}-error`" class="mt-1.5 text-sm text-red-700">{{ error }}</p>
  </div>
</template>
