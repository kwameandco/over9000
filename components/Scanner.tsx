"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent,
} from "react";
import {
  bareScan,
  flavourLine,
  formatPowerLevel,
  hashBytes,
} from "@/lib/power";
import { coin, lockOn, scanTick } from "@/lib/audio";
import { downloadCard, renderCard, shareCard } from "@/lib/export-card";
import { addToHall, qualifiesForHall } from "@/lib/hall";

type Phase = "idle" | "ready" | "scanning" | "result";

const GLYPHS = "▚▞▟▙◢◣◤◥△▽◁▷◇◆∴∵≡≠⌆⌗";
const SCAN_MS = 2600;

function randomGlyphs(n: number): string {
  let s = "";
  for (let i = 0; i < n; i++) {
    s += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
  }
  return s;
}

export default function Scanner() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [seed, setSeed] = useState(0);
  const [reticle, setReticle] = useState({ xPct: 50, yPct: 38 });
  const [display, setDisplay] = useState(0);
  const [glyphs, setGlyphs] = useState("");
  const [result, setResult] = useState<{
    powerLevel: number;
    confidencePct: number;
  } | null>(null);
  const [initials, setInitials] = useState("");
  const [hallState, setHallState] = useState<"hidden" | "offer" | "saved">(
    "hidden",
  );
  const [busy, setBusy] = useState(false);
  const [canShare, setCanShare] = useState(false);

  const rafRef = useRef(0);
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCanShare(
      typeof navigator !== "undefined" && typeof navigator.share === "function",
    );
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !f.type.startsWith("image/")) return;
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoUrl(URL.createObjectURL(f));
    setFile(f);
    const buf = await f.arrayBuffer();
    setSeed(hashBytes(new Uint8Array(buf)));
    setResult(null);
    setHallState("hidden");
    setReticle({ xPct: 50, yPct: 38 });
    setPhase("ready");
    coin();
  };

  const placeReticle = (e: MouseEvent<HTMLDivElement>) => {
    if (phase !== "ready") return;
    const rect = e.currentTarget.getBoundingClientRect();
    setReticle({
      xPct: ((e.clientX - rect.left) / rect.width) * 100,
      yPct: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  const startScan = useCallback(() => {
    if (!seed) return;
    const target = bareScan(seed);
    setPhase("scanning");
    setDisplay(0);
    const t0 = performance.now();
    let lastTick = 0;
    let lastGlyph = 0;

    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / SCAN_MS);
      const eased = 1 - (1 - p) ** 3;
      const jitter = (1 - p) * target.powerLevel * 0.35 * Math.random();
      setDisplay(Math.max(0, Math.round(target.powerLevel * eased + jitter)));
      if (now - lastGlyph > 70) {
        setGlyphs(randomGlyphs(14));
        lastGlyph = now;
      }
      if (now - lastTick > 170 - p * 120) {
        scanTick(p);
        lastTick = now;
      }
      if (p < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setDisplay(target.powerLevel);
        setResult(target);
        setPhase("result");
        setHallState(qualifiesForHall(target.powerLevel) ? "offer" : "hidden");
        lockOn();
      }
    };
    rafRef.current = requestAnimationFrame(step);
  }, [seed]);

  const exportBlob = async (): Promise<Blob | null> => {
    if (!file || !result) return null;
    return renderCard({
      file,
      reticle,
      powerLevel: result.powerLevel,
      confidencePct: result.confidencePct,
      flavour: flavourLine(result.powerLevel),
    });
  };

  const onDownload = async () => {
    setBusy(true);
    try {
      const blob = await exportBlob();
      if (blob) downloadCard(blob);
    } finally {
      setBusy(false);
    }
  };

  const onShare = async () => {
    setBusy(true);
    try {
      const blob = await exportBlob();
      if (blob && (await shareCard(blob)) === "unsupported") {
        downloadCard(blob);
      }
    } finally {
      setBusy(false);
    }
  };

  const saveInitials = () => {
    if (!result || initials.length === 0) return;
    addToHall({
      initials: initials.toUpperCase().padEnd(3, "·").slice(0, 3),
      powerLevel: result.powerLevel,
      date: new Date().toISOString().slice(0, 10),
    });
    setHallState("saved");
    coin();
  };

  const btn =
    "bevel bg-bezel font-arcade text-phosphor hover:text-phosphor-bright cursor-pointer px-3 py-2 text-[10px] disabled:opacity-50";

  return (
    <div className="flex min-h-[480px] flex-col sm:min-h-[560px]">
      {/* Viewport */}
      <div
        ref={frameRef}
        onClick={placeReticle}
        className={`relative h-[320px] overflow-hidden sm:h-[400px] ${
          phase === "ready" ? "cursor-crosshair" : ""
        }`}
      >
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt="Scan subject"
            className="h-full w-full object-cover opacity-90"
          />
        ) : (
          <label className="font-crt text-phosphor hover:text-phosphor-bright flex h-full w-full cursor-pointer flex-col items-center justify-center gap-3 text-2xl">
            <span className="bevel bg-bezel font-arcade px-4 py-3 text-xs">
              INSERT SUBJECT
            </span>
            <span className="text-phosphor-dim text-lg">
              UPLOAD A PHOTO — IT NEVER LEAVES YOUR DEVICE
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFile}
              className="sr-only"
            />
          </label>
        )}

        {/* Reticle */}
        {photoUrl && (
          <div
            className="pointer-events-none absolute z-20 h-24 w-24 -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_0_6px_#35ff6d]"
            style={{ left: `${reticle.xPct}%`, top: `${reticle.yPct}%` }}
          >
            <span className="border-phosphor absolute top-0 left-0 h-5 w-5 border-t-3 border-l-3" />
            <span className="border-phosphor absolute top-0 right-0 h-5 w-5 border-t-3 border-r-3" />
            <span className="border-phosphor absolute bottom-0 left-0 h-5 w-5 border-b-3 border-l-3" />
            <span className="border-phosphor absolute right-0 bottom-0 h-5 w-5 border-r-3 border-b-3" />
            <span className="bg-phosphor absolute top-1/2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full" />
          </div>
        )}

        {/* Scan sweep */}
        {phase === "scanning" && (
          <div className="animate-sweep via-phosphor/35 absolute inset-x-0 z-30 h-10 bg-gradient-to-b from-transparent to-transparent" />
        )}

        {phase === "ready" && (
          <p className="font-crt text-phosphor-bright absolute bottom-2 left-1/2 z-20 w-max -translate-x-1/2 bg-black/60 px-2 text-lg">
            TAP TO POSITION RETICLE
          </p>
        )}
      </div>

      {/* Readout */}
      <div className="border-phosphor-dark flex flex-1 flex-col justify-between gap-3 border-t-2 p-3 sm:p-4">
        {phase === "idle" && (
          <p className="font-crt text-phosphor-dim text-xl">
            AWAITING SUBJECT... INSERT PHOTO TO BEGIN DIAGNOSTIC.
          </p>
        )}

        {phase === "ready" && (
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={startScan} className={btn}>
              ▶ SCAN SUBJECT
            </button>
            <label className={`${btn} inline-block`}>
              NEW SUBJECT
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFile}
                className="sr-only"
              />
            </label>
          </div>
        )}

        {phase === "scanning" && (
          <div className="font-crt">
            <p className="text-phosphor-dim text-lg">
              ANALYSING KI SIGNATURE... <span aria-hidden>{glyphs}</span>
            </p>
            <p className="text-phosphor-bright glow text-6xl tabular-nums">
              {formatPowerLevel(display)}
            </p>
          </div>
        )}

        {phase === "result" && result && (
          <div className="font-crt">
            <p className="text-phosphor-dim text-lg">POWER LEVEL</p>
            <p className="text-phosphor-bright glow text-6xl tabular-nums sm:text-7xl">
              {formatPowerLevel(result.powerLevel)}
            </p>
            <p className="text-phosphor mt-1 text-xl">
              {flavourLine(result.powerLevel)}
            </p>
            <p className="text-phosphor-dim text-lg">
              CONFIDENCE: {result.confidencePct}% — SUBJECT UNVERIFIED. ADD
              COMBAT DATA TO IMPROVE ACCURACY <span className="text-marquee-yellow">[COMING SOON]</span>
            </p>

            {hallState === "offer" && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-marquee-yellow font-arcade text-[10px]">
                  HALL OF LEGENDS — ENTER INITIALS:
                </span>
                <input
                  value={initials}
                  onChange={(e) =>
                    setInitials(
                      e.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase(),
                    )
                  }
                  maxLength={3}
                  size={3}
                  className="bevel bg-crt-black text-phosphor-bright font-arcade w-16 px-2 py-1 text-center text-sm outline-none"
                  aria-label="Your three initials"
                />
                <button type="button" onClick={saveInitials} className={btn}>
                  OK
                </button>
              </div>
            )}
            {hallState === "saved" && (
              <p className="text-marquee-yellow font-crt mt-2 text-lg">
                ★ RECORDED IN THE HALL OF LEGENDS ★
              </p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              {canShare && (
                <button
                  type="button"
                  onClick={onShare}
                  disabled={busy}
                  className={btn}
                >
                  SHARE CARD
                </button>
              )}
              <button
                type="button"
                onClick={onDownload}
                disabled={busy}
                className={btn}
              >
                DOWNLOAD CARD
              </button>
              <button
                type="button"
                onClick={() => {
                  setPhase("ready");
                  setResult(null);
                  setHallState("hidden");
                }}
                className={btn}
              >
                RE-SCAN
              </button>
              <label className={`${btn} inline-block`}>
                NEW SUBJECT
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFile}
                  className="sr-only"
                />
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
