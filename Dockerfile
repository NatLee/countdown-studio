# Builds the static site, then serves it with nginx. No Node.js in the final image.
#   docker compose up            -> http://localhost:8000
#   PORT=3000 docker compose up  -> http://localhost:3000

# Keep in step with .nvmrc (the version CI uses).
ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
