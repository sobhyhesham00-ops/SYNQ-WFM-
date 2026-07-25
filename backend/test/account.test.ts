/**
 * Account-deletion tests — run against the live server (see the account route).
 * Uses a throwaway business so it never touches the shared seed accounts.
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

test('account deletion: needs the password, then wipes the business and blocks re-login', async () => {
  const email = `del_${Date.now()}@demo.eg`;
  const reg = await j('/api/auth/manager/register', {
    method: 'POST',
    body: { businessName: 'DeleteMe Co', businessType: 'Restaurant', managerName: 'Temp', email, password: 'password123' },
  });
  assert.equal(reg.status, 201);
  const token = reg.body.token as string;
  assert.ok(token);

  // Add a driver + order so there's real child data to cascade through.
  const drv = await j('/api/drivers', { token, method: 'POST', body: { name: 'D', phone: `0111${Date.now() % 10_000_000}`, password: '1234' } });
  assert.equal(drv.status, 201);
  await j('/api/orders', { token, method: 'POST', body: { customerAddress: 'X', totalCashEGP: 50 } });

  // Wrong password is refused.
  const bad = await j('/api/business/account', { token, method: 'DELETE', body: { password: 'nope' } });
  assert.equal(bad.status, 403);

  // Correct password deletes everything.
  const del = await j('/api/business/account', { token, method: 'DELETE', body: { password: 'password123' } });
  assert.equal(del.status, 200);
  assert.equal(del.body.deleted, true);

  // The account is gone — login no longer works.
  const relogin = await j('/api/auth/manager/login', { method: 'POST', body: { email, password: 'password123' } });
  assert.equal(relogin.status, 401);
});
