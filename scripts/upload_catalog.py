#!/usr/bin/env python3
"""Upload the DEFY catalog to BehaviorGPT and print its catalog id.

Usage:
    pip install behaviorgpt
    export UNBOXAI_API_KEY=...        # never committed, never printed
    python scripts/upload_catalog.py

Put the printed catalog id into the Worker's UNBOX_CATALOG_ID variable.
Uploading the same file name again refreshes the same catalog, so this is safe to re-run.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

from behaviorgpt import UnboxAIClient, catalog_from_csv

HERE = Path(__file__).resolve().parent
CSV_PATH = HERE / "catalog.csv"
# The parquet file name becomes the catalog name.
PARQUET_PATH = HERE / "defy_catalog.parquet"


def main() -> int:
    api_key = os.environ.get("UNBOXAI_API_KEY", "").strip()
    if not api_key:
        print("Set UNBOXAI_API_KEY first (free key at https://portal.unboxai.com).", file=sys.stderr)
        return 1

    client = UnboxAIClient(api_key=api_key, market="us")
    try:
        parquet = catalog_from_csv(str(CSV_PATH), str(PARQUET_PATH))
        job = client.embed(parquet, wait=True, timeout=1800.0)
    except Exception as err:  # report the reason without ever echoing the key
        message = str(err).replace(api_key, "***")
        print(f"Upload failed: {type(err).__name__}: {message}", file=sys.stderr)
        return 1

    print(f"catalog id: {job.catalog_id}")
    print("Set it as UNBOX_CATALOG_ID in the Worker (worker/wrangler.toml or `wrangler secret`).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
