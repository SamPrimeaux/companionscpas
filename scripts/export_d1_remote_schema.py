#!/usr/bin/env python3
"""Export a remote Cloudflare D1 database into reusable migration artifacts.

This script is read-only against D1. It shells out to Wrangler for SELECT and
PRAGMA statements, then writes:

  <output>/0000_remote_baseline.sql
  <output>/schema-manifest.json
  <output>/tables/<table>.sql
  <output>/seeds/<table>.sql       (only for explicit --seed-table values)

Example:
  python3 export_d1_remote_schema.py \
    --database companionscpas \
    --cwd /Users/samprimeaux/companionscpas \
    --output db/remote-snapshot \
    --prefix agentsam_ --prefix cms_ \
    --seed-table agentsam_tools \
    --seed-table agentsam_model_catalog \
    --validate

Wrangler authentication must already be configured in the selected cwd.
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import math
import shlex
import sqlite3
import subprocess
import sys
from pathlib import Path
from typing import Any, Iterable


INTERNAL_PREFIXES = ("sqlite_", "_cf_")


class ExportError(RuntimeError):
    pass


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Export a remote D1 schema through Wrangler without mutating D1."
    )
    parser.add_argument(
        "--database",
        required=True,
        help="Wrangler D1 database name, binding, or UUID (for example: companionscpas).",
    )
    parser.add_argument(
        "--cwd",
        type=Path,
        default=Path.cwd(),
        help="Project directory containing wrangler.toml/wrangler.jsonc.",
    )
    parser.add_argument(
        "--config",
        type=Path,
        help="Optional explicit Wrangler config path.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("db/remote-schema-snapshot"),
        help="Output directory, relative to --cwd unless absolute.",
    )
    parser.add_argument(
        "--wrangler",
        default="npx wrangler",
        help="Wrangler command prefix (default: 'npx wrangler').",
    )
    parser.add_argument(
        "--prefix",
        action="append",
        default=[],
        help="Only export objects whose table/name starts with this prefix. Repeatable.",
    )
    parser.add_argument(
        "--exclude-table",
        action="append",
        default=[],
        help="Exclude an exact table name. Repeatable.",
    )
    parser.add_argument(
        "--seed-table",
        action="append",
        default=[],
        help="Explicitly export reusable rows from this table as INSERT statements. Repeatable.",
    )
    parser.add_argument(
        "--max-seed-rows",
        type=int,
        default=1000,
        help="Maximum rows per explicit seed table (default: 1000).",
    )
    parser.add_argument(
        "--validate",
        action="store_true",
        help="Replay the generated baseline into an in-memory SQLite database.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Print each read-only SQL statement as it runs.",
    )
    return parser.parse_args()


def quote_identifier(value: str) -> str:
    return '"' + value.replace('"', '""') + '"'


def sql_literal(value: Any) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float):
        if not math.isfinite(value):
            raise ExportError("Cannot serialize non-finite float in seed data")
        return repr(value)
    if isinstance(value, (dict, list)):
        value = json.dumps(value, separators=(",", ":"), ensure_ascii=False)
    if isinstance(value, bytes):
        return "X'" + value.hex() + "'"
    return "'" + str(value).replace("'", "''") + "'"


def ensure_read_only(sql: str) -> None:
    normalized = " ".join(sql.strip().split()).upper()
    allowed = (
        normalized.startswith("SELECT ")
        or normalized.startswith("PRAGMA TABLE_INFO")
        or normalized.startswith("PRAGMA TABLE_XINFO")
        or normalized.startswith("PRAGMA FOREIGN_KEY_LIST")
        or normalized.startswith("PRAGMA INDEX_LIST")
        or normalized.startswith("PRAGMA INDEX_XINFO")
    )
    if not allowed:
        raise ExportError(f"Refusing non-read-only SQL: {sql}")


def find_result_rows(value: Any) -> list[dict[str, Any]]:
    """Normalize Wrangler's slightly varying --json response envelopes."""
    if isinstance(value, dict):
        results = value.get("results")
        if isinstance(results, list) and all(isinstance(x, dict) for x in results):
            return results
        for key in ("result", "data"):
            if key in value:
                rows = find_result_rows(value[key])
                if rows:
                    return rows
        for child in value.values():
            rows = find_result_rows(child)
            if rows:
                return rows
    elif isinstance(value, list):
        for child in value:
            rows = find_result_rows(child)
            if rows:
                return rows
    return []


