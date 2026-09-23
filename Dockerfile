# Production image for the India Bank NetBanking app (Express server + built React app).
# Used for the "deploy from a Docker image" route on Render when no git host is available.
#
#   docker build -t <dockerhub-user>/india-netbanking:latest .
#   docker push  <dockerhub-user>/india-netbanking:latest

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
# Runtime deps only; the server bundle keeps packages external, so they must be installed.
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/index.html ./index.html
EXPOSE 3000
CMD ["node", "dist/server.cjs"]
