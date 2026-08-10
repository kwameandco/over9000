"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
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
import { LENSES, loadLens, saveLens, type LensId } from "@/lib/lens";

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

/** One ticking data block in the lens HUD's left column. */
function GlyphBlock({ tick, bars }: { tick: number; bars: number }) {
  // tick drives re-randomisation; content is decorative
  void tick;
  return (
    <div className="border border-(--lens-dim) bg-black/45 px-1.5 py-1">
      <p className="font-crt text-(--lens) text-sm leading-none">
        {randomGlyphs(5)}
      </p>
      <div className="mt-1 flex gap-0.5" aria-hidden>
        {Array.from({ length: 8 }, (_, i) => (
          <span
            key={i}
            className={`h-1 w-1.5 ${i < bars ? "bg-(--lens)" : "bg-(--lens-dim)/40"}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function Scanner() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [seed, setSeed] = useState(0);
  const [reticle, setReticle] = useState({ xPct: 50, yPct: 38 });
  const [display, setDisplay] = useState(0);
  const [hudTick, setHudTick] = useState(0);
  const [lensId, setLensId] = useState<LensId>("green");
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
  const lens = LENSES[lensId];

  useEffect(() => {
    setLensId(loadLens());
    setCanShare(
      typeof navigator !== "undefined" && typeof navigator.share === "function",
    );
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // HUD data blocks tick over while a subject is loaded (frozen on result).
  useEffect(() => {
    if (phase !== "ready" && phase !== "scanning") return;
    const id = window.setInterval(
      () => setHudTick((t) => t + 1),
      phase === "scanning" ? 160 : 700,
    );
    return () => window.clearInterval(id);
  }, [phase]);

  const pickLens = (id: LensId) => {
    setLensId(id);
    saveLens(id);
    coin();
  };

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

    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / SCAN_MS);
      const eased = 1 - (1 - p) ** 3;
      const jitter = (1 - p) * target.powerLevel * 0.35 * Math.random();
      setDisplay(Math.max(0, Math.round(target.powerLevel * eased + jitter)));
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
      lens,
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

  const lensVars = {
    "--lens": lens.main,
    "--lens-bright": lens.bright,
    "--lens-dim": lens.dim,
  } as CSSProperties;

  const statusLine =
    phase === "scanning"
      ? "MEASURING…"
      : phase === "result"
        ? "LOCK CONFIRMED"
        : phase === "ready"
          ? "AWAITING SCAN"
          : "NO SUBJECT";

  // Keep the floating readout inside the frame: flip side near the right edge.
  const numberOnLeft = reticle.xPct > 62;

  return (
    <div className="flex min-h-[480px] flex-col sm:min-h-[560px]" style={lensVars}>
      {/* ——— The lens ——— */}
      <div
        onClick={placeReticle}
        className={`relative h-[340px] overflow-hidden sm:h-[420px] ${
          phase === "ready" ? "cursor-crosshair" : ""
        }`}
      >
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt="Scan subject"
            className="h-full w-full object-cover"
          />
        ) : (
          <label className="font-crt flex h-full w-full cursor-pointer flex-col items-center justify-center gap-3 text-2xl">
            <span className="bevel bg-bezel font-arcade text-phosphor px-4 py-3 text-xs">
              INSERT SUBJECT
            </span>
            <span className="text-(--lens-dim) text-lg">
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

        {/* Through-the-lens tint: hue wash + glass sheen */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 mix-blend-color"
          style={{ backgroundColor: lens.main, opacity: 0.5 }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            background: `radial-gradient(ellipse 120% 90% at 22% 12%, rgba(255,255,255,0.10), transparent 45%), radial-gradient(ellipse at center, transparent 55%, ${lens.dim}33 88%, ${lens.dim}66 100%)`,
          }}
        />

        {photoUrl && (
          <>
            {/* HUD: status block (top-left) */}
            <div
              className="font-crt absolute top-2 left-2 z-20 text-sm leading-tight text-(--lens) sm:text-base"
              style={{ textShadow: "0 0 4px #000, 0 0 8px #000, 0 1px 2px #000" }}
            >
              <p className="text-(--lens-bright)">MODE: BATTLE POWER</p>
              <p>TRGT 01 · {statusLine}</p>
              <p className="text-(--lens-dim)">
                LENS: {lens.label} · SCOUTER OS v9.2
              </p>
            </div>

            {/* HUD: glyph data column (left) */}
            <div className="absolute top-16 left-2 z-20 hidden w-20 flex-col gap-1.5 sm:flex">
              <GlyphBlock tick={hudTick} bars={(hudTick % 8) + 1} />
              <GlyphBlock tick={hudTick + 1} bars={((hudTick + 3) % 8) + 1} />
              <GlyphBlock tick={hudTick + 2} bars={((hudTick + 6) % 8) + 1} />
            </div>

            {/* HUD: edge ruler ticks */}
            <div
              aria-hidden
              className="absolute top-0 left-1/2 z-20 h-2.5 w-40 -translate-x-1/2"
              style={{
                background: `repeating-linear-gradient(to right, ${lens.main} 0 2px, transparent 2px 10px)`,
                opacity: 0.7,
              }}
            />
            <div
              aria-hidden
              className="absolute bottom-0 left-1/2 z-20 h-2.5 w-40 -translate-x-1/2"
              style={{
                background: `repeating-linear-gradient(to right, ${lens.main} 0 2px, transparent 2px 10px)`,
                opacity: 0.7,
              }}
            />

            {/* HUD: ID block (bottom-right) */}
            <div
              className="font-crt absolute right-2 bottom-2 z-20 text-right text-sm leading-tight text-(--lens-dim) sm:text-base"
              style={{ textShadow: "0 0 4px #000, 0 0 8px #000, 0 1px 2px #000" }}
            >
              <p>SUBJECT ID: {seed.toString(16).slice(0, 6).toUpperCase()}</p>
              <p>
                CAL:{" "}
                {phase === "result" && result
                  ? `${result.confidencePct}% CONF`
                  : "DEFAULT"}
              </p>
            </div>

            {/* Reticle: DBZ diamond + ticks */}
            <div
              className="pointer-events-none absolute z-20 h-24 w-24 -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${reticle.xPct}%`,
                top: `${reticle.yPct}%`,
                filter: `drop-shadow(0 0 6px ${lens.main})`,
              }}
            >
              <span
                className={`absolute inset-3 border-2 border-(--lens) ${
                  phase === "result" ? "rotate-45" : "animate-diamond"
                }`}
              />
              <span className="absolute top-1/2 left-0 h-0.5 w-3 -translate-y-1/2 bg-(--lens)" />
              <span className="absolute top-1/2 right-0 h-0.5 w-3 -translate-y-1/2 bg-(--lens)" />
              <span className="absolute top-0 left-1/2 h-3 w-0.5 -translate-x-1/2 bg-(--lens)" />
              <span className="absolute bottom-0 left-1/2 h-3 w-0.5 -translate-x-1/2 bg-(--lens)" />
              <span className="absolute top-1/2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-(--lens-bright)" />
            </div>

            {/* Floating readout beside the reticle (the anime beat) */}
            {(phase === "scanning" || phase === "result") && (
              <div
                className="font-crt pointer-events-none absolute z-30 leading-none"
                style={{
                  left: `${Math.min(Math.max(reticle.xPct, 8), 92)}%`,
                  top: `${Math.min(Math.max(reticle.yPct, 12), 84)}%`,
                  transform: numberOnLeft
                    ? "translate(calc(-100% - 64px), -50%)"
                    : "translate(64px, -50%)",
                  textShadow: `0 0 8px ${lens.main}, 0 0 22px ${lens.main}80`,
                }}
              >
                <p className="text-lg text-(--lens-dim)">PWR</p>
                <p className="text-5xl text-(--lens-bright) tabular-nums sm:text-6xl">
                  {formatPowerLevel(display)}
                </p>
              </div>
            )}

            {phase === "ready" && (
              <p className="font-crt absolute bottom-2 left-1/2 z-20 w-max -translate-x-1/2 bg-black/60 px-2 text-lg text-(--lens-bright)">
                TAP TO POSITION RETICLE
              </p>
            )}
          </>
        )}
      </div>

      {/* ——— Device panel below the lens ——— */}
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
          <p className="font-crt text-phosphor-dim text-xl">
            ANALYSING KI SIGNATURE...
          </p>
        )}

        {phase === "result" && result && (
          <div className="font-crt">
            <p className="text-phosphor text-xl">
              {flavourLine(result.powerLevel)}
            </p>
            <p className="text-phosphor-dim text-lg">
              CONFIDENCE: {result.confidencePct}% — SUBJECT UNVERIFIED. ADD
              COMBAT DATA TO IMPROVE ACCURACY{" "}
              <span className="text-marquee-yellow">[COMING SOON]</span>
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

        {/* Lens picker — always available */}
        <div className="flex items-center gap-2">
          <span className="font-crt text-phosphor-dim text-lg">LENS:</span>
          {Object.values(LENSES).map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => pickLens(l.id)}
              aria-pressed={l.id === lensId}
              aria-label={`${l.label} lens`}
              className={`bevel h-6 w-6 cursor-pointer ${
                l.id === lensId ? "ring-2 ring-white/70" : "opacity-70"
              }`}
              style={{ backgroundColor: l.main }}
            />
          ))}
          <span className="font-crt text-phosphor-dim ml-1 hidden text-lg sm:inline">
            {lens.label}
          </span>
        </div>
      </div>
    </div>
  );
}
