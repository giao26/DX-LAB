#!/usr/bin/env python3
# ==============================================================================
# DX-LAB (DX-OS) - Health, Readiness, and Hardware Resource Checker
# Checks service readiness and validates host hardware specs against profiles.
# Story 1.2 AC 4, AC 5 / AR-11 / AR-24
# Copyright (C) 2026 DX-LAB Development Team
# License: AGPL-3.0
# ==============================================================================

import os
import sys
import argparse
import shutil
import subprocess
import json
import urllib.request
from pathlib import Path

# Minimum hardware resource standards per profile (documented in BUILD.md & README.md)
RESOURCE_STANDARDS = {
    "core": {
        "name": "Core Profile (P-Process + PostgreSQL)",
        "min_cpu": 2,
        "min_ram_gb": 2.0,
        "min_disk_gb": 10.0,
        "desc": "Lightweight development & contribution harness without AI/ERP"
    },
    "demo": {
        "name": "Demo Profile (Full H-P-D Stack + Ingress + IAM)",
        "min_cpu": 4,
        "min_ram_gb": 8.0,
        "min_disk_gb": 20.0,
        "desc": "Complete showcase environment (Web, Odoo, Keycloak, Superset, Caddy)"
    },
    "ai": {
        "name": "AI Profile (Vector Store + Local LLM + RAG)",
        "min_cpu": 8,
        "min_ram_gb": 16.0,
        "min_disk_gb": 40.0,
        "desc": "Intelligence advisory services (Qdrant, Ollama, Haystack RAG)"
    }
}

# Expected services per profile in docker-compose
PROFILE_SERVICES = {
    "core": ["postgres", "p-process"],
    "demo": ["postgres", "p-process", "caddy", "keycloak", "odoo", "node-red", "superset", "mailpit"],
    "ai": ["postgres", "p-process", "qdrant", "ollama", "haystack-rag"]
}


def parse_args():
    parser = argparse.ArgumentParser(description="DX-LAB Health & Resource Checker")
    parser.add_argument(
        "--profile",
        type=str,
        default="core",
        choices=["core", "demo", "ai"],
        help="Target profile to check (default: core)"
    )
    parser.add_argument(
        "--check-resources",
        action="store_true",
        help="Check host hardware resources (CPU, RAM, Disk) against minimum requirements"
    )
    return parser.parse_args()


def get_system_hardware(repo_root: Path) -> dict:
    """Detects available CPU count, Total RAM (GB), and Free Disk Space (GB)."""
    # 1. CPU cores
    cpu_count = os.cpu_count() or 1

    # 2. Total RAM in GB
    ram_gb = 0.0
    try:
        if sys.platform == "win32":
            import ctypes
            class MEMORYSTATUSEX(ctypes.Structure):
                _fields_ = [
                    ('dwLength', ctypes.c_ulong),
                    ('dwMemoryLoad', ctypes.c_ulong),
                    ('ullTotalPhys', ctypes.c_ulonglong),
                    ('ullAvailPhys', ctypes.c_ulonglong),
                    ('ullTotalPageFile', ctypes.c_ulonglong),
                    ('ullAvailPageFile', ctypes.c_ulonglong),
                    ('ullTotalVirtual', ctypes.c_ulonglong),
                    ('ullAvailVirtual', ctypes.c_ulonglong),
                    ('sullAvailExtendedVirtual', ctypes.c_ulonglong)
                ]
            stat = MEMORYSTATUSEX()
            stat.dwLength = ctypes.sizeof(stat)
            ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(stat))
            ram_gb = round(stat.ullTotalPhys / (1024 ** 3), 2)
        elif sys.platform.startswith("linux"):
            with open("/proc/meminfo", "r", encoding="utf-8") as f:
                for line in f:
                    if line.startswith("MemTotal:"):
                        kb = int(line.split()[1])
                        ram_gb = round(kb / (1024 ** 2), 2)
                        break
        elif sys.platform == "darwin":
            out = subprocess.check_output(["sysctl", "-n", "hw.memsize"]).strip()
            ram_gb = round(int(out) / (1024 ** 3), 2)
    except Exception:
        # Fallback if query fails
        ram_gb = 4.0

    # 3. Free Disk Space in GB
    try:
        _, _, free_bytes = shutil.disk_usage(repo_root)
        disk_gb = round(free_bytes / (1024 ** 3), 2)
    except Exception:
        disk_gb = 20.0

    return {
        "cpu": cpu_count,
        "ram_gb": ram_gb,
        "disk_gb": disk_gb
    }


