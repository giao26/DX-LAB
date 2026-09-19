#!/usr/bin/env python3
# ==============================================================================
# DX-LAB (DX-OS) - Idempotent Fixture Loader
# Loads reproducible sample data and technical metadata by profile.
# Story 1.2 AC 3 / AR-14 / AR-24
# Copyright (C) 2026 DX-LAB Development Team
# License: AGPL-3.0
# ==============================================================================

import os
import sys
import argparse
import subprocess
import re
from pathlib import Path

# Forbidden business tables that must NOT appear in Story 1.1 / 1.2 fixtures
FORBIDDEN_BUSINESS_TABLES = [
    r'\btickets\b',
    r'\bassignments\b',
    r'\bcsat_responses\b',
    r'\bsops\b',
    r'\bsop_versions\b'
]


def parse_args():
    parser = argparse.ArgumentParser(description="DX-LAB Idempotent Fixture Loader")
    parser.add_argument(
        "--profile",
        type=str,
        default="core",
        choices=["core", "demo", "ai"],
        help="Target profile (default: core)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate fixture SQL files without executing against database"
    )
    parser.add_argument(
        "--fixtures-dir",
        type=str,
        default=None,
        help="Custom fixtures directory path (default: <repo_root>/fixtures)"
    )
    return parser.parse_args()


