<template>
  <div
    :class="[dimensions, outerColorClass, { 'inline-block': inline }]"
    class="relative border-current rounded-full animate-spin"
  >
    <div
      :class="[innerDimensions, innerColorClass]"
      class="border-1/4 absolute rounded-full"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  size: {
    type: String,
    default: 'md',
    validator: val => ['sm', 'md', 'lg'].includes(val),
  },
  color: {
    type: String,
    default: 'gray',
    validator: val => ['gray', 'purple', 'teal', 'green'].includes(val),
  },
  light: Boolean,
  inline: Boolean,
})

const dimensions = computed(() => {
  switch (props.size) {
    case 'sm': return 'w-4 h-4 border-4'
    case 'lg': return 'w-12 h-12 border-8'
    default:
    case 'md': return 'w-8 h-8 border-8'
  }
})

const innerDimensions = computed(() => {
  switch (props.size) {
    case 'sm': return '-inset-1 border-4'
    case 'lg': return '-inset-2 border-8'
    default:
    case 'md': return '-inset-2 border-8'
  }
})

const outerColorClass = computed(() => {
  return {
    gray: props.light ? 'text-neutral-300' : 'text-neutral-700',
    purple: props.light ? 'text-purple-300' : 'text-purple-700',
    teal: props.light ? 'text-teal-300' : 'text-teal-700',
    green: props.light ? 'text-green-300' : 'text-green-700',
  }[props.color]
})

const innerColorClass = computed(() => {
  return {
    gray: props.light ? 'text-neutral-600' : 'text-neutral-400',
    purple: props.light ? 'text-purple-600' : 'text-purple-400',
    teal: props.light ? 'text-teal-600' : 'text-teal-400',
    green: props.light ? 'text-green-600' : 'text-green-400',
  }[props.color]
})
</script>

<style scoped>
.border-1\/4 {
  border-color: currentcolor transparent transparent transparent;
}
.inline-block {
  vertical-align: -10%;
}
</style>
