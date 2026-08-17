FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./

# package-lock.json is the authoritative lockfile for this application.
# `npm ci` installs it exactly and fails clearly if it is ever out of sync.
RUN npm ci

COPY . ./

RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY server.js ./server.js

EXPOSE 8080

CMD ["node", "server.js"]