class WranglerD1:
    def __init__(self, args: argparse.Namespace):
        self.database = args.database
        self.cwd = args.cwd.expanduser().resolve()
        self.command = shlex.split(args.wrangler)
        self.config = args.config.expanduser().resolve() if args.config else None
        self.verbose = args.verbose

        if not self.cwd.is_dir():
            raise ExportError(f"Project cwd does not exist: {self.cwd}")

    def query(self, sql: str) -> list[dict[str, Any]]:
        ensure_read_only(sql)
        cmd = [
            *self.command,
            "d1",
            "execute",
            self.database,
            "--remote",
            "--json",
            "--command",
            sql,
        ]
        if self.config:
            cmd.extend(["--config", str(self.config)])
        if self.verbose:
            print(f"[read] {sql}", file=sys.stderr)

        proc = subprocess.run(
            cmd,
            cwd=self.cwd,
            text=True,
            capture_output=True,
            check=False,
        )
        if proc.returncode != 0:
            detail = (proc.stderr or proc.stdout).strip()
            raise ExportError(f"Wrangler query failed ({proc.returncode}): {detail}")
        try:
            payload = json.loads(proc.stdout)
        except json.JSONDecodeError as exc:
            raise ExportError(
                "Wrangler did not return JSON. Ensure your Wrangler version supports "
                f"'d1 execute --json'. Output: {proc.stdout[:500]!r}"
            ) from exc
        return find_result_rows(payload)


def selected(name: str, prefixes: list[str], excluded: set[str]) -> bool:
    if name in excluded or name.startswith(INTERNAL_PREFIXES):
        return False
    return not prefixes or any(name.startswith(prefix) for prefix in prefixes)


def fetch_objects(client: WranglerD1, args: argparse.Namespace) -> list[dict[str, Any]]:
    rows = client.query(
        "SELECT type, name, tbl_name, sql "
        "FROM sqlite_master "
        "WHERE type IN ('table','index','trigger','view') AND sql IS NOT NULL "
        "ORDER BY CASE type WHEN 'table' THEN 1 WHEN 'index' THEN 2 "
        "WHEN 'trigger' THEN 3 WHEN 'view' THEN 4 ELSE 9 END, name"
    )
    excluded = set(args.exclude_table)
    table_names = {
        str(row["name"])
        for row in rows
        if row.get("type") == "table"
        and selected(str(row.get("name", "")), args.prefix, excluded)
    }
    output = []
    for row in rows:
        name = str(row.get("name", ""))
        table_name = str(row.get("tbl_name", ""))
        object_type = str(row.get("type", ""))
        if object_type == "table":
            keep = name in table_names
        elif object_type == "view":
            keep = selected(name, args.prefix, excluded)
        else:
            keep = table_name in table_names
        if keep:
            output.append(row)
    return output


def fetch_table_metadata(client: WranglerD1, table: str) -> dict[str, Any]:
    ident = quote_identifier(table)
    columns = client.query(f"PRAGMA table_xinfo({ident})")
    foreign_keys = client.query(f"PRAGMA foreign_key_list({ident})")
    indexes = client.query(f"PRAGMA index_list({ident})")
    index_details = []
    for index in indexes:
        index_name = str(index.get("name", ""))
        if not index_name:
            continue
        index_details.append(
            {
                **index,
                "columns": client.query(
                    f"PRAGMA index_xinfo({quote_identifier(index_name)})"
                ),
            }
        )
    return {
        "columns": columns,
        "foreign_keys": foreign_keys,
        "indexes": index_details,
    }


def terminate_sql(sql: str) -> str:
    stripped = sql.strip().rstrip(";")
    return stripped + ";"


def render_baseline(objects: list[dict[str, Any]], source: str, timestamp: str) -> str:
    lines = [
        "-- Remote D1 schema baseline",
        f"-- Source: {source}",
        f"-- Exported UTC: {timestamp}",
        "-- Generated read-only from sqlite_master; review before applying.",
        "",
        "PRAGMA foreign_keys = OFF;",
        "BEGIN TRANSACTION;",
        "",
    ]
    current_type = None
    for row in objects:
        object_type = str(row["type"])
        if object_type != current_type:
            lines.extend([f"-- {object_type.upper()}S", ""])
            current_type = object_type
        lines.append(terminate_sql(str(row["sql"])))
        lines.append("")
    lines.extend(["COMMIT;", "PRAGMA foreign_keys = ON;", ""])
    return "\n".join(lines)


