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
import subprocess
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
    '.pytest_cache',
    '.uv-cache',
    '.venv'
}

IGNORE_EXTENSIONS = {
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg',
    '.woff', '.woff2', '.ttf', '.eot',
    '.zip', '.tar', '.gz', '.db', '.sqlite'
}

API_KEY_PATTERNS = (
    re.compile(r'\bsk-[A-Za-z0-9]{24,}\b'),
    re.compile(r'\bsk-or-v1-[A-Za-z0-9_-]{16,}\b'),
)
SAFE_API_KEY_MARKERS = ('test', 'placeholder', 'dummy', 'example')


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

                # Exclude git-ignored local environment files (.env, .env.local), .env.example, or documentation
                if file in ('.env', '.env.local') or file == '.env.example' or file.endswith('.example') or file.endswith('.md'):
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

                            for api_key_pattern in API_KEY_PATTERNS:
                                match = api_key_pattern.search(line_str)
                                if match and not any(marker in match.group(0).lower() for marker in SAFE_API_KEY_MARKERS):
                                    self.log_error("SECRET_LEAK", "Found embedded API key pattern", file_path, line_idx)
                                    found_secret = True
                                    break

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

    def parse_compose(self, compose_content: str):
        services = {}
        networks = []
        volumes = []
        current_section = None
        current_svc = None
        current_key = None

        for line in compose_content.splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith('#'):
                continue

            m_root = re.match(r'^([a-zA-Z_-]+):\s*$', line)
            if m_root:
                current_section = m_root.group(1)
                current_svc = None
                current_key = None
                continue

            if current_section == 'services':
                m_svc = re.match(r'^  ([a-zA-Z0-9_-]+):\s*$', line)
                if m_svc:
                    current_svc = m_svc.group(1)
                    services[current_svc] = {
                        'profiles': [],
                        'ports': [],
                        'networks': [],
                        'image': None,
                        'build_context': None
                    }
                    current_key = None
                    continue

                if current_svc:
                    m_key = re.match(r'^    ([a-zA-Z0-9_-]+):\s*(.*)$', line)
                    if m_key:
                        current_key = m_key.group(1)
                        val = m_key.group(2).strip()
                        if current_key == 'image' and val:
                            services[current_svc]['image'] = val.strip('\"\'')
                        elif current_key == 'build' and val:
                            services[current_svc]['build_context'] = val.strip('\"\'')
                        elif current_key in ['profiles', 'ports', 'networks'] and val.startswith('[') and val.endswith(']'):
                            items = [x.strip().strip('\"\'') for x in val[1:-1].split(',') if x.strip()]
                            services[current_svc][current_key].extend(items)
                        continue

                    m_build_ctx = re.match(r'^      context:\s*(.*)$', line)
                    if m_build_ctx and current_key == 'build':
                        services[current_svc]['build_context'] = m_build_ctx.group(1).strip().strip('\"\'')
                        continue

                    m_item = re.match(r'^      -\s*(.*)$', line)
                    if m_item and current_key in ['profiles', 'ports', 'networks']:
                        item_val = m_item.group(1).strip().strip('\"\'')
                        services[current_svc][current_key].append(item_val)
                        continue

            elif current_section == 'networks':
                m_net = re.match(r'^  ([a-zA-Z0-9_-]+):\s*$', line)
                if m_net:
                    networks.append(m_net.group(1))

            elif current_section == 'volumes':
                m_vol = re.match(r'^  ([a-zA-Z0-9_-]+):\s*$', line)
                if m_vol:
                    volumes.append(m_vol.group(1))

        return services, networks, volumes

    def check_docker_compose(self):
        """Verifies docker-compose.yml profiles, single ingress, network isolation, and pinned images (AD-11, AR-14, AR-25)."""
        compose_path = self.root_dir / 'docker-compose.yml'
        if not compose_path.exists():
            self.log_error("MISSING_FILE", "docker-compose.yml not found")
            return

        with open(compose_path, 'r', encoding='utf-8') as f:
            compose_content = f.read()

        services, networks, volumes = self.parse_compose(compose_content)

        # 1. Check required services existence
        required_services = [
            'postgres', 'p-process', 'caddy', 'keycloak',
            'odoo', 'node-red', 'superset', 'mailpit',
            'qdrant', 'haystack-rag'
        ]
        for req_svc in required_services:
            if req_svc not in services:
                self.log_error("MISSING_SERVICE", f"docker-compose.yml missing required service '{req_svc}'")

        # 2. Check profile segregation (AR-14, AC 2)
        # Profile core MUST only run p-process, postgres, and test doubles.
        forbidden_in_core = ['odoo', 'superset', 'node-red', 'qdrant', 'haystack-rag']
        for fn in forbidden_in_core:
            if fn in services and 'core' in services[fn]['profiles']:
                self.log_error("FORBIDDEN_PROFILE_SERVICE", f"Service '{fn}' has profile 'core' which violates AR-14 / Story 1.2 AC 2")

        if 'p-process' in services and 'core' not in services['p-process']['profiles']:
            self.log_error("INVALID_PROFILE", "Service 'p-process' must have 'core' profile")

        if 'postgres' in services and 'core' not in services['postgres']['profiles']:
            self.log_error("INVALID_PROFILE", "Service 'postgres' must have 'core' profile")

        # Profile demo MUST include Caddy, Keycloak, Odoo, Node-RED, Superset
        demo_services = ['caddy', 'keycloak', 'odoo', 'node-red', 'superset', 'mailpit']
        for ds in demo_services:
            if ds in services and 'demo' not in services[ds]['profiles']:
                self.log_error("INVALID_PROFILE", f"Service '{ds}' must belong to profile 'demo'")

        # Profile ai uses local Qdrant and Haystack; hosted inference stays external.
        ai_services = ['qdrant', 'haystack-rag']
        for asvc in ai_services:
            if asvc in services and 'ai' not in services[asvc]['profiles']:
                self.log_error("INVALID_PROFILE", f"Service '{asvc}' must belong to profile 'ai'")

        # 3. Hardened ingress check (AD-11): Only Caddy may publish host ports
        for svc_name, svc_info in services.items():
            if svc_name == 'caddy':
                if not svc_info['ports']:
                    self.log_error("MISSING_INGRESS_PORTS", "Caddy service must publish public ports 80 and 443")
            else:
                if svc_info['ports']:
                    self.log_error(
                        "PUBLIC_PORT_LEAK",
                        f"Internal service '{svc_name}' exposes host ports {svc_info['ports']}, violating AD-11 (only Caddy may publish host ports)"
                    )

        # 4. Network segregation check (AD-11)
        required_networks = ['public-net', 'app-net', 'data-net']
        for rn in required_networks:
            if rn not in networks:
                self.log_error("MISSING_NETWORK", f"docker-compose.yml missing network '{rn}'")

        if 'caddy' in services:
            caddy_nets = services['caddy']['networks']
            if 'public-net' not in caddy_nets or 'app-net' not in caddy_nets:
                self.log_error("INVALID_NETWORK_ATTACHMENT", "Caddy must attach to 'public-net' and 'app-net'")

        if 'postgres' in services:
            if 'data-net' not in services['postgres']['networks']:
                self.log_error("INVALID_NETWORK_ATTACHMENT", "Postgres must attach to 'data-net'")

        # 5. Pinned images and service build contexts
        pinned_images = {
            'postgres': 'postgres:16-alpine',
            'caddy': 'caddy:2.11.4-alpine',
            'keycloak': 'quay.io/keycloak/keycloak:26.7.4',
            'mailpit': 'axllent/mailpit:v1.31.1',
            'qdrant': 'qdrant/qdrant:v1.19.1'
        }
        for svc_name, expected_img in pinned_images.items():
            if svc_name in services:
                actual_img = services[svc_name]['image']
                if actual_img != expected_img:
                    self.log_error("IMAGE_PIN_MISMATCH", f"Service '{svc_name}' image expected '{expected_img}', found '{actual_img}'")

        if 'node-red' in services:
            ctx = services['node-red'].get('build_context', '')
            if './services/p_automation' not in ctx:
                self.log_error("INVALID_COMPOSE", "node-red service must point to ./services/p_automation")

        if 'p-process' in services:
            ctx = services['p-process'].get('build_context', '')
            if './services/p_process' not in ctx:
                self.log_error("INVALID_COMPOSE", "p-process service must point to ./services/p_process")

        self.log_pass("docker-compose.yml profiles, single ingress (AD-11), network segregation, and image pins validated")

    def check_ai_provider_boundary(self):
        """Rejects local-model runtime remnants and unsafe/dynamic hosted inference configuration."""
        compose_path = self.root_dir / 'docker-compose.yml'
        env_path = self.root_dir / '.env.example'
        pipeline_path = self.root_dir / 'services' / 'i_intelligence' / 'haystack_rag' / 'src' / 'pipelines' / 'rag_pipeline.py'
        legacy_dir = self.root_dir / 'services' / 'i_intelligence' / 'ollama'
        lock_path = self.root_dir / 'services' / 'i_intelligence' / 'haystack_rag' / 'uv.lock'

        compose = compose_path.read_text(encoding='utf-8')
        env_content = env_path.read_text(encoding='utf-8')
        pipeline = pipeline_path.read_text(encoding='utf-8')

        if re.search(r'^\s{2}ollama:\s*$', compose, re.MULTILINE) or 'ollama/ollama:' in compose:
            self.log_error('FORBIDDEN_OLLAMA_RUNTIME', 'docker-compose.yml still defines an Ollama runtime')
        if legacy_dir.exists():
            self.log_error('FORBIDDEN_OLLAMA_ASSET', 'services/i_intelligence/ollama must be removed')
        if not lock_path.is_file():
            self.log_error('MISSING_LOCKFILE', 'services/i_intelligence/haystack_rag/uv.lock is required')

        required_env = ['AI_PROVIDER=openrouter', 'OPENROUTER_BASE_URL=https://', 'OPENROUTER_API_KEY=', 'OPENROUTER_TIMEOUT_SECONDS=']
        for token in required_env:
            if token not in env_content:
                self.log_error('MISSING_OPENROUTER_CONFIG', f'.env.example missing safe configuration token {token!r}')
        key_line = next((line for line in env_content.splitlines() if line.startswith('OPENROUTER_API_KEY=')), None)
        if key_line != 'OPENROUTER_API_KEY=':
            self.log_error('OPENROUTER_SECRET_LEAK', '.env.example must keep OPENROUTER_API_KEY empty')

        if 'OPENROUTER_MODEL = "qwen/qwen3.8-27b:free"' not in pipeline:
            self.log_error('UNPINNED_AI_MODEL', 'generation model must be the fixed qwen/qwen3.8-27b:free slug')
        forbidden_model_tokens = ['openrouter/auto', ':latest', '/latest']
        for token in forbidden_model_tokens:
            if token in compose.lower() or token in pipeline.lower():
                self.log_error('DYNAMIC_AI_MODEL', f'forbidden dynamic model selector found: {token}')
        if '"data_collection": "deny"' not in pipeline or '"require_parameters": True' not in pipeline:
            self.log_error('MISSING_PROVIDER_PRIVACY', 'OpenRouter request must deny data collection and require parameters')

        compose_proc = subprocess.run(
            ['docker', 'compose', '--env-file', '.env.example', '--profile', 'ai', 'config', '--format', 'json'],
            capture_output=True,
            text=True,
            cwd=str(self.root_dir),
        )
        if compose_proc.returncode != 0:
            self.log_error('COMPOSE_RESOLUTION_FAILED', 'Could not resolve the ai Compose profile')
        else:
            try:
                resolved = json.loads(compose_proc.stdout)
                ai_env = resolved['services']['haystack-rag']['environment']
                expected_ai_env = {
                    'AI_PROVIDER': 'openrouter',
                    'OPENROUTER_BASE_URL': 'https://openrouter.ai/api/v1',
                    'OPENROUTER_API_KEY': '',
                    'OPENROUTER_TIMEOUT_SECONDS': '30',
                }
                for name, expected in expected_ai_env.items():
                    if ai_env.get(name) != expected:
                        self.log_error('INVALID_RESOLVED_AI_ENV', f'haystack-rag {name} must resolve to the safe example value')
            except (json.JSONDecodeError, KeyError, TypeError):
                self.log_error('INVALID_RESOLVED_AI_ENV', 'Resolved Compose output lacks haystack-rag environment mapping')

        self.log_pass('OpenRouter HTTPS, secret, privacy, fixed-model, and no-Ollama runtime boundary validated')

    def check_caddy_ingress(self):
        """Verifies infra/caddy/Caddyfile configuration."""
        caddyfile_path = self.root_dir / 'infra' / 'caddy' / 'Caddyfile'
        if not caddyfile_path.exists():
            self.log_error("MISSING_FILE", "infra/caddy/Caddyfile does not exist")
            return

        with open(caddyfile_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Check routing rules
        required_routes = [
            ('/web', 'odoo:8069'),
            ('/websocket', 'odoo:8069 websocket'),
            ('/api', 'p-process:3000'),
            ('/health', 'p-process:3000 /health'),
            ('/realms', 'keycloak:8080'),
            ('/analytics', 'superset:8088'),
            ('web:3000', 'Next.js BFF default route')
        ]
        for route_token, desc in required_routes:
            if route_token not in content:
                self.log_error("MISSING_ROUTE", f"infra/caddy/Caddyfile missing route for {desc} ('{route_token}')")

        # Check for forbidden wildcard CORS
        if re.search(r'Access-Control-Allow-Origin["\s]+[*]', content, re.IGNORECASE):
            self.log_error("SECURITY_VIOLATION", "Caddyfile contains forbidden wildcard CORS (*)")

        self.log_pass("infra/caddy/Caddyfile single ingress and security configuration validated")

    def check_fixtures(self):
        """Verifies fixtures/core/initial_demo_metadata.sql idempotency and demo labeling."""
        fixture_path = self.root_dir / 'fixtures' / 'core' / 'initial_demo_metadata.sql'
        if not fixture_path.exists():
            self.log_error("MISSING_FILE", "fixtures/core/initial_demo_metadata.sql does not exist")
            return

        with open(fixture_path, 'r', encoding='utf-8') as f:
            raw_content = f.read()

        # Strip comments
        clean_code = re.sub(r'/\*.*?\*/', '', raw_content, flags=re.DOTALL)
        clean_code = re.sub(r'--.*$', '', clean_code, flags=re.MULTILINE)

        # Check idempotency: Every INSERT must have ON CONFLICT
        insert_count = len(re.findall(r'\bINSERT\s+INTO\b', clean_code, re.IGNORECASE))
        conflict_count = len(re.findall(r'\bON\s+CONFLICT\b', clean_code, re.IGNORECASE))

        if insert_count == 0:
            self.log_error("EMPTY_FIXTURE", "initial_demo_metadata.sql contains no INSERT statements")
        elif insert_count != conflict_count:
            self.log_error("NON_IDEMPOTENT_FIXTURE", f"Found {insert_count} INSERTs but {conflict_count} ON CONFLICT clauses")

        # Check demo label
        if 'demo' not in raw_content.lower() and 'fixture' not in raw_content.lower():
            self.log_error("UNLABELED_FIXTURE", "initial_demo_metadata.sql missing demo/fixture metadata label")

        # Check forbidden premature business tables
        forbidden = [
            r'\bINSERT\s+INTO\s+[^(]*\btickets\b',
            r'\bINSERT\s+INTO\s+[^(]*\bassignments\b',
            r'\bINSERT\s+INTO\s+[^(]*\bcsat_responses\b',
            r'\bINSERT\s+INTO\s+[^(]*\bsops\b',
        ]
        for fbt in forbidden:
            if re.search(fbt, clean_code, re.IGNORECASE):
                self.log_error("PREMATURE_BUSINESS_DATA", f"initial_demo_metadata.sql contains forbidden statement matching '{fbt}'")

        self.log_pass("fixtures/core/initial_demo_metadata.sql idempotency and demo labeling validated")

    def check_environment_and_scripts(self):
        """Verifies .env.example, scripts/load-fixtures.py, and scripts/check-health.py exist and execute correctly."""
        env_ex_path = self.root_dir / '.env.example'
        if not env_ex_path.exists():
            self.log_error("MISSING_FILE", ".env.example does not exist")
        else:
            with open(env_ex_path, 'r', encoding='utf-8') as f:
                env_content = f.read()

            required_env_vars = [
                'COMPOSE_PROFILES', 'POSTGRES_DB', 'POSTGRES_USER',
                'DATABASE_URL', 'KEYCLOAK_ADMIN', 'KEYCLOAK_DB',
                'ODOO_DB_USER', 'SUPERSET_SECRET_KEY', 'MAILPIT_SMTP_PORT',
                'AI_PROVIDER', 'OPENROUTER_BASE_URL', 'OPENROUTER_API_KEY',
                'OPENROUTER_TIMEOUT_SECONDS'
            ]
            for rev in required_env_vars:
                if rev not in env_content:
                    self.log_error("MISSING_ENV_VAR", f".env.example missing required variable '{rev}'")

        load_fixtures_script = self.root_dir / 'scripts' / 'load-fixtures.py'
        if not load_fixtures_script.exists():
            self.log_error("MISSING_SCRIPT", "Required script 'scripts/load-fixtures.py' does not exist")
        else:
            proc_fixtures = subprocess.run(
                [sys.executable, str(load_fixtures_script), '--dry-run'],
                capture_output=True,
                text=True,
                cwd=str(self.root_dir)
            )
            if proc_fixtures.returncode != 0:
                self.log_error(
                    "SCRIPT_EXEC_FAILURE",
                    f"scripts/load-fixtures.py --dry-run failed with exit code {proc_fixtures.returncode}: {proc_fixtures.stderr.strip()}"
                )

        check_health_script = self.root_dir / 'scripts' / 'check-health.py'
        if not check_health_script.exists():
            self.log_error("MISSING_SCRIPT", "Required script 'scripts/check-health.py' does not exist")
        else:
            proc_health = subprocess.run(
                [sys.executable, str(check_health_script), '--profile', 'ai', '--check-resources'],
                capture_output=True,
                text=True,
                cwd=str(self.root_dir)
            )
            expected_standard = [
                'Target Profile: AI',
                'Required >= 4,',
                'Required >= 4.0 GB,',
                'Required >= 15.0 GB,',
            ]
            if proc_health.returncode not in (0, 1) or any(token not in proc_health.stdout for token in expected_standard):
                self.log_error(
                    "SCRIPT_EXEC_FAILURE",
                    "scripts/check-health.py --profile ai --check-resources did not report the deterministic 4 CPU / 4 GB RAM / 15 GB disk standard"
                )

        self.log_pass(".env.example, load-fixtures.py (--dry-run), and ai resource standards executed and validated")

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
        self.check_ai_provider_boundary()
        self.check_caddy_ingress()
        self.check_fixtures()
        self.check_environment_and_scripts()

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
