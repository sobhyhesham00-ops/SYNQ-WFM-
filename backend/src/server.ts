/**
 * Backend entrypoint: one Node process = REST API + WebSocket tracking.
 * This single container (plus Postgres) is the whole MVP backend.
 */
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { attachTrackingWs } from './ws/tracking';
import { orderRouter } from './routes/orders';
import { authRouter } from './routes/auth';
import { publicRouter } from './routes/public';
import { driverRouter } from './routes/driver';
import { getRestaurantCashDrawers } from './services/cashDrawer';
import { requireManager } from './services/auth';
import { securityHeaders } from './security';

// Fail fast in production if the JWT secret was never set — a default secret in
// prod means anyone can mint valid tokens.
const NODE_ENV = process.env.NODE_ENV ?? 'development';
if (NODE_ENV === 'production') {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 16 || s === 'dev-only-change-me') {
    throw new Error('JWT_SECRET must be set to a strong value (>=16 chars) in production');
  }
}

// CORS allowlist. Default '*' is fine for local dev; set CORS_ORIGIN to your
// dashboard's origin(s) (comma-separated) before going live.
const corsOrigins = (process.env.CORS_ORIGIN ?? '*').split(',').map((o) => o.trim());

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.set('trust proxy', 1); // Render terminates TLS at a proxy; trust it for req.ip
app.use(securityHeaders);
app.use(cors({ origin: corsOrigins.includes('*') ? true : corsOrigins }));
app.use(express.json({ limit: '256kb' }));

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api', authRouter);
app.use('/api', orderRouter);
app.use('/api', driverRouter);
app.use('/api', publicRouter);

// End-of-day cash drawer for the whole restaurant.
app.get('/api/cash-drawer', requireManager, async (req, res) => {
  res.json(await getRestaurantCashDrawers(req.auth!.restaurantId));
});

// Public customer tracking page: /t/:token  (served as a static single page).
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));
app.get('/t/:token', (_req, res) => res.sendFile(path.join(publicDir, 'track.html')));

const server = http.createServer(app);
attachTrackingWs(server); // upgrades /ws/driver and /ws/dashboard

const PORT = Number(process.env.PORT ?? 8080);
server.listen(PORT, () => console.log(`El Kaptin backend on :${PORT} (${NODE_ENV})`));
