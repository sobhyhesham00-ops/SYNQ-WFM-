# El Kaptin backend — REST + WebSocket in one small container.
# Runs TypeScript directly with tsx (no build step; avoids ESM extension pitfalls).
FROM node:20-slim
WORKDIR /app

# OpenSSL is needed by Prisma's query engine on slim images.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm install
COPY prisma ./prisma
RUN npx prisma generate
COPY . .

EXPOSE 8080
# Sync schema then boot. For production, swap db push for `prisma migrate deploy`.
CMD ["sh", "-c", "npx prisma db push --skip-generate && npx tsx src/server.ts"]
