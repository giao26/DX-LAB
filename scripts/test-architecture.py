#!/usr/bin/env python3
# ==============================================================================
# DX-LAB (DX-OS) - Architecture Conformance Test Suite
# Verifies repository structure, image/dependency pinning, secrets, and contracts.
# Copyright (C) 2026 DX-LAB Development Team
# License: AGPL-3.0
# ==============================================================================

import os
import sys
import re
import json
from pathlib import Path

# Paths to ignore during global scans
IGNORE_DIRS = {
    '.git',
    '.agent',
    '.agents',
    '_bmad',
    '_bmad-output',
    'node_modules',
    'dist',
    '.gemini',
    '__pycache__',
    '.pytest_cache'
}

IGNORE_EXTENSIONS = {
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg',
    '.woff', '.woff2', '.ttf', '.eot',
    '.zip', '.tar', '.gz', '.db', '.sqlite'
}


class ArchitectureChecker:
    def __init__(self, root_dir: Path):
        self.root_dir = root_dir
        self.errors = []
        self.warnings = []
        self.passed_checks = []

    def log_error(self, code: str, message: str, file_path: Path = None, line_num: int = None):
        loc = f" in {file_path.relative_to(self.root_dir)}" if file_path else ""
        if line_num:
            loc += f":{line_num}"
        self.errors.append(f"[{code}] {message}{loc}")

    def log_pass(self, check_name: str):
        self.passed_checks.append(check_name)

    def scan_no_latest_tags(self):
        """Scans compose files, Dockerfiles, and package configurations for latest tag."""
        latest_tag = ":" + "latest"
        latest_pattern = re.compile(rf"{re.escape(latest_tag)}\b", re.IGNORECASE)
        scanned_count = 0
        found_latest = False

        for root, dirs, files in os.walk(self.root_dir):
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
            for file in files:
                ext = os.path.splitext(file)[1].lower()
                if ext in IGNORE_EXTENSIONS:
                    continue

                file_path = Path(root) / file
                rel_path = file_path.relative_to(self.root_dir)

                # Skip this test script itself, markdown docs, and text files
                if file == 'test-architecture.py' or file.endswith('.md') or file.endswith('.txt'):
                    continue

                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        for line_idx, line in enumerate(f, start=1):
                            # Ignore comments
                            stripped = line.strip()
                            if stripped.startswith('#') or stripped.startswith('//'):
                                continue

                            if latest_pattern.search(line):
                                self.log_error(
                                    "FORBIDDEN_LATEST_TAG",
                                    f"Found forbidden tag ':latest': '{stripped}'",
                                    file_path,
                                    line_idx
                                )
                                found_latest = True
                    scanned_count += 1
                except Exception as e:
                    self.warnings.append(f"Could not read {rel_path}: {e}")

        if not found_latest:
            self.log_pass("No forbidden tag ':latest' found in configuration/code files")

    def scan_no_hardcoded_secrets(self):
        """Scans source files for leaked production credentials, API keys, and private keys."""
        private_key_pattern = re.compile(r'-----BEGIN (?:[A-Z0-9_-]+ )?PRIVATE KEY-----')
        api_key_pattern = re.compile(r'\bsk-[a-zA-Z0-9]{24,}\b')
        hardcoded_pass_pattern = re.compile(r'(?:password|secret|token)\s*[:=]\s*["\']([a-zA-Z0-9!@#$%^&*()_+=-]{16,})["\']', re.IGNORECASE)
        found_secret = False

        for root, dirs, files in os.walk(self.root_dir):
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
            for file in files:
                ext = os.path.splitext(file)[1].lower()
                if ext in IGNORE_EXTENSIONS:
                    continue

                file_path = Path(root) / file
                rel_path = file_path.relative_to(self.root_dir)

                # Exclude .env.example or test files with safe demo tokens
                if file == '.env.example' or file.endswith('.example') or file.endswith('.md'):
                    continue

                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        for line_idx, line in enumerate(f, start=1):
                            line_str = line.strip()
                            # Skip comments
                            if line_str.startswith('#') or line_str.startswith('//') or line_str.startswith('*'):
                                continue

                            if private_key_pattern.search(line_str):
                                self.log_error("SECRET_LEAK", "Found embedded private key", file_path, line_idx)
                                found_secret = True

                            if api_key_pattern.search(line_str):
                                self.log_error("SECRET_LEAK", "Found embedded API key pattern", file_path, line_idx)
                                found_secret = True

                            # Check for hardcoded passwords in scripts or source (excluding docker-compose defaults using ${VAR:-default})
                            if hardcoded_pass_pattern.search(line_str) and '${' not in line_str:
                                # Filter out benign matches
                                if not any(safe in line_str for safe in ['example', 'placeholder', 'dummy', 'test', 'localhost', 'root']):
                                    self.log_error("HARDCODED_SECRET", f"Potential hardcoded secret assignment: '{line_str}'", file_path, line_idx)
                                    found_secret = True
                except Exception as e:
                    self.warnings.append(f"Could not read {rel_path}: {e}")

        if not found_secret:
            self.log_pass("No hardcoded secrets or exposed private keys detected")

    def check_node_red_migration(self):
        """Verifies Node-RED assets moved from services/p_process to services/p_automation."""
        p_auto_dir = self.root_dir / 'services' / 'p_automation'
        p_proc_dir = self.root_dir / 'services' / 'p_process'

        if not p_auto_dir.is_dir():
            self.log_error("STRUCTURE_ERROR", "Directory services/p_automation does not exist")
            return

        # Check Node-RED files in services/p_automation
        required_auto_files = ['Dockerfile', 'package.json', 'README.md', 'data/flows.json', 'data/settings.js']
        for rf in required_auto_files:
            target = p_auto_dir / rf
            if not target.exists():
                self.log_error("MISSING_ASSET", f"services/p_automation is missing '{rf}'")
            else:
                if rf.endswith('.json'):
                    try:
                        with open(target, 'r', encoding='utf-8') as f:
                            data = json.load(f)
                            if rf == 'package.json':
                                # Inspect dependency pinning in p_automation
                                for dep_section in ['dependencies', 'devDependencies']:
                                    deps = data.get(dep_section, {})
                                    for dep_name, dep_ver in deps.items():
                                        ver_str = str(dep_ver)
                                        if ver_str.startswith('^') or ver_str.startswith('~') or ver_str.startswith('*') or ver_str == 'latest':
                                            self.log_error("FLOATING_VERSION", f"Dependency {dep_name} in services/p_automation/package.json has unpinned version '{ver_str}'")
                    except json.JSONDecodeError as e:
                        self.log_error("INVALID_JSON", f"Invalid JSON in services/p_automation/{rf}: {e}")

        # Check that old Node-RED files are NOT in services/p_process
        forbidden_proc_files = ['data/flows.json', 'data/settings.js', 'flows.json', 'settings.js']
        for ff in forbidden_proc_files:
            target = p_proc_dir / ff
            if target.exists():
                self.log_error("DIR_POLLUTION", f"Old Node-RED asset still exists in services/p_process/{ff}")

        self.log_pass("Node-RED assets and pinned dependencies in services/p_automation validated")

    def check_p_process_core(self):
        """Verifies Fastify TypeScript hexagonal core in services/p_process."""
        p_proc_dir = self.root_dir / 'services' / 'p_process'
        if not p_proc_dir.is_dir():
            self.log_error("STRUCTURE_ERROR", "Directory services/p_process does not exist")
            return

        # Check required files
        pkg_json_path = p_proc_dir / 'package.json'
        tsconfig_path = p_proc_dir / 'tsconfig.json'
        index_ts_path = p_proc_dir / 'src' / 'index.ts'

        if not pkg_json_path.exists():
            self.log_error("MISSING_FILE", "services/p_process/package.json not found")
        else:
            try:
                with open(pkg_json_path, 'r', encoding='utf-8') as f:
                    pkg = json.load(f)

                # Check required dependencies and pinned versions
                deps = pkg.get('dependencies', {})
                dev_deps = pkg.get('devDependencies', {})

                for dep in ['fastify', 'drizzle-orm', 'pg']:
                    if dep not in deps:
                        self.log_error("MISSING_DEPENDENCY", f"services/p_process package.json missing dependency: {dep}")
                    else:
                        ver = str(deps[dep])
                        if ver.startswith('^') or ver.startswith('~') or ver == 'latest':
                            self.log_error("FLOATING_VERSION", f"Dependency {dep} has floating version '{ver}' in services/p_process")

                if 'typescript' not in dev_deps:
                    self.log_error("MISSING_DEPENDENCY", "services/p_process package.json missing devDependency: typescript")
            except json.JSONDecodeError as e:
                self.log_error("INVALID_JSON", f"services/p_process/package.json is invalid JSON: {e}")

        if not tsconfig_path.exists():
            self.log_error("MISSING_FILE", "services/p_process/tsconfig.json not found")

        if not index_ts_path.exists():
            self.log_error("MISSING_FILE", "services/p_process/src/index.ts not found")

        # Check hexagonal directory structure
        hex_dirs = [
            p_proc_dir / 'src' / 'domain',
            p_proc_dir / 'src' / 'application',
            p_proc_dir / 'src' / 'adapters' / 'http',
            p_proc_dir / 'src' / 'adapters' / 'postgres'
        ]
        for hd in hex_dirs:
            if not hd.is_dir():
                self.log_error("MISSING_DIRECTORY", f"Missing hexagonal directory: {hd.relative_to(self.root_dir)}")

        self.log_pass("Fastify TypeScript hexagonal core structure validated")

    def check_initial_migration(self):
        """Verifies initial technical migration in p_process and 01_init_schema.sql contain only dx_core metadata tables and NO business tables."""
        migrations_dir = self.root_dir / 'services' / 'p_process' / 'src' / 'adapters' / 'postgres' / 'migrations'
        init_schema_file = self.root_dir / 'services' / 'd_data' / 'postgres' / 'init' / '01_init_schema.sql'

        if not migrations_dir.is_dir():
            self.log_error("MISSING_DIRECTORY", "Migrations directory services/p_process/src/adapters/postgres/migrations does not exist")
            return

        sql_files = list(migrations_dir.glob('*.sql'))
        if not sql_files:
            self.log_error("MISSING_MIGRATION", "No SQL migration files found in postgres/migrations")
            return

        # Check services/d_data/postgres/init/01_init_schema.sql parity
        if not init_schema_file.exists():
            self.log_error("MISSING_FILE", "services/d_data/postgres/init/01_init_schema.sql does not exist")
        else:
            sql_files.append(init_schema_file)

        required_tables = ['audit_logs', 'outbox_events', 'idempotency_keys']
        forbidden_table_patterns = [
            r'CREATE\s+TABLE[^(]+(?:\.|\s)tickets\b',
            r'CREATE\s+TABLE[^(]+(?:\.|\s)assignments\b',
            r'CREATE\s+TABLE[^(]+(?:\.|\s)csat_responses\b',
            r'CREATE\s+TABLE[^(]+(?:\.|\s)sops\b',
        ]

        for sf in sql_files:
            with open(sf, 'r', encoding='utf-8') as f:
                content = f.read()

            rel = sf.relative_to(self.root_dir)
            if 'dx_core' not in content:
                self.log_error("MISSING_SCHEMA", f"{rel} missing schema 'dx_core'")

            for rt in required_tables:
                if rt not in content:
                    self.log_error("MISSING_TECHNICAL_TABLE", f"{rel} missing required table: {rt}")

            for ftp in forbidden_table_patterns:
                if re.search(ftp, content, re.IGNORECASE):
                    self.log_error(
                        "PREMATURE_BUSINESS_TABLE",
                        f"{rel} contains forbidden business table matching '{ftp}' (Story 1.1 AC 2 violation)"
                    )

        self.log_pass("Initial technical migration and 01_init_schema.sql parity (dx_core: audit_logs, outbox_events, idempotency_keys) validated")

    def check_contracts(self):
        """Verifies contracts directory, OpenAPI 3.1 YAML spec, and JSON Schemas."""
        contracts_dir = self.root_dir / 'contracts'
        openapi_file = contracts_dir / 'openapi' / 'p-api.yaml'
        events_dir = contracts_dir / 'events'

        if not openapi_file.exists():
            self.log_error("MISSING_CONTRACT", "contracts/openapi/p-api.yaml not found")
        else:
            with open(openapi_file, 'r', encoding='utf-8') as f:
                lines = f.readlines()

            # Validate YAML line syntax and key OpenAPI 3.1 sections
            content = "".join(lines)
            if not re.search(r'^openapi:\s*3\.1\b', content, re.MULTILINE):
                self.log_error("INVALID_OPENAPI", "contracts/openapi/p-api.yaml is not an OpenAPI 3.1 spec (missing 'openapi: 3.1')")

            required_sections = ['info:', 'paths:', 'components:', 'schemas:']
            for sec in required_sections:
                if sec not in content:
                    self.log_error("INVALID_OPENAPI", f"contracts/openapi/p-api.yaml missing required section '{sec}'")

            required_endpoints = ['/health:', '/api/v1/tickets:']
            for ep in required_endpoints:
                if ep not in content:
                    self.log_error("MISSING_ENDPOINT", f"contracts/openapi/p-api.yaml missing required endpoint '{ep}'")

            # Check FR-4 fields in OpenAPI: customerPhone / description
            if 'customerPhone:' not in content:
                self.log_error("MISSING_FIELD", "contracts/openapi/p-api.yaml missing customerPhone field required by FR-4")

            # Basic YAML indentation integrity check
            for idx, line in enumerate(lines, 1):
                if line.strip() and not line.strip().startswith('#'):
                    # Check for tab characters (invalid in YAML)
                    if '\t' in line:
                        self.log_error("INVALID_YAML", f"Tab character found in YAML line {idx}", openapi_file, idx)

        if not events_dir.is_dir():
            self.log_error("MISSING_CONTRACT", "contracts/events directory not found")
        else:
            json_schemas = list(events_dir.glob('*.json'))
            if not json_schemas:
                self.log_error("MISSING_SCHEMA", "No JSON Schema files found in contracts/events")
            else:
                for sf in json_schemas:
                    try:
                        with open(sf, 'r', encoding='utf-8') as f:
                            data = json.load(f)

                        # Structural validation of JSON Schema Draft 2020-12
                        schema_ref = data.get('$schema', '')
                        if 'json-schema.org' not in schema_ref or '2020-12' not in schema_ref:
                            self.log_error("INVALID_SCHEMA", f"{sf.name} missing Draft 2020-12 $schema definition")

                        if data.get('type') != 'object':
                            self.log_error("INVALID_SCHEMA", f"{sf.name} root type must be 'object'")

                        properties = data.get('properties', {})
                        required = data.get('required', [])
                        if not isinstance(properties, dict):
                            self.log_error("INVALID_SCHEMA", f"{sf.name} 'properties' must be an object")
                        if not isinstance(required, list):
                            self.log_error("INVALID_SCHEMA", f"{sf.name} 'required' must be an array")

                        for req_prop in required:
                            if req_prop not in properties:
                                self.log_error("INVALID_SCHEMA", f"{sf.name} required property '{req_prop}' not defined in properties")

                        # Specific check for ticket-created.v1
                        if sf.name == 'ticket-created.v1.schema.json':
                            if 'customer_phone' not in properties:
                                self.log_error("MISSING_FIELD", "ticket-created.v1.schema.json missing customer_phone (FR-4 deduplication)")
                            if 'description' not in properties:
                                self.log_error("MISSING_FIELD", "ticket-created.v1.schema.json missing description")

                    except json.JSONDecodeError as e:
                        self.log_error("INVALID_JSON_SCHEMA", f"Invalid JSON in {sf.name}: {e}")

        self.log_pass("Contracts (OpenAPI 3.1 YAML and JSON Schema Draft 2020-12) validated")

    def check_docker_compose(self):
        """Verifies docker-compose.yml configuration."""
        compose_path = self.root_dir / 'docker-compose.yml'
        if not compose_path.exists():
            self.log_error("MISSING_FILE", "docker-compose.yml not found")
            return

        with open(compose_path, 'r', encoding='utf-8') as f:
            compose_content = f.read()

        if './services/p_automation' not in compose_content:
            self.log_error("INVALID_COMPOSE", "docker-compose.yml: node-red service must point to ./services/p_automation")

        if 'ollama/ollama:0.34.2' not in compose_content:
            self.log_error("INVALID_COMPOSE", "docker-compose.yml: ollama service must use pinned image ollama/ollama:0.34.2")

        self.log_pass("docker-compose.yml service paths and image pins validated")

    def run_all(self) -> int:
        print("==============================================================================")
        print("               DX-LAB ARCHITECTURE CONFORMANCE TEST SUITE                    ")
        print("==============================================================================")

        self.scan_no_latest_tags()
        self.scan_no_hardcoded_secrets()
        self.check_node_red_migration()
        self.check_p_process_core()
        self.check_initial_migration()
        self.check_contracts()
        self.check_docker_compose()

        print("\n--- PASSED CHECKS ---")
        for p in self.passed_checks:
            print(f" [PASS] {p}")

        if self.warnings:
            print("\n--- WARNINGS ---")
            for w in self.warnings:
                print(f" [WARN] {w}")

        if self.errors:
            print("\n--- FAILED CHECKS ---")
            for e in self.errors:
                print(f" [FAIL] {e}")
            print("\n==============================================================================")
            print(f" RESULT: FAILED with {len(self.errors)} error(s)")
            print("==============================================================================")
            return 1
        else:
            print("\n==============================================================================")
            print(" RESULT: ALL ARCHITECTURE CONFORMANCE CHECKS PASSED (EXIT CODE 0)")
            print("==============================================================================")
            return 0


def main():
    repo_root = Path(__file__).resolve().parent.parent
    checker = ArchitectureChecker(repo_root)
    sys.exit(checker.run_all())


if __name__ == '__main__':
    main()
