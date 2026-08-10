"use client";

import { useCallback, useEffect, useState } from "react";
import { SITE } from "@/lib/site.config";
import {
  coin,
  initSoundPref,
  isSoundEnabled,
  setSoundEnabled,
  unlockAudio,
} from "@/lib/audio";
import AttractScreen from "@/components/AttractScreen";
import Scanner from "@/components/Scanner";

type Screen = "attract" | "scanner";

export default function Cabinet() {
  const [screen, setScreen] = useState<Screen>("attract");
  const [sound, setSound] = useState(true);

  useEffect(() => {
    setSound(initSoundPref());
  }, []);

  const pressStart = useCallback(() => {
    unlockAudio();
    coin();
    setScreen("scanner");
  }, []);

  useEffect(() => {
    if (screen !== "attract") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        pressStart();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screen, pressStart]);

  const toggleSound = () => {
    const next = !isSoundEnabled();
    setSoundEnabled(next);
    setSound(next);
    if (next) {
      unlockAudio();
      coin();
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-2 sm:px-4">
      {/* Marquee */}
      <header className="bevel bg-bezel rounded-t-lg px-4 pt-5 pb-4 text-center">
        <h1 className="font-arcade text-marquee-yellow glow-pink text-2xl tracking-wider sm:text-4xl">
          {SITE.name}
        </h1>
        <p className="font-crt text-marquee-cyan mt-2 text-xl sm:text-2xl">
          {SITE.tagline}
        </p>
      </header>

      {/* Control strip */}
      <div className="bevel bg-bezel flex items-center justify-between border-t-0 px-3 py-1.5">
        <span className="font-crt text-phosphor-dim text-lg">
          CREDIT 1 &nbsp;·&nbsp; FREE PLAY
        </span>
        <button
          type="button"
          onClick={toggleSound}
          className="font-crt text-phosphor hover:text-phosphor-bright text-lg"
          aria-pressed={sound}
        >
          SOUND: {sound ? "ON" : "OFF"}
        </button>
      </div>

      {/* CRT screen */}
      <main className="crt bevel min-h-[480px] overflow-hidden border-t-0 sm:min-h-[560px]">
        {screen === "attract" ? (
          <AttractScreen onStart={pressStart} />
        ) : (
          <Scanner />
        )}
      </main>
    </div>
  );
}
