/**
 * Manager dashboard — live tracking hook (React).  (Blueprint §1.3 step 6)
 * Subscribes to the restaurant room and exposes live driver pins + cash drawer.
 */
import { useEffect, useRef, useState } from 'react';

interface DriverPin { driverId: string; lat: number; lng: number; ts: number }
interface DrawerLine { orderId: string; amountPiastres: number }
interface Drawer { driverId: string; totalEGP: string; lines: DrawerLine[] }

export function useTracking(wsBase: string, token: string, onEvent?: (msg: Record<string, unknown>) => void) {
  const [pins, setPins] = useState<Record<string, DriverPin>>({});
  const [drawers, setDrawers] = useState<Record<string, Drawer>>({});
  const [nonce, setNonce] = useState(0); // bump to force a reconnect
  const wsRef = useRef<WebSocket | null>(null);
  // Keep the latest callback without re-opening the socket every render.
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    // No token yet (logged out) → don't open a socket.
    if (!token) return;

    let closedByUs = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const ws = new WebSocket(`${wsBase}/ws/dashboard?token=${token}`);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      onEventRef.current?.(msg);
      switch (msg.type) {
        case 'driver_location':
          setPins((p) => ({ ...p, [msg.driverId]: msg }));
          break;
        case 'driver_offline':
          setPins((p) => {
            const n = { ...p };
            delete n[msg.driverId];
            return n;
          });
          break;
        case 'order_status':
          if (msg.drawer)
            setDrawers((d) => ({ ...d, [msg.drawer.driverId]: msg.drawer }));
          break;
        case 'cash_settled':
          setDrawers((d) => {
            const n = { ...d };
            delete n[msg.driverId]; // cleared to zero
            return n;
          });
          break;
      }
    };

    // Reconnect on unexpected drop (not on unmount / logout).
    ws.onclose = () => {
      if (!closedByUs) retry = setTimeout(() => setNonce((n) => n + 1), 3000);
    };
    return () => { closedByUs = true; clearTimeout(retry); ws.close(); };
  }, [wsBase, token, nonce]);

  return { pins, drawers };
}
