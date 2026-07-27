import dotenv from "dotenv";

dotenv.config();

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
  databaseUrl: required("DATABASE_URL", "postgresql://aura:aura@localhost:5432/aura?schema=public"),
  jwt: {
    accessSecret: required("JWT_ACCESS_SECRET", "dev-access-secret"),
    refreshSecret: required("JWT_REFRESH_SECRET", "dev-refresh-secret"),
    accessTtl: process.env.JWT_ACCESS_TTL ?? "15m",
    refreshTtl: process.env.JWT_REFRESH_TTL ?? "30d",
  },
  redisUrl: process.env.REDIS_URL ?? "",
  agora: {
    appId: process.env.AGORA_APP_ID ?? "",
    appCertificate: process.env.AGORA_APP_CERTIFICATE ?? "",
  },
  isProd: (process.env.NODE_ENV ?? "development") === "production",
};
