# CoverClick API — Node + Express + Prisma
# Build: docker build -t coverclick-api ./server
# Run:  docker run --env-file .env -p 8787:8787 coverclick-api

FROM node:22-bookworm-slim AS base

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma/

RUN npm ci

COPY tsconfig.json ./
COPY src ./src/

RUN npx prisma generate && npm run build

ENV NODE_ENV=production
ENV CACHE_BUST=2
EXPOSE 8787

# Apply migrations then start (DATABASE_URL required at runtime)
CMD ["node", "dist/index.js"]