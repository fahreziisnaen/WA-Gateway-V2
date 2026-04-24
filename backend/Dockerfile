# ── Stage 1: Build (installs native addons) ────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Build tools needed for native Node.js addons (better-sqlite3, libsignal, etc.)
RUN apk add --no-cache python3 make g++ git

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# ── Stage 2: Production image (lean — no build tools) ─────────────────────────
FROM node:20-alpine

WORKDIR /app

# su-exec: lightweight privilege-drop helper (used in entrypoint)
RUN apk add --no-cache su-exec

# Copy installed modules from builder stage
COPY --from=builder /app/node_modules ./node_modules

# Copy application source
COPY . .

# Create non-root user and pre-create runtime directories.
# Ownership of /app/data and /app/sessions is fixed at container start
# by docker-entrypoint.sh (handles named-volume root ownership).
RUN addgroup -S appgroup \
    && adduser -S appuser -G appgroup \
    && mkdir -p sessions data \
    && sed -i 's/\r$//' docker-entrypoint.sh \
    && chmod +x docker-entrypoint.sh

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "src/server.js"]
