/**
 * Backend entrypoint: one Node process = REST API + WebSocket tracking.
 * This single container (plus Postgres) is the whole MVP backend.
 */
import http from 'http';
import express from 'express';
import cors from 'cors';
import { attachTrackingWs } from './ws/tracking';
import { orderRouter } from './routes/orders';
import { getRestaurantCashDrawers } from './services/cashDrawer';
import { requireManager } from './services/auth';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api', orderRouter);

// End-of-day cash drawer for the whole restaurant.
app.get('/api/cash-drawer', requireManager, async (req, res) => {
  res.json(await getRestaurantCashDrawers(req.auth!.restaurantId));
});

const server = http.createServer(app);
attachTrackingWs(server); // upgrades /ws/driver and /ws/dashboard

const PORT = Number(process.env.PORT ?? 8080);
server.listen(PORT, () => console.log(`Tayar backend on :${PORT}`));
