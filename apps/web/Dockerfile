# Optional: host the web app on Render instead of Vercel.
# Vercel remains the recommended home for apps/web.
FROM node:20-alpine
RUN corepack enable && corepack prepare pnpm@10.34.5 --activate
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/package.json
COPY apps/api/package.json ./apps/api/package.json
COPY cdk/package.json ./cdk/package.json
RUN pnpm install --filter @payway/web --frozen-lockfile
COPY apps/web ./apps/web
# Next.js bakes NEXT_PUBLIC_* at build time — pass via --build-arg / dockerBuildArgs.
ARG NEXT_PUBLIC_PAYWAY_API=http://localhost:3000
ARG NEXT_PUBLIC_MERCHANT_ID=demo_merchant
ARG NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=
ARG NEXT_PUBLIC_ADMIN_SLUG=
ARG NEXT_PUBLIC_ADMIN_TOKEN=
ENV NEXT_PUBLIC_PAYWAY_API=$NEXT_PUBLIC_PAYWAY_API \
    NEXT_PUBLIC_MERCHANT_ID=$NEXT_PUBLIC_MERCHANT_ID \
    NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=$NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY \
    NEXT_PUBLIC_ADMIN_SLUG=$NEXT_PUBLIC_ADMIN_SLUG \
    NEXT_PUBLIC_ADMIN_TOKEN=$NEXT_PUBLIC_ADMIN_TOKEN
RUN pnpm --filter @payway/web build
ENV NODE_ENV=production PORT=3100
EXPOSE 3100
CMD ["pnpm", "--filter", "@payway/web", "start"]
