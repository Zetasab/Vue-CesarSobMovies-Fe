<script setup lang="ts">
import { computed } from 'vue'

type FeedbackState = 'idle' | 'loading' | 'correct' | 'wrong'

const props = defineProps<{
  state: FeedbackState
}>()

const buttonColor = computed(() => {
  if (props.state === 'correct') return 'success'
  if (props.state === 'wrong') return 'error'
  return 'primary'
})

const buttonText = computed(() => {
  if (props.state === 'loading') return 'Cargando...'
  if (props.state === 'correct') return 'Correcto'
  if (props.state === 'wrong') return 'Error'
  return 'Ingresar'
})

const buttonIcon = computed(() => {
  if (props.state === 'correct') return 'mdi-check'
  if (props.state === 'wrong') return 'mdi-close'
  if (props.state === 'idle') return 'mdi-login'
  return 'mdi-loading'
})
</script>

<template>
  <v-btn
    type="submit"
    :color="buttonColor"
    block
    size="large"
    class="mt-4 feedback-btn"
    :loading="state === 'loading'"
    :disabled="state !== 'idle'"
  >
    <template #prepend>
      <Transition name="icon-swap" mode="out-in">
        <v-icon
          :key="`${state}-${buttonIcon}`"
          :icon="buttonIcon"
        />
      </Transition>
    </template>

    {{ buttonText }}
  </v-btn>
</template>

<style scoped>
.feedback-btn {
  transition: background-color 220ms ease, color 220ms ease, border-color 220ms ease;
}

.icon-swap-enter-active,
.icon-swap-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.icon-swap-enter-from,
.icon-swap-leave-to {
  opacity: 0;
  transform: scale(0.75) rotate(-12deg);
}
</style>