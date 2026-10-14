FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
ARG VITE_API_BASE_URL
ARG VITE_API_TIMEOUT=30000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL VITE_API_TIMEOUT=$VITE_API_TIMEOUT
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine

# API_ORIGIN (ex. https://api.tahiry.mg) alimente la politique CSP « connect-src » ;
ENV API_ORIGIN=http://localhost:8000 \
    BACKEND_URL=http://backend:8000
COPY deploy/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