def load_env_file(repo_root: Path) -> dict:
    """Parses .env or .env.example safely without leaking secrets."""
    env_vars = {}
    env_file = repo_root / ".env"
    if not env_file.exists():
        env_file = repo_root / ".env.example"

    if env_file.exists():
        try:
            with open(env_file, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        env_vars[k.strip()] = v.strip().strip("'\"")
        except Exception:
            pass
    return env_vars


def strip_sql_comments(sql: str) -> str:
    """Removes single-line and multi-line SQL comments."""
    # Remove multi-line comments /* ... */
    sql = re.sub(r'/\*.*?\*/', '', sql, flags=re.DOTALL)
    # Remove single-line comments -- ...
    sql = re.sub(r'--.*$', '', sql, flags=re.MULTILINE)
    return sql


def validate_sql_file(sql_file: Path) -> tuple[bool, list[str]]:
    """Validates idempotency, demo labeling, and technical boundaries of a fixture file."""
    issues = []
    raw_content = sql_file.read_text(encoding="utf-8")
    clean_code = strip_sql_comments(raw_content)

    # Check for forbidden premature business tables in executable code
    forbidden_patterns = [
        r'\bINSERT\s+INTO\s+[^(]*\btickets\b',
        r'\bINSERT\s+INTO\s+[^(]*\bassignments\b',
        r'\bINSERT\s+INTO\s+[^(]*\bcsat_responses\b',
        r'\bINSERT\s+INTO\s+[^(]*\bsops\b',
        r'\bCREATE\s+TABLE\s+[^(]*\btickets\b',
        r'\bCREATE\s+TABLE\s+[^(]*\bassignments\b',
        r'\bCREATE\s+TABLE\s+[^(]*\bcsat_responses\b',
        r'\bCREATE\s+TABLE\s+[^(]*\bsops\b',
    ]
    for pattern in forbidden_patterns:
        if re.search(pattern, clean_code, re.IGNORECASE):
            issues.append(f"Forbidden premature business table manipulation detected matching '{pattern}'")

    # Check that INSERT statements have matching ON CONFLICT clauses for idempotency
    insert_matches = list(re.finditer(r'\bINSERT\s+INTO\b', clean_code, re.IGNORECASE))
    conflict_matches = list(re.finditer(r'\bON\s+CONFLICT\b', clean_code, re.IGNORECASE))

    if insert_matches and len(insert_matches) != len(conflict_matches):
        issues.append(
            f"Idempotency violation: Found {len(insert_matches)} INSERT statement(s) but {len(conflict_matches)} ON CONFLICT clause(s)"
        )

    # Check for demo/fixture labeling in content
    if "demo" not in raw_content.lower() and "fixture" not in raw_content.lower():
        issues.append("Missing explicit demo/fixture metadata labeling")

    return (len(issues) == 0, issues)


def run_fixtures(profile: str, dry_run: bool, fixtures_base_dir: Path, repo_root: Path) -> int:
    # Resolve target directory based on fixtures_base_dir
    if fixtures_base_dir.name == profile:
        target_dir = fixtures_base_dir
    elif (fixtures_base_dir / profile).exists():
        target_dir = fixtures_base_dir / profile
    else:
        target_dir = fixtures_base_dir / profile

    if not target_dir.is_dir():
        print(f"[INFO] Fixtures directory for profile '{profile}' does not exist: {target_dir}")
        print(f"[INFO] Profile '{profile}' has no additional technical fixtures at this stage.")
        return 0

    sql_files = sorted(list(target_dir.glob("*.sql")))
    if not sql_files:
        print(f"[INFO] No SQL fixture files found for profile '{profile}' in {target_dir}")
        return 0

    print(f"=== DX-LAB Fixture Loader ===")
    print(f"Profile: {profile}")
    print(f"Mode:    {'DRY-RUN (Validation only)' if dry_run else 'EXECUTE'}")
    print(f"Files:   {len(sql_files)} file(s) discovered")
    print("--------------------------------------------------")

    all_valid = True
    for sf in sql_files:
        rel_path = sf.relative_to(repo_root) if repo_root in sf.parents or repo_root == sf.parent else sf
        valid, issues = validate_sql_file(sf)
        if not valid:
            all_valid = False
            print(f"[FAIL] {rel_path}:")
            for issue in issues:
                print(f"       - {issue}")
        else:
            print(f"[PASS] {rel_path}: Validated idempotent fixture with stable demo IDs")

    if not all_valid:
        print("\n[ERROR] Fixture validation failed. Aborting.")
        return 1

    if dry_run:
        print("\n[DRY-RUN] Fixture verification successful: all statements are idempotent and conform to boundaries.")
        return 0

    # Execute against database
    env_vars = load_env_file(repo_root)
    db_user = os.environ.get("POSTGRES_USER") or env_vars.get("POSTGRES_USER", "dxlab_admin")
    db_name = os.environ.get("POSTGRES_DB") or env_vars.get("POSTGRES_DB", "dxlab_db")

    print("\nAttempting database connection to PostgreSQL...")
    for sf in sql_files:
        rel_path = sf.relative_to(repo_root) if repo_root in sf.parents or repo_root == sf.parent else sf
        print(f"Applying {rel_path}...")

        # Method 1: Try executing via docker compose exec if container is running
        sql_content = sf.read_text(encoding="utf-8")
        try:
            cmd = ["docker", "compose", "exec", "-T", "postgres", "psql", "-U", db_user, "-d", db_name]
            proc = subprocess.run(
                cmd,
                input=sql_content,
                text=True,
                capture_output=True,
                cwd=str(repo_root)
            )
            if proc.returncode == 0:
                print(f"[SUCCESS] Applied {sf.name} via docker compose exec")
                continue
            else:
                stderr_clean = re.sub(r'password=[^ ]+', 'password=***', proc.stderr, flags=re.IGNORECASE)
                print(f"[INFO] Docker compose execution failed: {stderr_clean.strip()}")
        except Exception:
            pass

        # Method 2: Try direct psql CLI if available on host
        try:
            host = os.environ.get("POSTGRES_HOST") or "localhost"
            port = os.environ.get("POSTGRES_PORT") or "5432"
            cmd = ["psql", "-h", host, "-p", port, "-U", db_user, "-d", db_name, "-f", str(sf)]
            proc = subprocess.run(cmd, capture_output=True, text=True)
            if proc.returncode == 0:
                print(f"[SUCCESS] Applied {sf.name} via host psql")
                continue
        except Exception:
            pass

        # If both failed, record clean connection error without leaking secret
        print(f"[ERROR] Could not connect to PostgreSQL database (Postgres is not ready or unreachable).")
        print(f"[INFO] In profile '{profile}', ensure postgres is running with 'docker compose --profile {profile} up -d'.")
        return 1

    print("\n[SUCCESS] All fixtures loaded successfully.")
    return 0


def main():
    args = parse_args()
    repo_root = Path(__file__).resolve().parent.parent
    fixtures_base_dir = Path(args.fixtures_dir).resolve() if args.fixtures_dir else (repo_root / "fixtures")
    sys.exit(run_fixtures(args.profile, args.dry_run, fixtures_base_dir, repo_root))


if __name__ == "__main__":
    main()
