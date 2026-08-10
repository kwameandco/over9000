/**
 * Bare-scan power engine (Phase 1).
 *
 * With no combat data entered, the scan produces a plausible, canon-scaled
 * reading seeded from the photo bytes — the same photo always scans the same
 * (decision log 2026-08-10: "cheeky low-confidence read"). The real stats
 * engine (Phase 2) replaces the seed with the honest 0–100 composite; the
 * display curve and flavour tiers below carry over unchanged.
 */

/** FNV-1a over a byte sample — cheap, stable, good enough for a toy seed. */
export function hashBytes(bytes: Uint8Array): number {
  let h = 0x811c9dc5;
  // Sample up to 64 KB so giant photos don't cost anything.
  const step = Math.max(1, Math.floor(bytes.length / 65536));
  for (let i = 0; i < bytes.length; i += step) {
    h ^= bytes[i];
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Mulberry32 PRNG — deterministic from the photo hash. */
export function seededRandom(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface BareScan {
  powerLevel: number;
  /** 8–18%: the scouter has no combat data to go on. */
  confidencePct: number;
}

/**
 * Canon-anchored bare-scan distribution (log-uniform, ~4–1300):
 * most people read double digits; low hundreds is a decent day;
 * a rare photo brushes Gohan's rage spike. Nothing bare-scan can
 * pass Raditz — big numbers must be earned via stats + transforms.
 */
export function bareScan(seed: number): BareScan {
  const rnd = seededRandom(seed);
  const lo = Math.log(4);
  const hi = Math.log(1307);
  const powerLevel = Math.round(Math.exp(lo + (hi - lo) * rnd()));
  const confidencePct = 8 + Math.floor(rnd() * 11);
  return { powerLevel, confidencePct };
}

/** Canon comparison anchors (RESEARCH.md §2 — in-manga + Daizenshuu). */
const FLAVOUR_TIERS: ReadonlyArray<{ max: number; line: string }> = [
  { max: 6, line: "COMPARABLE TO: FARMER (SHOTGUN EQUIPPED)" },
  { max: 50, line: "THREAT CLASS: EARTHLING. NO ACTION REQUIRED" },
  { max: 200, line: "READING STEADY. SUBJECT TRAINS... OCCASIONALLY" },
  { max: 407, line: "APPROACHING DEMON KING (WEIGHTED CLOTHING) LEVELS" },
  { max: 416, line: "COMPARABLE TO: LOW-CLASS WARRIOR (EARTH-RAISED)" },
  { max: 1306, line: "NOTABLE. SAIBAMEN ADVISED TO KEEP DISTANCE" },
  { max: 1500, line: "WARNING: RAGE-SPIKE TERRITORY. HANDLE GENTLY" },
  { max: 4000, line: "ELITE-ADJACENT. VEGETABLE-THEMED WARRIORS WARY" },
  { max: 8000, line: "SIGNAL UNSTABLE. HOLDING DEVICE AT ARM'S LENGTH" },
  { max: 9000, line: "!!! READING APPROACHING DEVICE TOLERANCE !!!" },
  { max: Infinity, line: "IT'S OVER 9000!!! (TECHNICALLY 8000 IN THE ORIGINAL)" },
];

export function flavourLine(powerLevel: number): string {
  return FLAVOUR_TIERS.find((t) => powerLevel <= t.max)!.line;
}

/** The device shatters past this reading (dub canon; purists know it's 8000). */
export const SHATTER_LIMIT = 9000;

export function formatPowerLevel(n: number): string {
  return n.toLocaleString("en-US");
}
