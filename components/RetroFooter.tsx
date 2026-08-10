"use client";

import { useEffect, useState } from "react";
import { SITE } from "@/lib/site.config";

const UPDATES: ReadonlyArray<{ date: string; note: string }> = [
  { date: "10.08.2026", note: "MACHINE POWERED ON. FIRST SCANS OPERATIONAL!!" },
  { date: "10.08.2026", note: "HALL OF LEGENDS INSTALLED. BRING QUARTERS." },
  { date: "09.08.2026", note: "SITE UNDER CONSTRUCTION 4EVER. CHECK BACK SOON" },
];

const WEBRING: ReadonlyArray<{ label: string; href: string }> = [
  { label: "WIBY", href: "https://wiby.me" },
  { label: "CAMERON'S WORLD", href: "https://www.cameronsworld.net" },
  { label: "THE OLD NET", href: "https://theoldnet.com" },
];

/** Fake-but-always-climbing odometer, seeded from the clock. */
function hitCount(): number {
  const epoch = Date.UTC(2026, 0, 1);
  const minutes = Math.floor((Date.now() - epoch) / 60_000);
  return 90_210 + minutes * 3 + (minutes % 7);
}

function Badge({ top, bottom }: { top: string; bottom: string }) {
  return (
    <span className="bevel bg-crt-black inline-flex h-[31px] w-[88px] flex-col items-center justify-center leading-none select-none">
      <span className="font-arcade text-marquee-cyan text-[6px]">{top}</span>
      <span className="font-arcade text-marquee-yellow mt-0.5 text-[6px]">
        {bottom}
      </span>
    </span>
  );
}

export default function RetroFooter() {
  const [hits, setHits] = useState<number | null>(null);

  useEffect(() => {
    setHits(hitCount());
  }, []);

  return (
    <footer className="mx-auto mt-6 w-full max-w-3xl px-2 pb-10 sm:px-4">
      {/* Under-construction stripe */}
      <div
        aria-hidden
        className="h-4 w-full"
        style={{
          background:
            "repeating-linear-gradient(45deg, #ffe600 0 12px, #0c0c14 12px 24px)",
        }}
      />

      <div className="font-crt text-phosphor-dim mt-4 grid gap-6 text-lg sm:grid-cols-2">
        {/* Updates log — shrine style */}
        <div>
          <h2 className="text-marquee-pink glow-pink font-arcade mb-2 text-[10px]">
            ~*~ UPDATES ~*~
          </h2>
          <ul className="space-y-1">
            {UPDATES.map((u) => (
              <li key={`${u.date}-${u.note}`}>
                <span className="text-phosphor">[{u.date}]</span> {u.note}
              </li>
            ))}
          </ul>
        </div>

        {/* Hit counter + webring */}
        <div className="sm:text-right">
          <p>
            YOU ARE VISITOR N<span className="align-super text-sm">o.</span>
          </p>
          <p
            className="font-arcade text-phosphor-bright glow mt-1 inline-block bg-black px-2 py-1 text-sm tracking-widest"
            suppressHydrationWarning
          >
            {hits === null ? "······" : String(hits).padStart(6, "0")}
          </p>
          <p className="mt-3">
            {"<<"} PART OF THE RETRO WEBRING {">>"}
            <br />
            {WEBRING.map((w, i) => (
              <span key={w.href}>
                {i > 0 && " · "}
                <a
                  href={w.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-marquee-cyan underline hover:text-phosphor-bright"
                >
                  {w.label}
                </a>
              </span>
            ))}
          </p>
        </div>
      </div>

      {/* Badge wall */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Badge top="NETSCAPE" bottom="NOW! 4.0" />
        <Badge top="MADE WITH" bottom="NOTEPAD" />
        <Badge top="BEST AT" bottom="800x600" />
        <Badge top="POWERED" bottom="BY KI" />
        <Badge top="Y2K" bottom="READY" />
        <Badge top="EST." bottom={String(SITE.established)} />
      </div>

      {/* The one serious block */}
      <p className="font-crt text-phosphor-dark mt-6 max-w-prose text-base leading-snug">
        {SITE.disclaimer}
      </p>
      <p className="font-crt text-phosphor-dark mt-2 text-base">
        PRIVACY: your photo is processed entirely in your browser and never
        uploaded anywhere — this machine has no server to send it to. Scores
        and settings live only in your browser&apos;s local storage.
      </p>
    </footer>
  );
}
