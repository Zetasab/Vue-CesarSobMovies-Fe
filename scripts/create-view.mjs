import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

function toPascalCase(input) {
  return input
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('')
}

const rawName = process.argv[2]

if (!rawName) {
  console.error('Uso: npm run new:view NombreView')
  process.exit(1)
}

const viewName = toPascalCase(rawName)

if (!viewName) {
  console.error('Nombre de view no válido. Usa letras o números.')
  process.exit(1)
}

const viewsRoot = join(process.cwd(), 'src', 'views')
const viewDir = join(viewsRoot, viewName)
const vueFile = join(viewDir, `${viewName}.vue`)
const cssFile = join(viewDir, `${viewName}.css`)
const composableFile = join(viewDir, `use${viewName}View.ts`)

if (existsSync(viewDir)) {
  console.error(`La carpeta de la view ya existe: src/views/${viewName}`)
  process.exit(1)
}

mkdirSync(viewDir, { recursive: true })

const vueContent = `<script setup lang="ts">
import { use${viewName}View } from './use${viewName}View'

const { title } = use${viewName}View()
</script>

<template>
  <main class="${viewName.toLowerCase()}-page">
    <h1 class="${viewName.toLowerCase()}-title">{{ title }}</h1>
  </main>
</template>

<style scoped src="./${viewName}.css"></style>
`

const composableContent = `import { computed } from 'vue'

export function use${viewName}View() {
  const title = computed(() => '${viewName}')

  return {
    title
  }
}
`

const cssContent = `.${viewName.toLowerCase()}-page {
  min-height: 100vh;
  padding: 1rem;
}

.${viewName.toLowerCase()}-title {
  margin: 0;
  font-size: 2rem;
}
`

writeFileSync(vueFile, vueContent, 'utf8')
writeFileSync(composableFile, composableContent, 'utf8')
writeFileSync(cssFile, cssContent, 'utf8')

console.log(`View creada: src/views/${viewName}`)
console.log(`- ${viewName}.vue`)
console.log(`- use${viewName}View.ts`)
console.log(`- ${viewName}.css`)
console.log('Recuerda registrar la ruta en src/router/index.ts')