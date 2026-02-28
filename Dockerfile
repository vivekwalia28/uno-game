FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/

# Install all dependencies
RUN npm ci

# Copy source
COPY shared/ shared/
COPY server/ server/
COPY client/ client/

# Build client
RUN npm run build -w client

# Build server
RUN npm run build -w server

# --- Production stage ---
FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/

# Install production deps only
RUN npm ci --omit=dev

# Copy shared types
COPY shared/ shared/

# Copy built server
COPY --from=builder /app/server/dist/ server/dist/

# Copy built client
COPY --from=builder /app/client/dist/ client/dist/

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "server/dist/server/src/index.js"]
