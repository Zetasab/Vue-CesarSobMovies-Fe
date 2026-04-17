<h1 align="center">
  <span style="color:#E50914">🎬</span>
  <span style="color:#FFFFFF"> CesarSob</span><span style="color:#E50914">Movies</span>
</h1>

<p align="center">
  Por si quieres ver — <a href="https://movies.cesarsobrino.es"><strong>Live Demo</strong></a>
</p>

<p align="center">
  <img src="videoproject.gif" alt="Demo del proyecto" width="100%" />
</p>

---

## ¿Qué es este proyecto?

CesarSobMovies es una aplicación web de prueba para explorar y gestionar películas. Permite buscar títulos, ver detalles de cada película, gestionar listas personalizadas (películas vistas, wishlist, listas privadas) y autenticarse con una cuenta propia.

Los datos de películas se obtienen de la **API de TMDB**, y la gestión de usuarios y listas se apoya en una **API propia (Zeta API)**.

---

## Tecnologías utilizadas

| Categoría | Tecnología |
|---|---|
| Framework | Vue 3 (Composition API) |
| Lenguaje | TypeScript |
| Build tool | Vite |
| UI | Vuetify 3 + Tailwind CSS 4 |
| Routing | Vue Router 4 |
| Tipografías | Montserrat, Roboto (@fontsource) |
| Scroll suave | Lenis |
| Iconos | Material Design Icons (@mdi/font) |
| Deploy | GitHub Pages (workflow CI/CD) |

---

## Estructura del proyecto

```
src/
├── assets/          # GIFs y recursos estáticos
├── components/      # Componentes reutilizables (Navbar, Scrollers, Loading…)
├── models/          # Modelos TypeScript (Movie, MovieList, etc.)
├── router/          # Configuración de rutas (Vue Router)
├── services/        # Llamadas a APIs (TMDB, Zeta API, Auth, Storage…)
└── views/           # Vistas de la app (cada una en su propia carpeta)
    ├── Home/
    ├── Search/
    ├── DetailedMovie/
    ├── Login/
    ├── Register/
    ├── MyMovies/
    ├── MyLists/
    ├── MoviesByList/
    ├── VerifyEmail/
    └── PrivacyPolicy/
```

Cada view sigue la misma estructura encapsulada:

```
src/views/NombreView/
├── NombreView.vue   # Template + estructura
└── NombreView.css   # Estilos propios
```

---

## Cómo iniciar el proyecto

### Requisitos previos

- Node.js 18+
- npm

### Instalación

```bash
npm install
```

### Desarrollo local

```bash
npm run dev
```

La app arranca en `http://localhost:5173` por defecto.

### Build de producción

```bash
npm run build
```

### Preview del build

```bash
npm run preview
```

### Crear una nueva view

```bash
npm run new:view NombreView
```

Genera automáticamente la carpeta con `NombreView.vue` y `NombreView.css` en `src/views/`. Después, registra la ruta en `src/router/index.ts`.

---

