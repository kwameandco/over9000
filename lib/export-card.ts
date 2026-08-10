import { formatPowerLevel } from "@/lib/power";
import { SITE } from "@/lib/site.config";
import type { LensTheme } from "@/lib/lens";

export interface CardOptions {
  file: File;
  reticle: { xPct: number; yPct: number };
  powerLevel: number;
  confidencePct: number;
  flavour: string;
  lens: LensTheme;
}

const W = 1200;
const H = 1500; // 4:5 — plays nicely with feeds
const GLYPHS = "▚▞▟▙◢◣◤◥△▽◁▷◇◆∴∵≡≠";

function fontFamily(cssVar: string, fallback: string): string {
  const fam = getComputedStyle(document.documentElement)
    .getPropertyValue(cssVar)
    .trim();
  return fam ? `${fam}, ${fallback}` : fallback;
}

function randomGlyphs(n: number): string {
  let s = "";
  for (let i = 0; i < n; i++) {
    s += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
  }
  return s;
}

/**
 * Composite the share card entirely client-side, styled as a through-the-lens
 * scouter view. The canvas re-encode also strips all EXIF (including GPS)
 * from the photo — deliberate privacy feature.
 */
export async function renderCard(opts: CardOptions): Promise<Blob> {
  await document.fonts.ready;
  const { lens } = opts;
  const bitmap = await createImageBitmap(opts.file, {
    imageOrientation: "from-image",
  });

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const crt = fontFamily("--font-vt323", "monospace");
  const arcade = fontFamily("--font-press-start", "monospace");

  // Photo, cover-fit
  const scale = Math.max(W / bitmap.width, H / bitmap.height);
  const dw = bitmap.width * scale;
  const dh = bitmap.height * scale;
  ctx.drawImage(bitmap, (W - dw) / 2, (H - dh) / 2, dw, dh);
  bitmap.close();

  // Through-the-lens tint (hue wash preserving luminance), then vignette
  ctx.globalCompositeOperation = "color";
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = lens.main;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;

  const vignette = ctx.createRadialGradient(
    W / 2,
    H / 2,
    H * 0.3,
    W / 2,
    H / 2,
    H * 0.78,
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.6)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  // Scanlines
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  for (let y = 0; y < H; y += 5) {
    ctx.fillRect(0, y, W, 2);
  }

  // HUD text blocks (black glow keeps them legible on bright photos)
  ctx.shadowColor = "rgba(0,0,0,0.95)";
  ctx.shadowBlur = 10;
  ctx.fillStyle = lens.bright;
  ctx.font = `36px ${crt}`;
  ctx.fillText("MODE: BATTLE POWER", 46, 70);
  ctx.fillStyle = lens.main;
  ctx.fillText("TRGT 01 · LOCK CONFIRMED", 46, 108);
  ctx.fillStyle = lens.dim;
  ctx.fillText(`LENS: ${lens.label} · SCOUTER OS v9.2`, 46, 146);
  ctx.shadowBlur = 0;

  // Glyph data column
  ctx.font = `30px ${crt}`;
  for (let i = 0; i < 3; i++) {
    const by = 200 + i * 92;
    ctx.strokeStyle = lens.dim;
    ctx.lineWidth = 2;
    ctx.strokeRect(46, by, 150, 66);
    ctx.fillStyle = lens.main;
    ctx.fillText(randomGlyphs(5), 58, by + 32);
    ctx.fillStyle = lens.dim;
    for (let b = 0; b < 8; b++) {
      ctx.globalAlpha = b < 3 + ((i * 3) % 5) ? 1 : 0.3;
      ctx.fillRect(58 + b * 16, by + 44, 10, 8);
    }
    ctx.globalAlpha = 1;
  }

  // Edge ruler ticks
  ctx.fillStyle = lens.main;
  for (let x = W / 2 - 180; x <= W / 2 + 180; x += 22) {
    ctx.fillRect(x, 0, 4, 22);
    ctx.fillRect(x, H - 22, 4, 22);
  }

  // Reticle: DBZ diamond + ticks
  const rx = (opts.reticle.xPct / 100) * W;
  const ry = (opts.reticle.yPct / 100) * H;
  const r = 120;
  ctx.strokeStyle = lens.main;
  ctx.lineWidth = 6;
  ctx.shadowColor = lens.main;
  ctx.shadowBlur = 16;
  ctx.save();
  ctx.translate(rx, ry);
  ctx.rotate(Math.PI / 4);
  ctx.strokeRect(-r / 1.55, -r / 1.55, (2 * r) / 1.55, (2 * r) / 1.55);
  ctx.restore();
  for (const [dx, dy] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(rx + dx * r, ry + dy * r);
    ctx.lineTo(rx + dx * (r + 34), ry + dy * (r + 34));
    ctx.stroke();
  }
  ctx.fillStyle = lens.bright;
  ctx.beginPath();
  ctx.arc(rx, ry, 8, 0, Math.PI * 2);
  ctx.fill();

  // Floating readout beside the reticle
  const onLeft = opts.reticle.xPct > 62;
  ctx.font = `140px ${crt}`;
  const numText = formatPowerLevel(opts.powerLevel);
  const numW = ctx.measureText(numText).width;
  const nx = onLeft ? rx - r - 60 - numW : rx + r + 60;
  const ny = Math.min(Math.max(ry, 220), H - 480);
  ctx.fillStyle = lens.dim;
  ctx.font = `34px ${crt}`;
  ctx.fillText("PWR", nx, ny - 90);
  ctx.fillStyle = lens.bright;
  ctx.shadowBlur = 26;
  ctx.font = `140px ${crt}`;
  ctx.fillText(numText, nx, ny + 30);
  ctx.shadowBlur = 0;

  // Readout panel
  const panelY = H - 330;
  ctx.fillStyle = "rgba(2, 8, 4, 0.88)";
  ctx.fillRect(0, panelY, W, 330);
  ctx.strokeStyle = lens.dim;
  ctx.lineWidth = 3;
  ctx.strokeRect(30, panelY + 24, W - 60, 330 - 54);

  ctx.fillStyle = lens.dim;
  ctx.font = `34px ${crt}`;
  ctx.fillText("POWER LEVEL", 70, panelY + 92);
  ctx.fillStyle = lens.bright;
  ctx.shadowColor = lens.main;
  ctx.shadowBlur = 20;
  ctx.font = `120px ${crt}`;
  ctx.fillText(formatPowerLevel(opts.powerLevel), 62, panelY + 196);
  ctx.shadowBlur = 0;

  ctx.fillStyle = lens.main;
  ctx.font = `30px ${crt}`;
  ctx.fillText(opts.flavour, 70, panelY + 246);
  ctx.fillStyle = lens.dim;
  ctx.fillText(
    `CONFIDENCE: ${opts.confidencePct}% — SUBJECT UNVERIFIED`,
    70,
    panelY + 284,
  );

  ctx.fillStyle = "#ffe600";
  ctx.font = `20px ${arcade}`;
  ctx.textAlign = "right";
  ctx.fillText(SITE.name, W - 70, panelY + 92);
  ctx.font = `13px ${arcade}`;
  ctx.fillStyle = "#23e0ee";
  ctx.fillText(SITE.domain, W - 70, panelY + 126);
  ctx.textAlign = "left";

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("export failed"))),
      "image/jpeg",
      0.92,
    );
  });
}

/** Web Share (files) first — that's how the card reaches Photos/WhatsApp on mobile. */
export async function shareCard(blob: Blob): Promise<"shared" | "unsupported"> {
  const file = new File([blob], "power-level.jpg", { type: "image/jpeg" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: SITE.name });
      return "shared";
    } catch {
      // user cancelled — treat as handled
      return "shared";
    }
  }
  return "unsupported";
}

export function downloadCard(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "power-level.jpg";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
