# Build stage - prepare source code only
FROM node:22-alpine AS source

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code (but don't build yet)
COPY . .

# Production stage
FROM nginx:alpine

# Install Node.js in the production container for building
RUN apk add --no-cache nodejs npm

# Copy source and dependencies from build stage
COPY --from=source /app /app

# Copy nginx configuration for SPA routing
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

WORKDIR /app

# Create a startup script that creates .env.production, builds the app and starts nginx
RUN echo -e '#!/bin/sh\nset -e\ncd /app\necho "Creating .env.production file..."\necho "VITE_SUPABASE_URL=$VITE_SUPABASE_URL" > .env.production\necho "VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY" >> .env.production\necho "Building application with production environment..."\nnpm run build:unified\necho "Copying files to nginx..."\ncp -r dist/* /usr/share/nginx/html/\necho "Starting nginx..."\nnginx -g "daemon off;"' > /start.sh && chmod +x /start.sh

EXPOSE 80

CMD ["/start.sh"]