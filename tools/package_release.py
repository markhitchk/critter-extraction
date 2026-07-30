#!/usr/bin/env python3
"""Create the clean v0.26.7 source ZIP and SHA256SUMS.txt."""
from pathlib import Path
import hashlib, subprocess, zipfile

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT.parent
NAME = 'Critter-Extraction-v0.26.7'
ZIP = OUT / f'{NAME}-Source-Code.zip'
subprocess.run([str(ROOT / 'tools' / 'build_portable.py')], check=True)
if ZIP.exists(): ZIP.unlink()
excluded_names = {'.git', '__pycache__', '.DS_Store', 'Thumbs.db', 'SHA256SUMS.txt'}
excluded_suffixes = {'.zip', '.bak', '.tmp', '.pyc'}
with zipfile.ZipFile(ZIP, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for path in sorted(ROOT.rglob('*')):
        rel = path.relative_to(ROOT)
        if any(part in excluded_names for part in rel.parts) or path.suffix.lower() in excluded_suffixes:
            continue
        if path.is_file(): z.write(path, (Path(NAME) / rel).as_posix())
digest = hashlib.sha256(ZIP.read_bytes()).hexdigest()
sha = OUT / 'SHA256SUMS.txt'
sha.write_text(f'{digest}  {ZIP.name}\n', encoding='utf-8')
print(ZIP)
print(sha)
