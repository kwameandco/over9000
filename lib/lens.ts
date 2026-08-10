/**
 * Scouter lens colourways. Canon: green is the Frieza-force standard issue,
 * red (Turles) and blue (first-gen, DBS: Broly) are the variant colours,
 * purple appears occasionally — and colour never meant rank, so skins are
 * canon-safe (RESEARCH.md §1).
 */

export interface LensTheme {
  id: LensId;
  label: string;
  main: string;
  bright: string;
  dim: string;
}

export type LensId = "green" | "red" | "blue" | "purple";

export const LENSES: Record<LensId, LensTheme> = {
  green: {
    id: "green",
    label: "STANDARD ISSUE",
    main: "#35ff6d",
    bright: "#9dffb8",
    dim: "#1d9a45",
  },
  red: {
    id: "red",
    label: "RENEGADE",
    main: "#ff5040",
    bright: "#ffb3a8",
    dim: "#a3271a",
  },
  blue: {
    id: "blue",
    label: "FIRST GEN",
    main: "#3fbcff",
    bright: "#b5e3ff",
    dim: "#1c6ea6",
  },
  purple: {
    id: "purple",
    label: "PROTOTYPE",
    main: "#c95bff",
    bright: "#e7c0ff",
    dim: "#7d2fa8",
  },
};

const KEY = "o9k-lens";

export function loadLens(): LensId {
  if (typeof window === "undefined") return "green";
  const v = window.localStorage.getItem(KEY);
  return v && v in LENSES ? (v as LensId) : "green";
}

export function saveLens(id: LensId): void {
  window.localStorage.setItem(KEY, id);
}
