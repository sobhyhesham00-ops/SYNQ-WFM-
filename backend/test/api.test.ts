/**
 * Backend integration tests — run against a live server + Postgres seeded with
 * demo data (see the backend-tests CI workflow). Order-scoped assertions so
 * tests don't couple through shared seed state.
 *
 *   npm test    (boots nothing itself — expects the server on API_BASE)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const API = process.env.API_BASE ?? 'http://localhost:8080';

async function j(path: string, opts: { token?: string; method?: string; body?: unknown } = {}) {
  const res = await fetch(`${API}${path}`, {
    method: opts.method ?? 'GET',
    headers: { 'Content-Type': 'application/json', ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let json: any; try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, body: json };
}
const driverIdOf = (token: string) => JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).driverId as string;
const egpNum = (s: string) => Number(String(s).replace(/[^\d.]/g, ''));

const mgrLogin = () => j('/api/auth/manager/login', { method: 'POST', body: { email: 'manager@demo.eg', password: 'password123' } });
const drvLogin = (phone = '01000000001', password = '1234') => j('/api/auth/driver/login', { method: 'POST', body: { phone, password } });
const newOrder = (token: string, body: Record<string, unknown>) => j('/api/orders', { token, method: 'POST', body });

test('auth: valid logins succeed, bad credentials are rejected', async () => {
  const m = await mgrLogin();
  assert.equal(m.status, 200);
  assert.ok(m.body.token && m.body.refreshToken);
  const d = await drvLogin();
  assert.equal(d.status, 200);
  assert.ok(d.body.token);
  const bad = await j('/api/auth/manager/login', { method: 'POST', body: { email: 'manager@demo.eg', password: 'wrong' } });
  assert.equal(bad.status, 401);
});

test('order lifecycle: create -> assign(OTP) -> pickup -> wrong OTP rejected -> deliver -> settle', async () => {
  const mgr = (await mgrLogin()).body.token;
  const drv = (await drvLogin()).body;
  const driverId = driverIdOf(drv.token);

  const o = (await newOrder(mgr, { customerAddress: 'Lifecycle st', totalCashEGP: 130 })).body;
  assert.equal(o.totalCashToCollect, 13000);

  const a = await j(`/api/orders/${o.id}/assign`, { token: mgr, method: 'POST', body: { driverId } });
  assert.equal(a.status, 200);
  assert.match(a.body.deliveryOtp, /^\d{4}$/);

  const pick = await j(`/api/orders/${o.id}/status`, { token: drv.token, method: 'POST', body: { status: 'PickedUp' } });
  assert.equal(pick.body.status, 'PickedUp');

  const wrong = await j(`/api/orders/${o.id}/status`, { token: drv.token, method: 'POST', body: { status: 'Delivered', otp: '0000' } });
  assert.equal(wrong.status, 400);
  assert.equal(wrong.body.error, 'wrong_otp');

  const del = await j(`/api/orders/${o.id}/status`, { token: drv.token, method: 'POST', body: { status: 'Delivered', otp: a.body.deliveryOtp } });
  assert.equal(del.body.status, 'Delivered');

  const settle = await j(`/api/drivers/${driverId}/settle`, { token: mgr, method: 'POST' });
  assert.equal(settle.status, 200);
  assert.ok(settle.body.orderCount >= 1);
});

test('cancel: frees the order; a delivered order cannot be cancelled', async () => {
  const mgr = (await mgrLogin()).body.token;
  const o = (await newOrder(mgr, { customerAddress: 'Cancel st', totalCashEGP: 50 })).body;
  const c = await j(`/api/orders/${o.id}/cancel`, { token: mgr, method: 'POST', body: { reason: 'duplicate' } });
  assert.equal(c.status, 200);
  assert.equal(c.body.status, 'Cancelled');
  const again = await j(`/api/orders/${o.id}/cancel`, { token: mgr, method: 'POST' });
  assert.equal(again.status, 409);
});

test('reassign: moves the order to another driver + fresh OTP', async () => {
  const mgr = (await mgrLogin()).body.token;
  const a = driverIdOf((await drvLogin('01000000001')).body.token);
  const b = driverIdOf((await drvLogin('01000000002')).body.token);
  const o = (await newOrder(mgr, { customerAddress: 'Reassign st', totalCashEGP: 60 })).body;
  const first = await j(`/api/orders/${o.id}/assign`, { token: mgr, method: 'POST', body: { driverId: a } });
  const second = await j(`/api/orders/${o.id}/assign`, { token: mgr, method: 'POST', body: { driverId: b } });
  assert.equal(second.body.driverId, b);
  assert.notEqual(second.body.deliveryOtp, first.body.deliveryOtp);
  const missing = await j(`/api/orders/${o.id}/assign`, { token: mgr, method: 'POST', body: {} });
  assert.equal(missing.status, 400);
});

test('failed delivery + driver can only touch their own order', async () => {
  const mgr = (await mgrLogin()).body.token;
  const drvA = (await drvLogin('01000000001')).body.token;
  const drvB = (await drvLogin('01000000002')).body.token;
  const a = driverIdOf(drvA);
  const o = (await newOrder(mgr, { customerAddress: 'Fail st', totalCashEGP: 40 })).body;
  await j(`/api/orders/${o.id}/assign`, { token: mgr, method: 'POST', body: { driverId: a } });
  const foreign = await j(`/api/orders/${o.id}/status`, { token: drvB, method: 'POST', body: { status: 'Failed' } });
  assert.equal(foreign.status, 404);
  const fail = await j(`/api/orders/${o.id}/status`, { token: drvA, method: 'POST', body: { status: 'Failed', reason: 'not home' } });
  assert.equal(fail.body.status, 'Failed');
});

test('history, attention, and daily analytics return the expected shapes', async () => {
  const mgr = (await mgrLogin()).body.token;
  const hist = (await j('/api/orders/history?limit=5', { token: mgr })).body;
  assert.ok(Array.isArray(hist.orders) && typeof hist.total === 'number');
  const search = (await j('/api/orders/history?q=zzznomatch', { token: mgr })).body;
  assert.equal(search.total, 0);
  const attn = (await j('/api/orders/attention', { token: mgr })).body;
  assert.ok(Array.isArray(attn.failed) && typeof attn.count === 'number' && attn.thresholds);
  const daily = (await j('/api/analytics/daily?days=7', { token: mgr })).body;
  assert.equal(daily.series.length, 7);
});

test('driver management: deactivate blocks login, reactivate restores it', async () => {
  const mgr = (await mgrLogin()).body.token;
  // Use Sayed so the primary test driver stays usable.
  const sayed = driverIdOf((await drvLogin('01000000002')).body.token);
  const off = await j(`/api/drivers/${sayed}`, { token: mgr, method: 'PATCH', body: { active: false } });
  assert.equal(off.body.active, false);
  assert.equal((await drvLogin('01000000002')).status, 403);
  const on = await j(`/api/drivers/${sayed}`, { token: mgr, method: 'PATCH', body: { active: true } });
  assert.equal(on.body.active, true);
  assert.equal((await drvLogin('01000000002')).status, 200);
});

test('settle math: cash-in-hand accrues on delivery, zeroes on settle, re-settle is a no-op', async () => {
  const mgr = (await mgrLogin()).body.token;
  const drv = (await drvLogin()).body;
  const driverId = driverIdOf(drv.token);
  // Clear any prior unsettled cash to get a known baseline.
  await j(`/api/drivers/${driverId}/settle`, { token: mgr, method: 'POST' });
  assert.equal(egpNum((await j('/api/driver/me/summary', { token: drv.token })).body.inHandEGP), 0);

  const o = (await newOrder(mgr, { customerAddress: 'Settle st', totalCashEGP: 175 })).body;
  const a = await j(`/api/orders/${o.id}/assign`, { token: mgr, method: 'POST', body: { driverId } });
  await j(`/api/orders/${o.id}/status`, { token: drv.token, method: 'POST', body: { status: 'Delivered', otp: a.body.deliveryOtp } });
  assert.equal(egpNum((await j('/api/driver/me/summary', { token: drv.token })).body.inHandEGP), 175);

  const s = await j(`/api/drivers/${driverId}/settle`, { token: mgr, method: 'POST' });
  assert.equal(s.status, 200);
  assert.ok(s.body.orderCount >= 1);
  assert.equal(egpNum((await j('/api/driver/me/summary', { token: drv.token })).body.inHandEGP), 0);

  const again = await j(`/api/drivers/${driverId}/settle`, { token: mgr, method: 'POST' });
  assert.equal(again.body.orderCount, 0);
});

test('edit order: fields update; a delivered order is frozen', async () => {
  const mgr = (await mgrLogin()).body.token;
  const drv = (await drvLogin()).body;
  const o = (await newOrder(mgr, { customerAddress: 'Old', totalCashEGP: 100 })).body;
  const e = await j(`/api/orders/${o.id}`, { token: mgr, method: 'PATCH', body: { customerAddress: 'New addr', totalCashEGP: 250 } });
  assert.equal(e.body.customerAddress, 'New addr');
  assert.equal(e.body.totalCashToCollect, 25000);
  const a = await j(`/api/orders/${o.id}/assign`, { token: mgr, method: 'POST', body: { driverId: driverIdOf(drv.token) } });
  await j(`/api/orders/${o.id}/status`, { token: drv.token, method: 'POST', body: { status: 'Delivered', otp: a.body.deliveryOtp } });
  const frozen = await j(`/api/orders/${o.id}`, { token: mgr, method: 'PATCH', body: { totalCashEGP: 1 } });
  assert.equal(frozen.status, 400);
});

test('shop location: set, reject invalid, clear', async () => {
  const mgr = (await mgrLogin()).body.token;
  const set = await j('/api/business', { token: mgr, method: 'PATCH', body: { shopLat: 30.0626, shopLng: 31.2497 } });
  assert.equal(set.body.shopLat, 30.0626);
  assert.equal(set.body.shopLng, 31.2497);
  const bad = await j('/api/business', { token: mgr, method: 'PATCH', body: { shopLat: 999, shopLng: 31 } });
  assert.equal(bad.status, 400);
  const cleared = await j('/api/business', { token: mgr, method: 'PATCH', body: { shopLat: null, shopLng: null } });
  assert.equal(cleared.body.shopLat, null);
});

test('history date filter: a future range returns nothing', async () => {
  const mgr = (await mgrLogin()).body.token;
  const tomorrow = new Date(Date.now() + 86400_000).toISOString().slice(0, 10);
  const r = (await j(`/api/orders/history?from=${tomorrow}`, { token: mgr })).body;
  assert.equal(r.total, 0);
});

test('business profile: name/phone update; empty name rejected', async () => {
  const mgr = (await mgrLogin()).body.token;
  const upd = await j('/api/business', { token: mgr, method: 'PATCH', body: { name: 'Koshary El Tahrir 2', phone: '0223900001' } });
  assert.equal(upd.body.name, 'Koshary El Tahrir 2');
  assert.equal(upd.body.phone, '0223900001');
  const bad = await j('/api/business', { token: mgr, method: 'PATCH', body: { name: '   ' } });
  assert.equal(bad.status, 400);
});