def export_seed(
    client: WranglerD1,
    table: str,
    columns: list[dict[str, Any]],
    max_rows: int,
) -> tuple[str, int]:
    if max_rows < 1:
        raise ExportError("--max-seed-rows must be at least 1")
    column_names = [str(col["name"]) for col in columns if int(col.get("hidden", 0)) == 0]
    if not column_names:
        raise ExportError(f"No writable columns found for seed table {table}")
    select_cols = ", ".join(quote_identifier(name) for name in column_names)
    rows = client.query(
        f"SELECT {select_cols} FROM {quote_identifier(table)} LIMIT {int(max_rows) + 1}"
    )
    if len(rows) > max_rows:
        raise ExportError(
            f"Seed table {table} exceeds --max-seed-rows={max_rows}; "
            "raise the limit explicitly if this is intentional"
        )
    lines = [
        f"-- Explicit seed export for {table}",
        "-- Review for customer-specific or sensitive values before reuse.",
        "BEGIN TRANSACTION;",
    ]
    col_sql = ", ".join(quote_identifier(name) for name in column_names)
    for row in rows:
        values = ", ".join(sql_literal(row.get(name)) for name in column_names)
        lines.append(
            f"INSERT OR REPLACE INTO {quote_identifier(table)} ({col_sql}) VALUES ({values});"
        )
    lines.extend(["COMMIT;", ""])
    return "\n".join(lines), len(rows)


def write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8", newline="\n")


def validate_baseline(sql: str) -> None:
    conn = sqlite3.connect(":memory:")
    try:
        conn.executescript(sql)
    except sqlite3.Error as exc:
        raise ExportError(f"Generated baseline failed local SQLite validation: {exc}") from exc
    finally:
        conn.close()


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def main() -> int:
    args = parse_args()
    try:
        client = WranglerD1(args)
        output = args.output.expanduser()
        if not output.is_absolute():
            output = client.cwd / output
        output = output.resolve()

        objects = fetch_objects(client, args)
        tables = [str(row["name"]) for row in objects if row["type"] == "table"]
        if not tables:
            raise ExportError("No tables matched the requested filters")

        unknown_seed_tables = sorted(set(args.seed_table) - set(tables))
        if unknown_seed_tables:
            raise ExportError(
                "Seed tables were not selected or do not exist: "
                + ", ".join(unknown_seed_tables)
            )

        metadata: dict[str, Any] = {}
        for index, table in enumerate(tables, start=1):
            print(f"[{index}/{len(tables)}] Inspecting {table}", file=sys.stderr)
            metadata[table] = fetch_table_metadata(client, table)

        timestamp = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()
        baseline = render_baseline(objects, args.database, timestamp)
        if args.validate:
            validate_baseline(baseline)

        baseline_path = output / "0000_remote_baseline.sql"
        write_text(baseline_path, baseline)

        for table in tables:
            table_objects = [
                row
                for row in objects
                if row["type"] == "table" and row["name"] == table
                or row["type"] in ("index", "trigger") and row["tbl_name"] == table
            ]
            table_sql = render_baseline(table_objects, args.database, timestamp)
            write_text(output / "tables" / f"{table}.sql", table_sql)

        seed_counts: dict[str, int] = {}
        for table in args.seed_table:
            seed_sql, count = export_seed(
                client,
                table,
                metadata[table]["columns"],
                args.max_seed_rows,
            )
            write_text(output / "seeds" / f"{table}.sql", seed_sql)
            seed_counts[table] = count

        object_counts: dict[str, int] = {}
        for row in objects:
            object_type = str(row["type"])
            object_counts[object_type] = object_counts.get(object_type, 0) + 1

        manifest = {
            "format_version": 1,
            "source": {
                "database": args.database,
                "remote": True,
                "exported_at_utc": timestamp,
                "project_cwd": str(client.cwd),
            },
            "filters": {
                "prefixes": args.prefix,
                "excluded_tables": args.exclude_table,
            },
            "baseline": {
                "file": baseline_path.name,
                "sha256": sha256_text(baseline),
                "validated_with_sqlite": bool(args.validate),
            },
            "counts": object_counts,
            "tables": metadata,
            "seed_rows": seed_counts,
        }
        manifest_path = output / "schema-manifest.json"
        write_text(manifest_path, json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")

        print(json.dumps({
            "ok": True,
            "output": str(output),
            "baseline": str(baseline_path),
            "manifest": str(manifest_path),
            "tables": len(tables),
            "objects": object_counts,
            "seed_rows": seed_counts,
            "validated": bool(args.validate),
        }, indent=2))
        return 0
    except (ExportError, OSError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
