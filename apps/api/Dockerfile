# Single stage (keeps prisma CLI for boot-time migrations).
# Prisma engines need openssl on alpine.
FROM node:20-alpine
RUN apk add --no-cache openssl && corepack enable && corepack prepare pnpm@10.34.5 --activate
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY cdk/package.json ./cdk/package.json
RUN pnpm install --filter @payway/api --frozen-lockfile
COPY apps/api ./apps/api
RUN pnpm --filter @payway/api exec prisma generate && pnpm --filter @payway/api build
ENV NODE_ENV=production
EXPOSE 3000
# Render injects $PORT and $DATABASE_URL; RUN_MIGRATIONS=true applies
# pending migrations (prisma/migrations) before the API boots.
CMD ["sh", "-c", "if [ \"$RUN_MIGRATIONS\" = \"true\" ]; then pnpm --filter @payway/api exec prisma migrate deploy; fi; node apps/api/dist/main.js"]
