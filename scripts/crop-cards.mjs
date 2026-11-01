#!/usr/bin/env node
/**
 * Crop the 4×4 Chovanec card sheet into individual JPEGs.
 *
 * Source: assets/chovanci-cards-source.jpg (682×1024)
 * Layout: row-major. Gray gutters are NOT on a uniform 256px grid —
 * horizontal gaps sit near y≈241, 489, 741 and a gray margin fills
 * y≈998–1023. Column gutters sit near x≈170, 341, 511.
 *
 * COL_EDGES / ROW_EDGES below are exclusive pixel boundaries tuned so
 * each crop is one clean card (black rounded border, no neighbor strip).
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const SOURCE = path.join(ROOT, "assets", "chovanci-cards-source.jpg");
const OUT_DIR = path.join(ROOT, "public", "cards");

/** Left edges of each column, plus exclusive right edge of the last column. */
const COL_EDGES = [2, 171, 342, 513, 680];
/** Top edges of each row, plus exclusive bottom edge of the last row. */
const ROW_EDGES = [2, 242, 491, 743, 997];

const IDS = [
  "chovanec",
  "nevychovanec",
  "odchovanec",
  "vychovanec",
  "prechovanec",
  "dochovanec",
  "zhovanec",
  "zchovanec",
  "nachovanec",
  "podchovanec",
  "nadchovanec",
  "zachovanec",
  "prezivanec",
  "spoluochovanec",
  "pracovanec",
  "pochybovanec",
];

async function main() {
  const meta = await sharp(SOURCE).metadata();
  const width = meta.width;
  const height = meta.height;
  if (width !== 682 || height !== 1024) {
    throw new Error(
      `Unexpected source size ${width}×${height}; edges tuned for 682×1024`,
    );
  }

  await mkdir(OUT_DIR, { recursive: true });

  for (let i = 0; i < IDS.length; i++) {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const left = COL_EDGES[col];
    const top = ROW_EDGES[row];
    const extractW = COL_EDGES[col + 1] - left;
    const extractH = ROW_EDGES[row + 1] - top;

    const outPath = path.join(OUT_DIR, `${IDS[i]}.jpg`);
    await sharp(SOURCE)
      .extract({ left, top, width: extractW, height: extractH })
      .jpeg({ quality: 92 })
      .toFile(outPath);

    console.log(
      `${IDS[i]}: ${extractW}×${extractH} @ (${left},${top}) → ${outPath}`,
    );
  }

  console.log(`Cropped ${IDS.length} cards → ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
