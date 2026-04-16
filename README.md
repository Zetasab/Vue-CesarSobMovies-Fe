# Vue Movies FE

## Estructura de views (encapsulada)

Para mantener el proyecto separado y controlado, cada view vive dentro de su propia carpeta en `src/views`.

Ejemplo:

`src/views/Login/`
- `Login.vue` (estructura/template)
- `useLoginView.ts` (lógica)
- `Login.css` (estilos)

## Crear nuevas views

Usa este comando para crear una view con esa estructura automáticamente:

`npm run new:view NombreView`

Ejemplo:

`npm run new:view Movies`

Esto genera:

`src/views/Movies/`
- `Movies.vue`
- `useMoviesView.ts`
- `Movies.css`

Después, registra la ruta en `src/router/index.ts`.

## Deploy en GitHub Pages

Se agregó el workflow `/.github/workflows/deploy-pages.yml` para publicar automáticamente en Pages.

### Qué incluye el setup

- Build de Vite en CI.
- Fallback SPA (`dist/404.html`) para rutas de Vue Router.
- Archivo `.nojekyll` para evitar problemas con assets.
- Copia de `CNAME` al artifact final para dominio personalizado.

### Configuración de GitHub (una sola vez)

1. En el repositorio, ve a `Settings > Pages`.
2. En `Build and deployment`, selecciona `Source: GitHub Actions`.
3. Haz push a `main` para disparar el deploy.
