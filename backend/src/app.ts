import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import { apiRouter } from "./routes";
import { errorHandler, notFound } from "./middleware/error";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json({ limit: "1mb" }));

  // Basic global rate limit; tighten per-route (auth, matchmaking) in production.
  app.use(rateLimit({ windowMs: 60_000, max: 120, standardHeaders: true, legacyHeaders: false }));

  app.get("/health", (_req, res) => res.json({ ok: true, service: "aura-api" }));
  app.use("/api", apiRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
