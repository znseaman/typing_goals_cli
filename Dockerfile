FROM node:24.17.0-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:24.17.0-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/src/db/migrations ./src/db/migrations

# Pre-create the `conf` package's config dir with the right ownership so a
# named volume mounted here on first run doesn't come up root-owned.
RUN mkdir -p /home/node/.config && chown -R node:node /home/node/.config

USER node

# This is a stdin-driven REPL (no HTTP port to expose) that prompts on first
# run for your Postgres URL and MonkeyType login, so it must be run with
# `docker run -it`. Config is persisted via the `conf` package under $HOME,
# so mount a volume there if you want it to survive container restarts.
CMD ["node", "dist/main.js"]
