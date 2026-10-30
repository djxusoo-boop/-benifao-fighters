import { mkdir, readFile, writeFile } from "node:fs/promises";
import { deflateSync, inflateSync } from "node:zlib";

const fighter = process.argv[2] ?? "rafeta";
if (!["rafeta", "tonimassama"].includes(fighter)) throw new Error(`Unsupported atlas fighter: ${fighter}`);
const sourceUrl = fighter === "rafeta"
  ? new URL("../assets/rafeta-action-atlas-v1.png", import.meta.url)
  : fighter === "tonimassama"
    ? new URL("../public/assets/new-fighters/tonimassama-action-atlas-v2.png", import.meta.url)
    : new URL(`../public/assets/new-fighters/${fighter}-atlas.png`, import.meta.url);
const outputUrl = new URL(`../public/assets/new-fighters/${fighter}-frames/`, import.meta.url);
const rafetaNames = [
  ["idle", "walk-a", "walk-b"],
  ["walk-c", "guard", "jump"],
  ["land", "crouch", "crouch-attack"],
  ["punch", "kick", "flag-sweep"],
];
const toniNames = [
  ["idle", "walk-a", "walk-b"],
  ["walk-c", "guard", "jump"],
  ["crouch", "hit", "getup"],
  ["punch", "kick", "pistol"],
];
const names = fighter === "rafeta" ? rafetaNames : toniNames;

const crcTable = Uint32Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

function decodePng(buffer) {
  let offset = 8;
  let width = 0;
  let height = 0;
  const compressed = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (data[8] !== 8 || data[9] !== 6) throw new Error("Rafeta atlas must be 8-bit RGBA");
    }
    if (type === "IDAT") compressed.push(data);
    offset += length + 12;
    if (type === "IEND") break;
  }

  const stride = width * 4;
  const raw = inflateSync(Buffer.concat(compressed));
  const pixels = Buffer.alloc(stride * height);
  let rawOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[rawOffset++];
    const source = raw.subarray(rawOffset, rawOffset + stride);
    rawOffset += stride;
    const rowStart = y * stride;
    for (let x = 0; x < stride; x += 1) {
      const left = x >= 4 ? pixels[rowStart + x - 4] : 0;
      const up = y > 0 ? pixels[rowStart - stride + x] : 0;
      const upLeft = y > 0 && x >= 4 ? pixels[rowStart - stride + x - 4] : 0;
      let predictor = 0;
      if (filter === 1) predictor = left;
      else if (filter === 2) predictor = up;
      else if (filter === 3) predictor = Math.floor((left + up) / 2);
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        predictor = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
      } else if (filter !== 0) throw new Error(`Unsupported PNG filter ${filter}`);
      pixels[rowStart + x] = (source[x] + predictor) & 0xff;
    }
  }
  return { width, height, pixels };
}

function encodePng(width, height, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const stride = width * 4;
  const scanlines = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (stride + 1);
    scanlines[row] = 0;
    pixels.copy(scanlines, row + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(scanlines, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function cleanRedEdgeFringe(pixels, width, height) {
  const output = Buffer.from(pixels);
  const redDominant = (r, g, b) => r > g * 1.32 + 24 && r > b * 1.2 + 18;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const alpha = pixels[index + 3];
      if (alpha === 0 || !redDominant(pixels[index], pixels[index + 1], pixels[index + 2])) continue;

      let touchesTransparentEdge = alpha < 245;
      let hasTrueRedInterior = false;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if ((!dx && !dy) || x + dx < 0 || y + dy < 0 || x + dx >= width || y + dy >= height) continue;
          const neighbor = ((y + dy) * width + x + dx) * 4;
          if (pixels[neighbor + 3] < 245) touchesTransparentEdge = true;
          if (pixels[neighbor + 3] >= 245 && redDominant(pixels[neighbor], pixels[neighbor + 1], pixels[neighbor + 2])) hasTrueRedInterior = true;
        }
      }
      if (!touchesTransparentEdge || hasTrueRedInterior) continue;

      let closest = -1;
      let closestDistance = Infinity;
      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) {
          if ((!dx && !dy) || x + dx < 0 || y + dy < 0 || x + dx >= width || y + dy >= height) continue;
          const distance = dx * dx + dy * dy;
          if (distance > 4) continue;
          const neighbor = ((y + dy) * width + x + dx) * 4;
          if (pixels[neighbor + 3] < 245 || distance > closestDistance) continue;
          if (redDominant(pixels[neighbor], pixels[neighbor + 1], pixels[neighbor + 2])) continue;
          closest = neighbor;
          closestDistance = distance;
        }
      }
      if (closest < 0) continue;
      if (Math.hypot(pixels[index] - pixels[closest], pixels[index + 1] - pixels[closest + 1], pixels[index + 2] - pixels[closest + 2]) < 38) continue;
      output[index] = pixels[closest];
      output[index + 1] = pixels[closest + 1];
      output[index + 2] = pixels[closest + 2];
    }
  }
  return output;
}

const atlas = decodePng(await readFile(sourceUrl));
if (atlas.width !== 1024 || atlas.height !== 1536) throw new Error(`Unexpected atlas size ${atlas.width}x${atlas.height}`);
await mkdir(outputUrl, { recursive: true });
const xStarts = [0, 341, 683];
const widths = [341, 342, 341];
const cellHeight = 384;
const rowStarts = names.map((_, row) => row * cellHeight);
const rowHeights = names.map(() => cellHeight);
let written = 0;

for (let row = 0; row < names.length; row += 1) {
  for (let column = 0; column < names[row].length; column += 1) {
    const width = widths[column];
    const height = cellHeight;
    const xStart = xStarts[column];
    const yStart = rowStarts[row];
    const sourceHeight = rowHeights[row];
    const pixels = Buffer.alloc(width * height * 4);
    for (let y = 0; y < height; y += 1) {
        const sourceY = yStart + Math.min(sourceHeight - 1, y);
      const targetStart = y * width * 4;
      for (let x = 0; x < width; x += 1) {
        const sourceX = xStart + Math.min(width - 1, x);
        atlas.pixels.copy(pixels, targetStart + x * 4, (sourceY * atlas.width + sourceX) * 4, (sourceY * atlas.width + sourceX) * 4 + 4);
      }
    }
    // The v2 atlas already carries alpha; preserve its red costume details.
    const cleaned = fighter === "tonimassama" ? pixels : cleanRedEdgeFringe(pixels, width, height);
    const outputName = `${names[row][column]}.png`;
    await writeFile(new URL(outputName, outputUrl), encodePng(width, height, cleaned));
    written += 1;
  }
}
console.log(`Wrote ${written} transparent ${fighter} fight poses with consistent cell crops.`);
