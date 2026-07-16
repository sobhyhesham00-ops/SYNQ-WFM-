// Mirror of the backend plan caps (backend is the enforcer; this is for UX gating).
import type { PlanTier } from './api';

export type Feature =
  | 'cashDrawer' | 'trackLinks' | 'analytics' | 'csv' | 'routeReplay' | 'ramadan'
  | 'multiBranch' | 'whatsapp';

const FEATURES: Record<PlanTier, Feature[]> = {
  Free: [],
  Starter: ['cashDrawer', 'trackLinks'],
  Growth: ['cashDrawer', 'trackLinks', 'analytics', 'csv', 'routeReplay', 'ramadan'],
  Chain: ['cashDrawer', 'trackLinks', 'analytics', 'csv', 'routeReplay', 'ramadan', 'multiBranch', 'whatsapp'],
};
const DRIVER_CAP: Record<PlanTier, number> = { Free: 1, Starter: 3, Growth: 10, Chain: Infinity };

export const can = (plan: PlanTier | undefined, f: Feature) => (FEATURES[plan ?? 'Free']).includes(f);
export const driverCap = (plan: PlanTier | undefined) => DRIVER_CAP[plan ?? 'Free'];
// The cheapest plan that unlocks a feature (for the upgrade prompt).
export const minPlanFor = (f: Feature): PlanTier =>
  (['Free', 'Starter', 'Growth', 'Chain'] as PlanTier[]).find((p) => FEATURES[p].includes(f)) ?? 'Growth';
