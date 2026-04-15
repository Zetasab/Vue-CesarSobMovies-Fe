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
