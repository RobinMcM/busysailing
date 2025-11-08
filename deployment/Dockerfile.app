# Multi-stage build for Node.js application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev dependencies for build)
RUN npm ci

# Copy application code
COPY . .

# Build frontend (requires Vite, TypeScript, etc. from devDependencies)
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install ALL dependencies (Vite and other dev deps are needed at runtime for the middleware)
COPY package*.json ./
RUN npm ci

# Copy built application from builder
COPY --from=builder /app/dist ./dist
# Copy server directory (needed for vite.ts middleware and other runtime server files)
COPY --from=builder /app/server ./server
# Copy shared types
COPY --from=builder /app/shared ./shared

# Expose port
EXPOSE 3000

# Start application (runs: node dist/index.js)
CMD ["npm", "run", "start"]
