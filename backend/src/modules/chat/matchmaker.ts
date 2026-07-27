// In-memory random-chat matchmaker with LANGUAGE-AWARE pairing.
// TODO(scale: redis): move the queue to Redis so multiple API instances share it.
//
// Two modes (see docs/PRODUCT.md §5.4):
//   - "same"     : match only when candidates share ≥1 language (best conversation quality)
//   - "exchange" : match a learner of my language with someone I'm learning (cross-language)

export type MatchMode = "same" | "exchange";

export interface Seeker {
  userId: string;
  socketId: string;
  languages: string[]; // languages I speak
  learning: string[]; // languages I want to learn
  mode: MatchMode;
  excludeLanguages: string[]; // languages I don't want to be matched into
  enqueuedAt: number;
}

export interface MatchPair {
  a: Seeker;
  b: Seeker;
  sharedLanguages: string[];
  mode: MatchMode;
}

const queue: Seeker[] = [];

function overlap(a: string[], b: string[]): string[] {
  const bs = new Set(b);
  return a.filter((x) => bs.has(x));
}

function excluded(seeker: Seeker, langs: string[]): boolean {
  return langs.some((l) => seeker.excludeLanguages.includes(l));
}

/** Score a candidate pair; higher is better, -1 means incompatible. */
function score(a: Seeker, b: Seeker): { score: number; shared: string[] } {
  const shared = overlap(a.languages, b.languages);
  if (excluded(a, b.languages) || excluded(b, a.languages)) return { score: -1, shared };

  if (a.mode === "exchange" || b.mode === "exchange") {
    // Good exchange = each can teach what the other is learning.
    const aTeachesB = overlap(a.languages, b.learning).length > 0;
    const bTeachesA = overlap(b.languages, a.learning).length > 0;
    if (aTeachesB && bTeachesA) return { score: 100 + shared.length, shared };
    if (aTeachesB || bTeachesA) return { score: 50, shared };
    return shared.length > 0 ? { score: 10, shared } : { score: -1, shared };
  }

  // "same" mode: require a shared language.
  return shared.length > 0 ? { score: 20 + shared.length, shared } : { score: -1, shared };
}

/** Add a seeker and try to pair them immediately. Returns a pair if matched. */
export function enqueue(seeker: Seeker): MatchPair | null {
  let bestIdx = -1;
  let best = { score: -1, shared: [] as string[] };
  for (let i = 0; i < queue.length; i++) {
    if (queue[i].userId === seeker.userId) continue;
    const s = score(seeker, queue[i]);
    if (s.score > best.score) {
      best = s;
      bestIdx = i;
    }
  }

  if (bestIdx >= 0 && best.score >= 0) {
    const partner = queue.splice(bestIdx, 1)[0];
    return { a: seeker, b: partner, sharedLanguages: best.shared, mode: seeker.mode };
  }

  queue.push(seeker);
  return null;
}

/** Remove a seeker (on skip/disconnect). */
export function dequeue(userId: string): void {
  const idx = queue.findIndex((s) => s.userId === userId);
  if (idx >= 0) queue.splice(idx, 1);
}

export function queueSize(): number {
  return queue.length;
}
