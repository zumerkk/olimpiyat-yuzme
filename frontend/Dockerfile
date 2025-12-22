# ═══════════════════════════════════════════════════════════════════════════════
#                    KIRIKKALE OLİMPİYAT SPOR KULÜBÜ
#                         Frontend Dockerfile
# ═══════════════════════════════════════════════════════════════════════════════

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build for production
RUN npm run build

# Production stage with Nginx
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose ports
EXPOSE 80 443

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
