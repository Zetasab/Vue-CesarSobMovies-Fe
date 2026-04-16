# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
WORKDIR /app

COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

FROM deps AS build
WORKDIR /app

COPY . .

# For GitHub Pages use your repo path as base, e.g. /Vue-CesarSobMovies-Fe/
ARG VITE_BASE=/
RUN npm run build -- --base=${VITE_BASE}

# Artifact stage to export static files (dist/) in CI
FROM alpine:3.20 AS artifact
WORKDIR /out
COPY --from=build /app/dist ./dist

# Optional local preview stage
FROM nginx:1.27-alpine AS preview
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
