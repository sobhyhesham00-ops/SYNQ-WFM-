# Firestore variant (alternative to PostgreSQL)

Use this **only** if you want the fastest possible pilot with no backend server.
Read the cost warning in `docs/ARCHITECTURE.md §1.2` first — high-frequency
location writes make Firestore's per-operation billing the wrong long-term fit.

## Collections

```
restaurants/{restaurantId}
  name, phone, createdAt

restaurants/{restaurantId}/drivers/{driverId}
  name, phone, status            // "Idle" | "Delivering" | "Offline"
  currentLat, currentLng, lastSeenAt

restaurants/{restaurantId}/orders/{orderId}
  customerAddress, customerPhone
  totalCashToCollect             // integer piastres (1 EGP = 100)
  status                         // "Pending"|"Assigned"|"PickedUp"|"Delivered"|"Cancelled"
  driverId, createdAt, assignedAt, deliveredAt
  settled (bool), settledAt

restaurants/{restaurantId}/drivers/{driverId}/location_logs/{autoId}
  lat, lng, timestamp
```

## Cost-control rules if you go Firestore

- **Do NOT** write a `location_logs` doc every fix. Batch: write one doc per
  20s flush, or skip history entirely for the pilot and only update the driver
  doc's `currentLat/currentLng`.
- The dashboard listens to `drivers` (a handful of docs), **not** to
  `location_logs`. Listening to the log collection is what explodes reads.
- Keep the cash-drawer query on `orders` where
  `status == "Delivered" && settled == false` — index it (composite index on
  `driverId, status, settled`).

## Cash drawer (Firestore, client SDK)

```js
const q = query(
  collection(db, `restaurants/${rid}/orders`),
  where('driverId', '==', driverId),
  where('status', '==', 'Delivered'),
  where('settled', '==', false),
);
const snap = await getDocs(q);
const totalPiastres = snap.docs.reduce((s, d) => s + d.data().totalCashToCollect, 0);
```

Settling should use a Firestore transaction / batched write over the same
result set to stay atomic (mirror of `settleDriverCash` in the SQL version).
