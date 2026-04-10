# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Build tools needed for native Node.js addons (sharp, libsignal, etc.)
RUN apk add --no-cache python3 make g++ git

# Install dependencies first (layer cache)
COPY package.json ./
RUN npm install --omit=dev

# Copy source
COPY . .

# Create runtime directories
RUN mkdir -p sessions logs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "src/server.js"]
