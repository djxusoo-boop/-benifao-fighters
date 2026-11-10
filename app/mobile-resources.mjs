// iPadOS may identify itself as a touch-capable Mac.
export function isAppleMobile(userAgent, platform, maxTouchPoints) {
  return /iPhone|iPad|iPod/i.test(userAgent) ||
    platform === "MacIntel" && maxTouchPoints > 1;
}

// The browser may evict unreferenced decoded images under memory pressure.
export function retainPreloadImage(images, image, limit) {
  if (images.length < limit) images.push(image);
}
