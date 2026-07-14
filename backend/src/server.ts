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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json());

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
server.listen(PORT, () => console.log(`El Kaptin backend on :${PORT}`));
