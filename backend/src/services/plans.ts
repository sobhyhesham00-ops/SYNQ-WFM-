/**
 * Subscription plan capabilities — the single source of truth for what each
 * tier unlocks. Backend enforces these; the dashboard mirrors them for UX.
 */
export type Plan = 'Free' | 'Starter' | 'Growth' | 'Chain';
export type Feature =
  | 'cashDrawer' | 'trackLinks' | 'analytics' | 'csv' | 'routeReplay' | 'ramadan'
  | 'multiBranch' | 'whatsapp';

interface Caps { driverCap: number; features: Feature[] }

export const PLAN_CAPS: Record<Plan, Caps> = {
  Free:    { driverCap: 1,        features: [] },
  Starter: { driverCap: 3,        features: ['cashDrawer', 'trackLinks'] },
  Growth:  { driverCap: 10,       features: ['cashDrawer', 'trackLinks', 'analytics', 'csv', 'routeReplay', 'ramadan'] },
  Chain:   { driverCap: Infinity, features: ['cashDrawer', 'trackLinks', 'analytics', 'csv', 'routeReplay', 'ramadan', 'multiBranch', 'whatsapp'] },
};

// Monthly price in piastres (Chain is custom → 0 = "contact us").
export const PLAN_PRICE: Record<Plan, number> = {
  Free: 0, Starter: 19900, Growth: 49900, Chain: 0,
};

export const planAllows = (plan: Plan, f: Feature) => PLAN_CAPS[plan].features.includes(f);
export const planDriverCap = (plan: Plan) => PLAN_CAPS[plan].driverCap;
