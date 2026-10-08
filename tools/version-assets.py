#!/usr/bin/env python3

import argparse
import hashlib
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
ASSET_URL = re.compile(r"/web/([A-Za-z0-9_./-]+)\?v=[a-f0-9]+")


def version_url(match):
    asset = (ROOT / "web" / match[1]).resolve()
    version = hashlib.sha256(asset.read_bytes()).hexdigest()[:16]
    return f"/web/{match[1]}?v={version}"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("sources", type=Path, nargs="+")
    args = parser.parse_args()
    for source in args.sources:
        original = source.read_text(encoding="utf-8")
        updated = ASSET_URL.sub(version_url, original)
        if updated != original:
            source.write_text(updated, encoding="utf-8")
            print(f"updated {source}")


if __name__ == "__main__":
    main()
