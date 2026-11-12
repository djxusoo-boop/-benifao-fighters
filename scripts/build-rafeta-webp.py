"""Build Rafeta's runtime WebP frames from the cut atlas PNGs.

The atlas poses overlap their neighbouring cells, so a plain grid cut leaves
pieces of other poses (a head, a flag corner, a spear tip, fingers) stuck to
the cell edges. This keeps the main figure and drops every other island that
touches the frame border. The PNG originals are not modified.

Usage: python3 scripts/build-rafeta-webp.py
"""
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

FRAMES = Path(__file__).resolve().parent.parent / "public/assets/new-fighters/rafeta-frames"
ALPHA_THRESHOLD = 24
TINY_ISLAND = 12


def islands(mask):
    height, width = mask.shape
    labels = np.zeros((height, width), np.int32)
    found = []
    for y0, x0 in zip(*np.nonzero(mask)):
        if labels[y0, x0]:
            continue
        label = len(found) + 1
        labels[y0, x0] = label
        queue = deque([(y0, x0)])
        size, touches_border = 0, False
        while queue:
            y, x = queue.popleft()
            size += 1
            if y in (0, height - 1) or x in (0, width - 1):
                touches_border = True
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < height and 0 <= xx < width and mask[yy, xx] and not labels[yy, xx]:
                        labels[yy, xx] = label
                        queue.append((yy, xx))
        found.append((label, size, touches_border))
    return labels, found


def clean(path):
    pixels = np.array(Image.open(path).convert("RGBA"))
    alpha = pixels[:, :, 3]
    labels, found = islands(alpha > ALPHA_THRESHOLD)
    main = max(found, key=lambda item: item[1])[0]
    keep = np.zeros(alpha.shape, bool)
    removed = 0
    for label, size, touches_border in found:
        if label == main or (not touches_border and size >= TINY_ISLAND):
            keep |= labels == label
        else:
            removed += 1
    # Clear only around the stray islands (including their soft edges) and
    # never inside the figure's own antialiased outline.
    stray_zone = dilate((labels > 0) & ~keep, 2)
    pixels[:, :, 3] = np.where(stray_zone & ~dilate(keep, 1), 0, alpha)
    return Image.fromarray(pixels, "RGBA"), removed


def dilate(mask, steps):
    grown = mask.copy()
    for _ in range(steps):
        step = grown.copy()
        step[1:, :] |= grown[:-1, :]
        step[:-1, :] |= grown[1:, :]
        step[:, 1:] |= grown[:, :-1]
        step[:, :-1] |= grown[:, 1:]
        grown = step
    return grown


def main():
    for png in sorted(FRAMES.glob("*.png")):
        image, removed = clean(png)
        webp = png.with_suffix(".webp")
        if removed == 0 and webp.exists():
            print(f"{png.stem}: limpio, sin cambios")
            continue
        image.save(webp, "WEBP", quality=88, method=6, exact=False)
        print(f"{png.stem}: {removed} trozos ajenos eliminados")


if __name__ == "__main__":
    main()
