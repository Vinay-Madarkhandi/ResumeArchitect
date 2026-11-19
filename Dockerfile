FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN npm run build:worker && npm run build

FROM deps AS worker-deps
RUN npm prune --omit=dev

FROM node:22-bookworm-slim AS platform
RUN apt-get update && apt-get install -y --no-install-recommends util-linux && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/drizzle ./drizzle
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=worker-deps --chown=node:node /app/node_modules ./dist/node_modules
USER node
EXPOSE 3000
CMD ["node", "server.js"]

FROM postgres:17-alpine AS backup
RUN apk add --no-cache aws-cli
COPY scripts/backup.sh /usr/local/bin/resume-backup
USER postgres
ENTRYPOINT ["/usr/local/bin/resume-backup"]
