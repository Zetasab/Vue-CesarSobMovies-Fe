<script setup lang="ts">
const effectiveDate = '13 de abril de 2026'
</script>

<template>
  <main class="privacy-page">
    <section class="privacy-shell">
      <header class="privacy-header">
        <p class="privacy-kicker">Games FE</p>
        <h1 class="privacy-title">Politica de Privacidad y Condiciones de Uso</h1>
        <p class="privacy-effective-date">Vigencia: {{ effectiveDate }}</p>
      </header>

      <article class="privacy-card" aria-label="Contenido legal de privacidad y condiciones de uso">
        <section class="privacy-section">
          <h2>1. Informacion que recopilamos</h2>
          <p>Cuando visitas o usas esta pagina, podemos guardar:</p>
          <ul>
            <li>Direccion IP de las visitas.</li>
            <li>Fecha y hora de cada visita.</li>
            <li>Datos de usuario como nombre y contrasena cifrada al registrarse o autenticarse.</li>
          </ul>
        </section>

        <section class="privacy-section">
          <h2>2. Uso de la informacion</h2>
          <p>
            La informacion de visitas se guarda exclusivamente con fines estadisticos, para mejorar rendimiento,
            estabilidad, seguridad y experiencia general del servicio.
          </p>
        </section>

        <section class="privacy-section">
          <h2>3. Comparticion con terceros</h2>
          <p>
            No vendemos, alquilamos ni cedemos la informacion personal o de visitas a terceros con fines
            comerciales.
          </p>
        </section>

        <section class="privacy-section">
          <h2>4. Conservacion y eliminacion</h2>
          <p>
            La informacion registrada de las visitas se conserva por un periodo maximo de 30 dias y luego se elimina
            de manera automatica o segura.
          </p>
        </section>

        <section class="privacy-section">
          <h2>5. Condiciones de uso</h2>
          <ul>
            <li>Al usar esta pagina aceptas estas politicas y condiciones de uso.</li>
            <li>El usuario es responsable del uso adecuado de su cuenta y credenciales.</li>
            <li>El incumplimiento de estas condiciones puede implicar suspension o restriccion de acceso.</li>
          </ul>
        </section>

        <section class="privacy-section">
          <h2>6. Cambios en este documento</h2>
          <p>
            Podemos actualizar esta politica de privacidad y condiciones de uso en cualquier momento. Los cambios se
            publicaran en esta misma pagina.
          </p>
        </section>

        <section class="privacy-section">
          <h2>7. Naturaleza del proyecto y seguridad</h2>
          <p>
            Este sitio es un proyecto personal y no tiene finalidad comercial. Aunque se aplican medidas para proteger
            los datos sensibles, su objetivo principal es de aprendizaje, por lo que es posible que no cuente con las
            directivas o practicas de seguridad mas avanzadas.
          </p>
        </section>
      </article>
    </section>
  </main>
</template>

<style scoped src="./PrivacyPolicy.css"></style>
