import { formatPowerLevel } from "@/lib/power";
import { SITE } from "@/lib/site.config";

export interface CardOptions {
  file: File;
  reticle: { xPct: number; yPct: number };
  powerLevel: number;
  confidencePct: number;
  flavour: string;
}

const W = 1200;
const H = 1500; // 4:5 — plays nicely with feeds

function fontFamily(cssVar: string, fallback: string): string {
  const fam = getComputedStyle(document.documentElement)
    .getPropertyValue(cssVar)
    .trim();
  return fam ? `${fam}, ${fallback}` : fallback;
}

/**
 * Composite the share card entirely client-side. The canvas re-encode also
 * strips all EXIF (including GPS) from the photo — deliberate privacy feature.
 */
export async function renderCard(opts: CardOptions): Promise<Blob> {
  await document.fonts.ready;
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

  // Phosphor tint + vignette
  ctx.fillStyle = "rgba(6, 40, 16, 0.32)";
  ctx.fillRect(0, 0, W, H);
  const vignette = ctx.createRadialGradient(
    W / 2,
    H / 2,
    H * 0.3,
    W / 2,
    H / 2,
    H * 0.75,
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  // Scanlines
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  for (let y = 0; y < H; y += 5) {
    ctx.fillRect(0, y, W, 2);
  }

  // Reticle brackets
  const rx = (opts.reticle.xPct / 100) * W;
  const ry = (opts.reticle.yPct / 100) * H;
  const r = 130;
  const arm = 44;
  ctx.strokeStyle = "#35ff6d";
  ctx.lineWidth = 6;
  ctx.shadowColor = "#35ff6d";
  ctx.shadowBlur = 14;
  for (const [sx, sy] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(rx + sx * r, ry + sy * r - sy * arm);
    ctx.lineTo(rx + sx * r, ry + sy * r);
    ctx.lineTo(rx + sx * r - sx * arm, ry + sy * r);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(rx, ry, 7, 0, Math.PI * 2);
  ctx.fillStyle = "#35ff6d";
  ctx.fill();
  ctx.shadowBlur = 0;

  // Readout panel
  const panelY = H - 400;
  ctx.fillStyle = "rgba(3, 12, 6, 0.86)";
  ctx.fillRect(0, panelY, W, 400);
  ctx.strokeStyle = "#1d9a45";
  ctx.lineWidth = 3;
  ctx.strokeRect(30, panelY + 24, W - 60, 400 - 54);

  ctx.fillStyle = "#1d9a45";
  ctx.font = `34px ${crt}`;
  ctx.fillText("POWER LEVEL", 70, panelY + 100);

  ctx.fillStyle = "#9dffb8";
  ctx.shadowColor = "#35ff6d";
  ctx.shadowBlur = 22;
  ctx.font = `150px ${crt}`;
  ctx.fillText(formatPowerLevel(opts.powerLevel), 62, panelY + 232);
  ctx.shadowBlur = 0;

  ctx.fillStyle = "#35ff6d";
  ctx.font = `30px ${crt}`;
  ctx.fillText(opts.flavour, 70, panelY + 290);
  ctx.fillStyle = "#1d9a45";
  ctx.fillText(
    `CONFIDENCE: ${opts.confidencePct}% — SUBJECT UNVERIFIED`,
    70,
    panelY + 330,
  );

  ctx.fillStyle = "#ffe600";
  ctx.font = `20px ${arcade}`;
  ctx.textAlign = "right";
  ctx.fillText(SITE.name, W - 70, panelY + 100);
  ctx.font = `13px ${arcade}`;
  ctx.fillStyle = "#23e0ee";
  ctx.fillText(SITE.domain, W - 70, panelY + 135);
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
