#!/usr/bin/env python3
"""Check every application and tooling JavaScript file; propagate any failure."""
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def check(root=ROOT):
    files = [root / "main.js", root / "sw.js"]
    files += sorted((root / "js").rglob("*.js"))
    files += sorted((root / "scripts").rglob("*.js"))
    for path in files:
        subprocess.run(["node", "--check", str(path)], check=True)


if __name__ == "__main__":
    check()
