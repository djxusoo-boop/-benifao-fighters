import { readFile, writeFile } from "node:fs/promises";
import { deflateSync, inflateSync } from "node:zlib";
import { join } from "node:path";

const assetDir = new URL("../public/assets/new-fighters/", import.meta.url);
const fighters = {
  borja: {
    punch: ["borja-punch-1.png", "borja-punch-2.png", "borja-punch-extension.png", "borja-punch-2.png", "borja-punch-1.png"],
    kick: ["borja-kick-1.png", "borja-kick-2.png", "borja-kick-3.png", "borja-kick-4.png", "borja-kick-1.png"],
  },
  bacora: {
    punch: ["bacora-punch-1.png", "bacora-punch-2.png", "bacora-punch-contact-v2.png", "bacora-punch-2.png", "bacora-punch-1.png"],
    kick: ["bacora-kick-1.png", "bacora-kick-2.png", "bacora-kick-3.png", "bacora-kick-4.png", "bacora-kick-1.png"],
  },
  bonviure: {
    punch: ["bonviure-punch-1.png", "bonviure-punch-2.png", "bonviure-punch-3.png", "bonviure-punch-4.png", "bonviure-punch-1.png"],
    kick: ["bonviure-kick-1.png", "bonviure-kick-2.png", "bonviure-kick-3.png", "bonviure-kick-2.png", "bonviure-kick-1.png"],
  },
  elchica: {
    punch: ["elchica-punch-1.png", "elchica-punch-2.png", "elchica-punch-3.png", "elchica-punch-4.png", "elchica-punch-1.png"],
    kick: ["elchica-kick-1.png", "elchica-kick-2.png", "elchica-kick-3.png", "elchica-kick-4.png", "elchica-kick-1.png"],
  },
  ogalla: {
    punch: ["ogalla-punch-1.png", "ogalla-punch-2.png", "ogalla-punch-3.png", "ogalla-punch-4.png", "ogalla-punch-1.png"],
    kick: ["ogalla-kick-1.png", "ogalla-kick-2.png", "ogalla-kick-3.png", "ogalla-kick-4.png", "ogalla-kick-1.png"],
  },
};

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

function decodeRgbaPng(buffer, filename) {
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const compressed = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    }
    if (type === "IDAT") compressed.push(data);
    offset += length + 12;
    if (type === "IEND") break;
  }
  if (bitDepth !== 8 || colorType !== 6) throw new Error(`${filename} must be 8-bit RGBA PNG`);

  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const raw = inflateSync(Buffer.concat(compressed));
  const pixels = Buffer.alloc(stride * height);
  let rawOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[rawOffset++];
    const source = raw.subarray(rawOffset, rawOffset + stride);
    rawOffset += stride;
    const rowStart = y * stride;
    for (let x = 0; x < stride; x += 1) {
      const left = x >= bytesPerPixel ? pixels[rowStart + x - bytesPerPixel] : 0;
      const up = y > 0 ? pixels[rowStart - stride + x] : 0;
      const upLeft = y > 0 && x >= bytesPerPixel ? pixels[rowStart - stride + x - bytesPerPixel] : 0;
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
      } else if (filter !== 0) throw new Error(`${filename} uses unsupported PNG filter ${filter}`);
      pixels[rowStart + x] = (source[x] + predictor) & 0xff;
    }
  }
  return { width, height, pixels };
}

function encodeRgbaPng(width, height, pixels) {
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

function fitToCanvas(frame, targetWidth, targetHeight) {
  if (frame.width === targetWidth && frame.height === targetHeight) return frame.pixels;
  const scale = Math.min(targetWidth / frame.width, targetHeight / frame.height);
  const scaledWidth = Math.max(1, Math.round(frame.width * scale));
  const scaledHeight = Math.max(1, Math.round(frame.height * scale));
  const offsetX = Math.floor((targetWidth - scaledWidth) / 2);
  const offsetY = targetHeight - scaledHeight;
  const output = Buffer.alloc(targetWidth * targetHeight * 4);
  for (let y = 0; y < scaledHeight; y += 1) {
    const sourceY = Math.min(frame.height - 1, Math.floor(y / scale));
    for (let x = 0; x < scaledWidth; x += 1) {
      const sourceX = Math.min(frame.width - 1, Math.floor(x / scale));
      const sourceIndex = (sourceY * frame.width + sourceX) * 4;
      const targetIndex = ((offsetY + y) * targetWidth + offsetX + x) * 4;
      frame.pixels.copy(output, targetIndex, sourceIndex, sourceIndex + 4);
    }
  }
  return output;
}

function cleanRedEdgeFringe(frame) {
  const { width, height, pixels } = frame;
  const cleaned = Buffer.from(pixels);
  const redDominant = (r, g, b) => r > g * 1.32 + 24 && r > b * 1.2 + 18;
  let corrected = 0;

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

      const colorDistance = Math.hypot(
        pixels[index] - pixels[closest],
        pixels[index + 1] - pixels[closest + 1],
        pixels[index + 2] - pixels[closest + 2],
      );
      if (colorDistance < 38) continue;
      cleaned[index] = pixels[closest];
      cleaned[index + 1] = pixels[closest + 1];
      cleaned[index + 2] = pixels[closest + 2];
      corrected += 1;
    }
  }
  return { ...frame, pixels: cleaned, corrected };
}

async function makeStrip(name, frames) {
  const decoded = await Promise.all(frames.map(async (filename) => cleanRedEdgeFringe(decodeRgbaPng(await readFile(new URL(filename, assetDir)), filename))));
  const corrected = decoded.reduce((total, frame) => total + frame.corrected, 0);
  const { width, height } = decoded[0];
  const fitted = decoded.map((frame) => fitToCanvas(frame, width, height));
  const targetFootY = height - 16;
  const normalized = fitted.map((pixels) => {
    let bottom = -1;
    for (let y = height - 1; y >= 0 && bottom < 0; y -= 1) {
      for (let x = 0; x < width; x += 1) {
        if (pixels[(y * width + x) * 4 + 3] > 20) { bottom = y; break; }
      }
    }
    const shift = Math.max(0, targetFootY - bottom);
    const aligned = Buffer.alloc(pixels.length);
    for (let y = 0; y + shift < height; y += 1) {
      pixels.copy(aligned, (y + shift) * width * 4, y * width * 4, (y + 1) * width * 4);
    }
    return aligned;
  });
  const stripWidth = width * normalized.length;
  const stripPixels = Buffer.alloc(stripWidth * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let index = 0; index < normalized.length; index += 1) {
      normalized[index].copy(stripPixels, (y * stripWidth + index * width) * 4, y * width * 4, (y + 1) * width * 4);
    }
  }
  const output = `${name}-strip-v21836.png`;
  await writeFile(new URL(output, assetDir), encodeRgbaPng(stripWidth, height, stripPixels));
  console.log(`${output}: ${stripWidth}x${height}, ${frames.length} aligned frames, ${corrected} edge pixels cleaned`);
}

for (const [fighter, actions] of Object.entries(fighters)) {
  for (const [action, frames] of Object.entries(actions)) await makeStrip(join(fighter, action).replace("/", "-"), frames);
}
