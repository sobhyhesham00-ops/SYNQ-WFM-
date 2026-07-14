# Meshwar backend — REST + WebSocket in one small container.
FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY prisma ./prisma
RUN npx prisma generate
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY prisma ./prisma
RUN npx prisma generate
COPY --from=build /app/dist ./dist
EXPOSE 8080
# Apply migrations then boot. (For prod, run migrate deploy as a release step.)
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
