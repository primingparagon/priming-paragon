# ---------------------------------------------------
# Stage 1: Builder (TypeScript compilation)
# ---------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Use npm ci for deterministic installs from package-lock.json
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code and build the project
COPY . .
RUN npm run build


# ---------------------------------------------------
# Stage 2: Production Runtime (Slim and Secure)
# ---------------------------------------------------
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy ONLY the compiled JavaScript files from the builder stage
COPY --from=builder /app/dist ./dist

# Create a non-root user for security best practices
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Expose the application port
EXPOSE 4000

# Robust Health Check: Uses the readiness probe endpoint
# This signals orchestrators (like Kubernetes) if the service dependencies (DB/Redis) are ready
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD node -e "fetch('http://localhost:4000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Command to run the production application
CMD ["node", "dist/server.js"]
