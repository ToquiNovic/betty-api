# Base Stage
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate
WORKDIR /app

# Dependencies Stage
FROM base AS dependencies
COPY package.json pnpm-lock.yaml* ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile || pnpm install

# Development Stage
FROM base AS development
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["pnpm", "run", "start:dev"]

# Build Stage
FROM base AS build
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN pnpm run build
RUN pnpm prune --prod

# Production Stage
FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
EXPOSE 3000
CMD ["node", "dist/main"]
