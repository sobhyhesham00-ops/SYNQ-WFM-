# Aura API container
FROM node:20-alpine AS base
WORKDIR /app

# Install deps (including Prisma) and generate client
COPY package.json ./
RUN npm install
COPY prisma ./prisma
RUN npx prisma generate

# Build TypeScript
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

EXPOSE 4000
CMD ["node", "dist/index.js"]
