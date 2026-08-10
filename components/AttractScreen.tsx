"use client";

import { useEffect, useState } from "react";
import { SITE } from "@/lib/site.config";
import { getHall, type HallEntry } from "@/lib/hall";
import { formatPowerLevel } from "@/lib/power";

export default function AttractScreen({ onStart }: { onStart: () => void }) {
  const [hall, setHall] = useState<HallEntry[]>([]);

  useEffect(() => {
    setHall(getHall().slice(0, 5));
  }, []);

  return (
    <button
      type="button"
      onClick={onStart}
      className="flex min-h-[480px] w-full cursor-pointer flex-col items-center justify-center gap-8 px-4 py-10 text-center sm:min-h-[560px]"
    >
      <div>
        <p className="font-crt text-phosphor-dim text-xl">SCOUTER OS v9.2</p>
        <p className="font-arcade text-phosphor glow mt-4 text-3xl leading-relaxed sm:text-5xl">
          {SITE.shortName}
        </p>
        <p className="font-crt text-phosphor mt-3 text-2xl">
          POWER LEVEL DIAGNOSTIC UNIT
        </p>
      </div>

      {hall.length > 0 && (
        <div className="font-crt text-xl leading-relaxed">
          <p className="text-marquee-yellow mb-1">— HALL OF LEGENDS —</p>
          <ol>
            {hall.map((e, i) => (
              <li key={`${e.initials}-${e.date}-${e.powerLevel}`}>
                <span className="text-phosphor-dim">{i + 1}. </span>
                <span className="text-phosphor">{e.initials}</span>
                <span className="text-phosphor-dim"> ... </span>
                <span className="text-phosphor-bright">
                  {formatPowerLevel(e.powerLevel)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <p className="font-arcade text-phosphor-bright glow animate-blink text-sm sm:text-lg">
        PRESS START
      </p>

      <p className="font-crt text-phosphor-dim text-lg">
        EST. {SITE.established} · NO COINS REQUIRED · YOUR PHOTO NEVER LEAVES
        THIS MACHINE
      </p>
    </button>
  );
}
