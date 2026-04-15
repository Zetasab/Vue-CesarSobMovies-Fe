# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .
RUN npm run build

# Runtime stage
FROM node:20-alpine AS runner
WORKDIR /app

RUN npm install -g serve

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["sh", "-c", "serve -s dist -l tcp://0.0.0.0:${PORT:-8080}"]
