// Shared list of fighter frames that are fully downloaded and decoded.
// The preloader fills it; the visibility guard trusts it.
export const loadedFrames = new Set<string>();

export const markFrameLoaded = (image: HTMLImageElement) => {
  if (image.naturalWidth > 0) loadedFrames.add(image.src);
};
