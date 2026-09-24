# ==============================================================================
# DX-LAB (DX-OS) - Process Core Service Containerfile
# Copyright (C) 2026 DX-LAB Development Team
# License: AGPL-3.0
# ==============================================================================

FROM node:24.21.0-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json tsconfig.json ./
RUN npm ci

COPY src/ ./src/
RUN npm run build

FROM node:24.21.0-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY src/adapters/postgres/migrations ./migrations

# The named attachment volume is initialized from this path on first use.
# Its ownership must match the unprivileged runtime user.
RUN mkdir -p /var/lib/dxlab/attachments \
    && chown -R node:node /var/lib/dxlab

USER node

EXPOSE 3000

CMD ["node", "dist/index.js"]
