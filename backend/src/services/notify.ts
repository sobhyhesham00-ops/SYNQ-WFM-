/**
 * Push notifications via Firebase Cloud Messaging (FCM HTTP legacy API).
 * If FCM_SERVER_KEY isn't set, it logs instead of sending — so the app works
 * out of the box and you drop in the key when you're ready.  (FCM is free.)
 */
const FCM_KEY = process.env.FCM_SERVER_KEY;

export async function pushTo(tokens: (string | null | undefined)[], title: string, body: string) {
  const to = tokens.filter((t): t is string => !!t);
  if (to.length === 0) return;

  if (!FCM_KEY) {
    console.log(`[push:noop] ${title} — ${body} → ${to.length} device(s)`);
    return;
  }
  try {
    await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: { Authorization: `key=${FCM_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        registration_ids: to,
        notification: { title, body },
        priority: 'high',
      }),
    });
  } catch (e) {
    console.error('[push] send failed', e);
  }
}
