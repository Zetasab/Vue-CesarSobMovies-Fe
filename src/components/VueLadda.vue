<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    loading?: boolean
    disabled?: boolean
    type?: 'button' | 'submit' | 'reset'
    buttonClass?: string
    dataStyle?: 'zoom-out' | string
  }>(),
  {
    loading: false,
    disabled: false,
    type: 'button',
    buttonClass: 'w-full rounded-md px-4 py-2 bg-primary text-inverted disabled:opacity-60 disabled:cursor-not-allowed',
    dataStyle: ''
  }
)

const isDisabled = computed(() => props.disabled || props.loading)
const laddaClass = computed(() => {
  if (props.loading && props.dataStyle === 'zoom-out') {
    return 'vue-ladda--zoom-out'
  }

  return ''
})
</script>

<template>
  <button
    :type="type"
    :class="[buttonClass, laddaClass]"
    :disabled="isDisabled"
  >
    <span class="inline-flex items-center justify-center gap-2">
      <span
        v-if="loading"
        class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
      />
      <slot>Submit</slot>
    </span>
  </button>
</template>

<style scoped>
.vue-ladda--zoom-out {
  animation: ladda-zoom-out 240ms ease-out;
}

@keyframes ladda-zoom-out {
  0% {
    transform: scale(1);
  }
  100% {
    transform: scale(0.94);
  }
}
</style>