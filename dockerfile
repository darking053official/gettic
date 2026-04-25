# Dockerfile - Gettic Node.js Backend
FROM node:18-alpine

WORKDIR /app

# Package files
COPY package*.json ./
RUN npm ci --only=production

# Source
COPY . .

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

EXPOSE 3000

USER node

CMD ["node", "server.js"]
