/** HALL OF LEGENDS — local top-10, arcade-style. localStorage only. */

export interface HallEntry {
  initials: string; // exactly 3 chars, A–Z
  powerLevel: number;
  date: string; // ISO yyyy-mm-dd
}

const KEY = "o9k-hall";
const MAX_ENTRIES = 10;

export function getHall(): HallEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is HallEntry =>
        typeof e === "object" &&
        e !== null &&
        typeof (e as HallEntry).initials === "string" &&
        typeof (e as HallEntry).powerLevel === "number" &&
        typeof (e as HallEntry).date === "string",
    );
  } catch {
    return [];
  }
}

export function addToHall(entry: HallEntry): HallEntry[] {
  const hall = [...getHall(), entry]
    .sort((a, b) => b.powerLevel - a.powerLevel)
    .slice(0, MAX_ENTRIES);
  window.localStorage.setItem(KEY, JSON.stringify(hall));
  return hall;
}

export function qualifiesForHall(powerLevel: number): boolean {
  const hall = getHall();
  if (hall.length < MAX_ENTRIES) return true;
  return powerLevel > hall[hall.length - 1].powerLevel;
}
