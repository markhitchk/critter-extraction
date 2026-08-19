#!/usr/bin/env python3
"""Convert Critter Extraction repo SVG art to native PNG textures and launcher icons.
The native game never executes the browser HTML/JS runtime.
"""
from __future__ import annotations
import shutil, sys
from pathlib import Path
import cairosvg

if len(sys.argv) != 4:
    raise SystemExit("usage: prepare_assets.py <live/assets> <native/assets> <android/res>")

src = Path(sys.argv[1]).resolve()
out = Path(sys.argv[2]).resolve()
res = Path(sys.argv[3]).resolve()
if not src.is_dir():
    raise SystemExit(f"source assets not found: {src}")

if out.exists(): shutil.rmtree(out)
out.mkdir(parents=True)

for p in src.rglob('*'):
    if not p.is_file():
        continue
    rel = p.relative_to(src)
    ext = p.suffix.lower()
    if ext == '.svg':
        dest = (out / rel).with_suffix('.png')
        dest.parent.mkdir(parents=True, exist_ok=True)
        cairosvg.svg2png(url=str(p), write_to=str(dest), output_width=512, output_height=512)
    elif ext in {'.png', '.webp', '.jpg', '.jpeg', '.txt'}:
        dest = out / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(p, dest)

icon_svg = src / 'icon.svg'
(out / 'source').mkdir(exist_ok=True)
shutil.copy2(icon_svg, out / 'source' / 'icon.svg')

sizes = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192,
}
for folder, size in sizes.items():
    d = res / folder
    d.mkdir(parents=True, exist_ok=True)
    cairosvg.svg2png(url=str(icon_svg), write_to=str(d / 'ic_launcher.png'), output_width=size, output_height=size)

print(f"Prepared {sum(1 for p in out.rglob('*') if p.is_file())} native runtime assets")
