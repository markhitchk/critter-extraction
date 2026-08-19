#!/usr/bin/env python3
from pathlib import Path

import cairosvg

ROOT = Path(__file__).resolve().parents[2]
SVG = ROOT / "live" / "assets" / "icon.svg"
RES = ROOT / "android" / "app" / "src" / "main" / "res"

if not SVG.is_file():
    raise SystemExit(f"Missing Critter Extraction icon: {SVG}")

sizes = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

for folder, size in sizes.items():
    target_dir = RES / folder
    target_dir.mkdir(parents=True, exist_ok=True)
    cairosvg.svg2png(
        url=str(SVG),
        write_to=str(target_dir / "ic_launcher.png"),
        output_width=size,
        output_height=size,
    )

splash_dir = RES / "drawable-nodpi"
splash_dir.mkdir(parents=True, exist_ok=True)
cairosvg.svg2png(
    url=str(SVG),
    write_to=str(splash_dir / "critter_logo.png"),
    output_width=512,
    output_height=512,
)

print(f"Generated Android icons directly from {SVG.relative_to(ROOT)}")
