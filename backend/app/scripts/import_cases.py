"""
Bulk-import real case data (CSV / Excel) into the database from the command line.

Same engine as the in-app "Import Cases" dialog / POST /api/v1/crimes/import:
flexible column names, station resolution by name/code/id, coordinates from
locality or station, per-row error report. Download the column template from
the app or see `app/services/import_service.py`.

Run (from backend/):
  python -m app.scripts.import_cases --file ../data/my_nagpur_cases.xlsx
"""

from __future__ import annotations

import argparse
from pathlib import Path

from app.core.database import SessionLocal
from app.core.logging import get_logger
from app.services.import_service import import_cases

log = get_logger("import")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--file", required=True, help="path to a .csv or .xlsx file")
    args = ap.parse_args()

    path = Path(args.file)
    if not path.exists():
        raise FileNotFoundError(path)

    db = SessionLocal()
    try:
        result = import_cases(db, path.read_bytes(), path.name)
    finally:
        db.close()
    log.info("Rows: %d  created: %d  skipped: %d  errors: %d",
             result["total_rows"], result["created"], result["skipped"], len(result["errors"]))
    for e in result["errors"][:50]:
        log.warning("  row %s: %s", e["row"], e["error"])


if __name__ == "__main__":
    main()