def check_resources(target_profile: str, repo_root: Path) -> int:
    """Validates hardware specifications against documented minimum requirements."""
    hw = get_system_hardware(repo_root)
    std = RESOURCE_STANDARDS[target_profile]

    print("==============================================================================")
    print("                DX-LAB HARDWARE RESOURCE EVALUATION                           ")
    print("==============================================================================")
    print(f"Target Profile: {target_profile.upper()} - {std['name']}")
    print(f"Scope:          {std['desc']}\n")

    print(f"Detected System Specs:")
    print(f" - CPU Logical Cores:   {hw['cpu']}")
    print(f" - Physical RAM:        {hw['ram_gb']} GB")
    print(f" - Available Disk:      {hw['disk_gb']} GB\n")

    print(f"Resource Requirements for '{target_profile}':")
    print(f" - CPU Cores:  Required >= {std['min_cpu']}, Available = {hw['cpu']}")
    print(f" - RAM (GB):   Required >= {std['min_ram_gb']} GB, Available = {hw['ram_gb']} GB")
    print(f" - Disk (GB):  Required >= {std['min_disk_gb']} GB, Available = {hw['disk_gb']} GB\n")

    lacking = []
    if hw['cpu'] < std['min_cpu']:
        missing_cpu = std['min_cpu'] - hw['cpu']
        lacking.append(f"CPU: {hw['cpu']} core(s) available, {std['min_cpu']} required (missing {missing_cpu} core(s))")

    if hw['ram_gb'] < std['min_ram_gb']:
        missing_ram = round(std['min_ram_gb'] - hw['ram_gb'], 2)
        lacking.append(f"RAM: {hw['ram_gb']} GB available, {std['min_ram_gb']} GB required (missing {missing_ram} GB)")

    if hw['disk_gb'] < std['min_disk_gb']:
        missing_disk = round(std['min_disk_gb'] - hw['disk_gb'], 2)
        lacking.append(f"Disk: {hw['disk_gb']} GB available, {std['min_disk_gb']} GB required (missing {missing_disk} GB)")

    if lacking:
        print("[WARNING] Hardware resources do NOT meet the minimum requirements for profile:")
        for item in lacking:
            print(f" [!] {item}")
        print("\n[RECOMMENDATION]:")
        if target_profile in ["demo", "ai"]:
            print(" - Use profile 'core' (`docker compose --profile core up`) for local development without AI or heavy services.")
            print(" - The 'core' profile requires only 2 CPU cores, 2 GB RAM, and 10 GB Disk space.")
        return 1
    else:
        print(f"[PASS] Hardware satisfies all minimum requirements for profile '{target_profile}'.")
        return 0


def check_service_readiness(target_profile: str, repo_root: Path) -> int:
    """Reports status of containers and service readiness without leaking secrets."""
    expected_services = PROFILE_SERVICES.get(target_profile, [])
    print("==============================================================================")
    print(f"             DX-LAB READINESS CHECK (PROFILE: {target_profile.upper()})       ")
    print("==============================================================================")
    print(f"Expected Services: {', '.join(expected_services)}\n")

    # Try querying docker compose ps
    docker_running = False
    containers_status = {}
    try:
        cmd = ["docker", "compose", "--profile", target_profile, "ps", "--format", "json"]
        proc = subprocess.run(cmd, capture_output=True, text=True, cwd=str(repo_root))
        if proc.returncode == 0 and proc.stdout.strip():
            docker_running = True
            lines = proc.stdout.strip().split("\n")
            for line in lines:
                try:
                    c_info = json.loads(line)
                    service_name = c_info.get("Service", "")
                    state = c_info.get("State", "")
                    health = c_info.get("Health", "")
                    containers_status[service_name] = {"state": state, "health": health}
                except json.JSONDecodeError:
                    pass
    except Exception:
        pass

    if not docker_running:
        print("[INFO] Docker containers are not currently running or Docker engine is offline.")
        print(f"[STATUS] Detail of pending services for profile '{target_profile}':")
        for s in expected_services:
            print(f" - {s:<15}: NOT RUNNING (Pending start with 'docker compose --profile {target_profile} up')")
        print("\nNote: No secrets or credentials exposed in status report.")
        return 1

    # Print detailed container status
    all_ready = True
    for s in expected_services:
        info = containers_status.get(s)
        if not info:
            print(f" - {s:<15}: NOT RUNNING")
            all_ready = False
        else:
            state = info["state"]
            health = f" ({info['health']})" if info["health"] else ""
            if state.lower() in ["running", "healthy"]:
                print(f" - {s:<15}: READY [{state}{health}]")
            else:
                print(f" - {s:<15}: NOT READY [{state}{health}]")
                all_ready = False

    # Check P-Process HTTP /health endpoint via docker exec or container status when running
    if "p-process" in expected_services and docker_running:
        checked_via_exec = False
        try:
            cmd = ["docker", "compose", "exec", "-T", "p-process", "node", "-e", "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
            exec_proc = subprocess.run(cmd, capture_output=True, cwd=str(repo_root), timeout=5)
            if exec_proc.returncode == 0:
                print(" [PASS] P-Process internal /health endpoint is healthy (verified via container exec)")
                checked_via_exec = True
        except Exception:
            pass

        if not checked_via_exec:
            p_state = containers_status.get("p-process", {}).get("state", "").lower()
            if p_state in ["running", "healthy"]:
                print(f" [PASS] P-Process container is {p_state}")
            else:
                all_ready = False

    return 0 if all_ready else 1


def main():
    args = parse_args()
    repo_root = Path(__file__).resolve().parent.parent

    # Check resources only if specifically requested
    if args.check_resources:
        sys.exit(check_resources(args.profile, repo_root))
    else:
        # Combined check: hardware resources + service readiness (both must pass)
        res_code = check_resources(args.profile, repo_root)
        print()
        svc_code = check_service_readiness(args.profile, repo_root)
        sys.exit(0 if (res_code == 0 and svc_code == 0) else 1)


if __name__ == "__main__":
    main()
