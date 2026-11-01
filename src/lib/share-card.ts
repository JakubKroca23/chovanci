import { getCard } from "./cards";

export type ShareCardInput = {
  title: string;
  subtitle: string;
  cardId: string;
  verdict?: string;
  footer?: string;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Nelze načíst obrázek: ${src}`));
    img.src = src;
  });
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const words = text.split(/\s+/);
  let line = "";
  let yy = y;
  let lines = 0;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lineHeight;
      lines += 1;
      if (lines >= maxLines - 1) break;
    } else {
      line = test;
    }
  }
  if (line && lines < maxLines) ctx.fillText(line, x, yy);
}

/** Build a 1080×1920 story-style PNG blob for sharing. */
export async function renderShareCardPng(
  input: ShareCardInput,
): Promise<Blob> {
  const card = getCard(input.cardId);
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas nedostupný");

  const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bg.addColorStop(0, "#1a1410");
  bg.addColorStop(0.45, card.color || "#3d2b1f");
  bg.addColorStop(1, "#0f0c0a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "700 64px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("CHOVANCI", canvas.width / 2, 140);

  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "600 42px system-ui, sans-serif";
  wrapText(ctx, input.title, canvas.width / 2, 220, 920, 52, 3);

  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "400 34px system-ui, sans-serif";
  wrapText(ctx, input.subtitle, canvas.width / 2, 340, 900, 44, 3);

  const img = await loadImage(card.image);
  const cardW = 620;
  const cardH = (img.height / img.width) * cardW;
  const cardX = (canvas.width - cardW) / 2;
  const cardY = 480;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 18;
  ctx.drawImage(img, cardX, cardY, cardW, Math.min(cardH, 900));
  ctx.restore();

  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = "700 40px system-ui, sans-serif";
  ctx.fillText(card.name, canvas.width / 2, cardY + Math.min(cardH, 900) + 70);

  if (input.verdict) {
    ctx.fillStyle = "rgba(255,244,220,0.9)";
    ctx.font = "500 32px system-ui, sans-serif";
    wrapText(
      ctx,
      input.verdict,
      canvas.width / 2,
      cardY + Math.min(cardH, 900) + 140,
      900,
      42,
      4,
    );
  }

  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "500 28px system-ui, sans-serif";
  ctx.fillText(
    input.footer ?? "chovanec.propoj.app",
    canvas.width / 2,
    canvas.height - 80,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("PNG selhal"))),
      "image/png",
    );
  });
}

export async function shareOrDownloadPng(
  blob: Blob,
  filename: string,
  text: string,
): Promise<"shared" | "downloaded" | "copied"> {
  const file = new File([blob], filename, { type: "image/png" });
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    (!navigator.canShare || navigator.canShare({ files: [file] }))
  ) {
    try {
      await navigator.share({ title: "Chovanci", text, files: [file] });
      return "shared";
    } catch {
      // fall through
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);

  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "downloaded";
  }
}
