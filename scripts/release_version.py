#!/usr/bin/env python3
"""Generate/check release metadata. Edit version.json, then run this script."""
import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGETS = ("index.html", "main.js", "sw.js", "manifest.webmanifest", "style.css", "README.md")


def rendered(source, version):
    parts = version.split(".")
    token = "".join(parts[:3]) + "-" + parts[3]
    source = re.sub(r"(?<![0-9])\d{4}\.\d{2}\.\d{2}\.\d+\b", version, source)
    return re.sub(r"\b\d{8}-\d+\b", token, source)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    version = json.loads((ROOT / "version.json").read_text())["version"]
    if not re.fullmatch(r"\d{4}\.\d{2}\.\d{2}\.\d+", version):
        raise SystemExit("version must use YYYY.MM.DD.release format")
    stale = []
    for name in TARGETS:
        path = ROOT / name
        source = path.read_text()
        expected = rendered(source, version)
        if source != expected:
            stale.append(name)
            if not args.check:
                path.write_text(expected)
    if args.check and stale:
        raise SystemExit("Release metadata is stale: " + ", ".join(stale) + "; run python scripts/release_version.py")
    print("Release metadata consistent: " + version)


if __name__ == "__main__":
    main()
