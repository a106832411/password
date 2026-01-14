# syntax=docker.io/docker/dockerfile:1
# ---- Base Stage ----
FROM node:22-slim AS base

# Install dependencies only when needed
FROM base AS deps

WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* .npmrc* ./
# Use Chinese mirror for faster apt downloads (optional, can be disabled)
# Replace Debian sources with Aliyun mirror for faster downloads in China
# Use HTTP instead of HTTPS to avoid certificate issues in Docker build
# Try to replace in debian.sources (Debian 12+) first, fallback to sources.list
RUN if [ -f /etc/apt/sources.list.d/debian.sources ]; then \
        sed -i 's|https\?://[^/]*/debian|http://mirrors.aliyun.com/debian|g' /etc/apt/sources.list.d/debian.sources && \
        sed -i 's|https\?://[^/]*/debian-security|http://mirrors.aliyun.com/debian-security|g' /etc/apt/sources.list.d/debian.sources; \
    elif [ -f /etc/apt/sources.list ]; then \
        sed -i 's|https\?://deb.debian.org|http://mirrors.aliyun.com/debian|g' /etc/apt/sources.list && \
        sed -i 's|https\?://security.debian.org|http://mirrors.aliyun.com/debian-security|g' /etc/apt/sources.list && \
        sed -i 's|deb.debian.org|mirrors.aliyun.com|g' /etc/apt/sources.list && \
        sed -i 's|security.debian.org|mirrors.aliyun.com/debian-security|g' /etc/apt/sources.list; \
    else \
        echo "deb http://mirrors.aliyun.com/debian/ bookworm main" > /etc/apt/sources.list && \
        echo "deb http://mirrors.aliyun.com/debian/ bookworm-updates main" >> /etc/apt/sources.list && \
        echo "deb http://mirrors.aliyun.com/debian-security/ bookworm-security main" >> /etc/apt/sources.list; \
    fi || true
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    build-essential \
    pkg-config \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi


# ---- Builder Stage ----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_OUTPUT=standalone

RUN \
  if [ -f yarn.lock ]; then yarn run build; \
  elif [ -f package-lock.json ]; then npm run build; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm run build; \
  else echo "Lockfile not found." && exit 1; \
  fi

# ---- Runner Stage ----
FROM base AS runner
WORKDIR /app

ENV NEXT_PUBLIC_VERCEL_ENV=production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

#COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

RUN mkdir -p /app/public/fonts && \
	chown -R nextjs:nodejs /app/public && \
	chmod -R 755 /app/public


USER nextjs

EXPOSE 3000

ENV PORT=3000

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/config/next-config-js/output
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
