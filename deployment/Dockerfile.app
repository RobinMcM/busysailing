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

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built application from builder (dist contains both frontend and backend)
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3000

# Start application (runs: node dist/index.js)
CMD ["npm", "run", "start"]
