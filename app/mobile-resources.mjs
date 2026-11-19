// iPadOS may identify itself as a touch-capable Mac.
export function isAppleMobile(userAgent, platform, maxTouchPoints) {
  return /iPhone|iPad|iPod/i.test(userAgent) ||
    platform === "MacIntel" && maxTouchPoints > 1;
}

// The browser may evict unreferenced decoded images under memory pressure.
export function retainPreloadImage(images, image, limit) {
  if (images.length < limit) images.push(image);
}

// Large high-density canvases fill the same scene many more times per frame.
// Keep normal-sized viewports crisp and bound the backing store in fullscreen.
export function canvasResolutionScale(width, height, pixelRatio, ratioCap) {
  const maxBackingPixels = 2_400_000;
  return Math.min(pixelRatio, ratioCap, Math.max(1, Math.sqrt(maxBackingPixels / (width * height))));
}
