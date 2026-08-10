/**
 * Single source of truth for the brand. The name is deliberately swappable in
 * one place (IP guardrail — see docs/PLAN.md §4): nothing else in the codebase
 * may hard-code the product name or domain.
 */
export const SITE = {
  name: "OVER 9000",
  shortName: "O9K",
  tagline: "WHAT'S YOUR POWER LEVEL?",
  domain: "over9000.me", // placeholder until the domain is purchased
  description:
    "Scan yourself, enter your real fitness stats, and find out your power level. A free retro-arcade scouter toy — your photo never leaves your browser.",
  disclaimer:
    "Unofficial fan project — a parody homage. Not affiliated with, endorsed by, or connected to Bird Studio, Shueisha, Toei Animation, or Bandai Namco. All referenced names are the property of their respective owners. No copyrighted assets are used.",
  established: 1999, // in spirit
} as const;
