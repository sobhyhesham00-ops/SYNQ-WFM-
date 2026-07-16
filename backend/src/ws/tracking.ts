/**
 * Real-time tracking layer.  (Blueprint §1.3)
 *
 * Two socket paths on one WS server:
 *   /ws/driver     — driver app connects, PUSHES batched location frames.
 *   /ws/dashboard  — manager browser connects, SUBSCRIBES to its restaurant room.
 *
 * Location strategy:
 *   - Driver sends ONE frame every ~20s containing an array of batched samples.
 *   - We persist ALL samples to location_logs (history) and the LATEST to the
 *     driver hot columns, then broadcast ONLY the latest to the dashboard room.
 *   This keeps the manager's browser + bandwidth cheap while retaining full
 *   history for route replay / disputes.
 */
import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { PrismaClient } from '@prisma/client';
import { verifyDriverToken, verifyDashboardToken } from '../services/auth';

const prisma = new PrismaClient();

// restaurantId -> set of dashboard sockets subscribed to it.
const rooms = new Map<string, Set<WebSocket>>();

interface LocationSample { lat: number; lng: number; ts: number } // ts = epoch ms
interface DriverFrame { type: 'locations'; samples: LocationSample[] }

function broadcast(restaurantId: string, payload: unknown) {
  const room = rooms.get(restaurantId);
  if (!room) return;
  const msg = JSON.stringify(payload);
  for (const sock of room) {
    if (sock.readyState === WebSocket.OPEN) sock.send(msg);
  }
}

export function attachTrackingWs(server: Server) {
  // permessage-deflate compresses frames on the wire — helps on Egyptian 3G.
  const wss = new WebSocketServer({ noServer: true, perMessageDeflate: true });

  server.on('upgrade', async (req, socket, head) => {
    const url = new URL(req.url ?? '', 'http://localhost');
    const token = url.searchParams.get('token') ?? '';

    if (url.pathname === '/ws/driver') {
      const driver = await verifyDriverToken(token).catch(() => null);
      if (!driver) return socket.destroy();
      wss.handleUpgrade(req, socket, head, (ws) =>
        handleDriver(ws, driver.driverId, driver.restaurantId),
      );
    } else if (url.pathname === '/ws/dashboard') {
      const mgr = await verifyDashboardToken(token).catch(() => null);
      if (!mgr) return socket.destroy();
      wss.handleUpgrade(req, socket, head, (ws) =>
        handleDashboard(ws, mgr.restaurantId),
      );
    } else {
      socket.destroy();
    }
  });
}

function handleDriver(ws: WebSocket, driverId: string, restaurantId: string) {
  // Attach listeners FIRST (synchronously), before any await — otherwise a frame
  // that arrives during the connect-time DB write is emitted with no listener and
  // silently dropped by `ws`.
  ws.on('message', async (raw) => {
    let frame: DriverFrame;
    try {
      frame = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (frame.type !== 'locations' || !frame.samples?.length) return;

    const samples = frame.samples;
    const latest = samples[samples.length - 1];

    // 1) Append full batch to history (single INSERT round-trip).
    await prisma.locationLog.createMany({
      data: samples.map((s) => ({
        driverId,
        lat: s.lat,
        lng: s.lng,
        timestamp: new Date(s.ts),
      })),
    });

    // 2) Update hot columns with the latest fix only.
    await prisma.driver.update({
      where: { id: driverId },
      data: {
        currentLat: latest.lat,
        currentLng: latest.lng,
        lastSeenAt: new Date(),
      },
    });

    // 3) Fan out ONLY the latest point to the restaurant's dashboards.
    broadcast(restaurantId, {
      type: 'driver_location',
      driverId,
      lat: latest.lat,
      lng: latest.lng,
      ts: latest.ts,
    });
  });

  ws.on('close', async () => {
    await prisma.driver.update({
      where: { id: driverId },
      data: { status: 'Offline', lastSeenAt: new Date() },
    });
    broadcast(restaurantId, { type: 'driver_offline', driverId });
  });

  // Now (after listeners are wired) mark the driver online. Fire-and-forget so a
  // slow DB write can't delay message handling or drop an early frame.
  prisma.driver
    .update({ where: { id: driverId }, data: { status: 'Idle', lastSeenAt: new Date() } })
    .catch((e) => console.error('[ws] driver connect update failed:', e));
}

function handleDashboard(ws: WebSocket, restaurantId: string) {
  let room = rooms.get(restaurantId);
  if (!room) rooms.set(restaurantId, (room = new Set()));
  room.add(ws);

  ws.on('close', () => room!.delete(ws));
}

// Called by REST order routes so order-state changes also reach the dashboard.
export function pushDashboardEvent(restaurantId: string, event: unknown) {
  broadcast(restaurantId, event);
}
