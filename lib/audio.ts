/**
 * All sound is synthesised with the Web Audio API — no audio files, no rips
 * (IP guardrail). The context unlocks on the PRESS START gesture; the ON/OFF
 * preference persists in localStorage.
 */

const PREF_KEY = "o9k-sound";

let ctx: AudioContext | null = null;
let enabled = true;

export function initSoundPref(): boolean {
  if (typeof window === "undefined") return true;
  enabled = window.localStorage.getItem(PREF_KEY) !== "off";
  return enabled;
}

export function setSoundEnabled(on: boolean): void {
  enabled = on;
  window.localStorage.setItem(PREF_KEY, on ? "on" : "off");
}

export function isSoundEnabled(): boolean {
  return enabled;
}

/** Must be called from a user gesture (PRESS START) to satisfy autoplay policy. */
export function unlockAudio(): void {
  if (!ctx) {
    ctx = new AudioContext();
  }
  if (ctx.state === "suspended") {
    void ctx.resume();
  }
}

function tone(
  freq: number,
  durationMs: number,
  type: OscillatorType = "square",
  gainPeak = 0.06,
  when = 0,
): void {
  if (!ctx || !enabled) return;
  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(gainPeak, t0 + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durationMs / 1000);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + durationMs / 1000 + 0.02);
}

/** Arcade coin blip — two rising square notes. */
export function coin(): void {
  tone(988, 90, "square", 0.05);
  tone(1319, 220, "square", 0.05, 0.09);
}

/** Single scouter tick; pitch rises with scan progress (0–1). */
export function scanTick(progress: number): void {
  tone(620 + progress * 900, 45, "square", 0.035);
}

/** The reading slams to a stop. */
export function lockOn(): void {
  tone(1760, 140, "square", 0.06);
  tone(880, 320, "square", 0.05, 0.13);
}

/** Warning klaxon for tolerance-limit readings. */
export function warning(): void {
  tone(440, 160, "sawtooth", 0.05);
  tone(415, 160, "sawtooth", 0.05, 0.18);
  tone(440, 160, "sawtooth", 0.05, 0.36);
}

/** Glass-crunch burst for the shatter (filtered noise). */
export function crunch(): void {
  if (!ctx || !enabled) return;
  const t0 = ctx.currentTime;
  const length = Math.floor(ctx.sampleRate * 0.4);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2;
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(6000, t0);
  filter.frequency.exponentialRampToValueAtTime(300, t0 + 0.35);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.16, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.4);
  src.connect(filter).connect(gain).connect(ctx.destination);
  src.start(t0);
}
