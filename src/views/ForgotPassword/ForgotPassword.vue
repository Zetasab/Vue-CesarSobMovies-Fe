<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <main class="forgot-page">
    <section class="forgot-card">
      <p class="forgot-kicker">ZetaGamesFe</p>
      <h1 class="forgot-title">¿Has olvidado tu contraseña?</h1>
      <p class="forgot-message">
        Esta funcionalidad todavia no esta disponible. Contacta con el administrador.
      </p>

      <section class="forgot-social" aria-label="Redes sociales">
        <p class="forgot-social__title">Contacto y redes</p>
        <div class="forgot-social__links">
          <a class="forgot-social__link" href="mailto:cesarsobworkspace@gmail.com" aria-label="Enviar email">
            <v-icon icon="mdi-email-outline" size="18" />
            <span>Correo</span>
          </a>
          <a
            class="forgot-social__link"
            href="https://www.linkedin.com/in/cesar-sobrino-arribas-1b887021b/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Abrir perfil de LinkedIn"
          >
            <v-icon icon="mdi-linkedin" size="18" />
            <span>LinkedIn</span>
          </a>
          <a
            class="forgot-social__link"
            href="https://github.com/Zetasab"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Abrir perfil de GitHub"
          >
            <v-icon icon="mdi-github" size="18" />
            <span>GitHub</span>
          </a>
        </div>
      </section>

      <v-btn color="primary" variant="flat" class="forgot-back-btn" @click="router.push({ name: 'login' })">
        Volver al login
      </v-btn>
    </section>
  </main>
</template>

<style scoped src="./ForgotPassword.css"></style>
