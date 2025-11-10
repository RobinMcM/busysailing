# Multi-stage build for Node.js application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev dependencies for build)
RUN npm ci

# Copy application code
COPY . .

# Build frontend (Vite build creates dist/ folder with static assets)
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev && \
    # tsx is needed to run TypeScript server in production
    npm install tsx

# Copy backend server code (TypeScript files) FIRST
COPY --from=builder /app/server ./server

# Copy built frontend from builder to server/public (where serveStatic expects it)
COPY --from=builder /app/dist ./server/public

# Copy shared types
COPY --from=builder /app/shared ./shared

# Copy essential config files needed by server/vite.ts and runtime
COPY --from=builder /app/vite.config.ts ./vite.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/postcss.config.js ./postcss.config.js
COPY --from=builder /app/tailwind.config.ts ./tailwind.config.ts
COPY --from=builder /app/components.json ./components.json

# Set production environment
ENV NODE_ENV=production
ENV PORT=5000

# Expose port 5000 (required by application)
EXPOSE 5000

# Start Express server with tsx (handles TypeScript + serves static frontend from dist/)
CMD ["npx", "tsx", "server/index.ts"]
