# Copyright (C) 2026 DX-LAB Development Team
# License: AGPL-3.0

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "test-architecture.py"
SPEC = importlib.util.spec_from_file_location("architecture_checks", SCRIPT)
architecture_checks = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(architecture_checks)


def test_openrouter_secret_detector_handles_hyphens_without_placeholder_false_positive(tmp_path):
    leaked = tmp_path / "leaked.py"
    leaked.write_text('key = "' + 'sk-or-v1-' + 'AbCdEfGhIjKlMnOpQrStUvWx' + '"\n', encoding="utf-8")
    checker = architecture_checks.ArchitectureChecker(tmp_path)
    checker.scan_no_hardcoded_secrets()
    assert any("SECRET_LEAK" in error for error in checker.errors)

    leaked.write_text('key = "sk-or-v1-placeholder-value-for-test"\n', encoding="utf-8")
    checker = architecture_checks.ArchitectureChecker(tmp_path)
    checker.scan_no_hardcoded_secrets()
    assert checker.errors == []


def test_ai_compose_environment_and_resource_standard_conform():
    checker = architecture_checks.ArchitectureChecker(ROOT)
    checker.check_ai_provider_boundary()
    checker.check_environment_and_scripts()
    assert checker.errors == []
