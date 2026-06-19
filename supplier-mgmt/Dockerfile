# Full-stack image: builds React frontend, runs Express API + serves SPA
FROM node:22-alpine AS frontend-build

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
ENV VITE_API_BASE_URL=/api
RUN npm run build

FROM node:22-alpine

WORKDIR /app/backend

RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont \
  && rm -rf /var/cache/apk/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV NODE_ENV=production

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/ ./
COPY --from=frontend-build /app/frontend/dist ../frontend/dist

RUN mkdir -p uploads && chown -R node:node /app
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]
