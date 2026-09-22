FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY frontend/package*.json frontend/
COPY backend/package*.json backend/
RUN npm ci --prefix frontend && npm ci --prefix backend
COPY frontend frontend
COPY backend backend
RUN npm --prefix frontend run build && npm --prefix backend run build
RUN npm prune --prefix backend --omit=dev

FROM node:22-bookworm-slim
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3001
WORKDIR /app/backend
COPY --from=build --chown=node:node /app/backend/dist ./dist
COPY --from=build --chown=node:node /app/backend/node_modules ./node_modules
COPY --from=build --chown=node:node /app/backend/package.json ./package.json
COPY --from=build --chown=node:node /app/backend/schema.sql ./schema.sql
COPY --from=build --chown=node:node /app/frontend/dist /app/frontend/dist
RUN mkdir -p /app/media && chown node:node /app/media
ENV MEDIA_DIR=/app/media
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:3001/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/backend/src/index.js"]
