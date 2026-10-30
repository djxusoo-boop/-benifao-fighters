"""Separate the four supplied alpha sprites without regenerating any pixels."""
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.ndimage import distance_transform_edt, label


source = Image.open(sys.argv[1]).convert("RGBA")
pixels = np.array(source)
labels, _ = label(pixels[:, :, 3] > 30)
counts = np.bincount(labels.ravel())
ids = sorted(
    np.argsort(counts[1:])[-4:] + 1,
    key=lambda component: np.where(labels == component)[1].mean(),
)

seeds = np.zeros(labels.shape, dtype=np.uint8)
for index, component in enumerate(ids, 1):
    seeds[labels == component] = index

distance, nearest = distance_transform_edt(seeds == 0, return_indices=True)
owners = seeds[tuple(nearest)]
output = Path(sys.argv[2])
output.mkdir(parents=True, exist_ok=True)

for index in range(1, 5):
    frame = pixels.copy()
    frame[:, :, 3] = np.where(
        (owners == index) & (distance <= 5), pixels[:, :, 3], 0
    )
    image = Image.fromarray(frame)
    cutout = image.crop(image.getbbox())
    canvas = Image.new("RGBA", (512, 900))
    canvas.paste(cutout, ((512 - cutout.width) // 2, 880 - cutout.height))
    canvas.save(output / f"crowd-doll-{index}-v1.png")
