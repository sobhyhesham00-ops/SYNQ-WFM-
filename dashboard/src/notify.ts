// Attention cues for the dashboard: a short beep + an optional desktop
// notification, so a failed delivery is noticed even when the tab is in the
// background. All best-effort — never throw into the caller.

let audioCtx: AudioContext | null = null;

export function beep() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    audioCtx ??= new Ctx();
    if (audioCtx.state === 'suspended') void audioCtx.resume();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.setValueAtTime(880, now + 0.12);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(now); osc.stop(now + 0.35);
  } catch { /* ignore */ }
}

export function desktopNotify(title: string, body: string) {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  } catch { /* ignore */ }
}

export type NotifyState = 'unsupported' | 'default' | 'granted' | 'denied';

export function notifyState(): NotifyState {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission as NotifyState;
}

export async function requestNotify(): Promise<NotifyState> {
  if (!('Notification' in window)) return 'unsupported';
  try { return (await Notification.requestPermission()) as NotifyState; }
  catch { return notifyState(); }
}
