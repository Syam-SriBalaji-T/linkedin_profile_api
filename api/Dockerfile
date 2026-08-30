ARG NODE_IMAGE=node:22.22.3-alpine
ARG PNPM_VERSION=11.24.0

FROM ${NODE_IMAGE} AS build
ARG PNPM_VERSION
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
COPY scripts ./scripts

RUN pnpm build

RUN pnpm exec tsc scripts/migrate.ts \
      --ignoreConfig \
      --rootDir scripts \
      --outDir dist-scripts \
      --module commonjs \
      --target ES2023 \
      --esModuleInterop \
      --skipLibCheck \
      --strict

FROM ${NODE_IMAGE} AS runtime
ARG PNPM_VERSION
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Install fresh rather than copying node_modules: pnpm's store is a symlink
# farm that does not survive a cross-stage COPY.
RUN pnpm install --prod --frozen-lockfile && pnpm store prune

COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-scripts ./dist-scripts
COPY migrations ./migrations

RUN chown -R node:node /app
USER node
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/main.js"]
