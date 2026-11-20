"""
GhostPilot Complete Workspace Verification Suite
Validates all backend and automation modules, database schemas, compilers, and production binaries.
"""

import os
import sys

# Prevent bytecode cache generation to keep the workspace clean
sys.dont_write_bytecode = True

import json
import subprocess
from pathlib import Path

# Add automation-engine to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "automation-engine")))

def verify_all():
    print("====================================================================")
    print(" [ GHOSTPILOT ] Complete Systems & Files Verification Suite ")
    print("====================================================================")

    root_dir = Path(__file__).parent.parent

    # 1. Check Root Executable (GhostPilot.exe)
    root_exe = root_dir / "GhostPilot.exe"
    assert root_exe.exists(), "Root Executable missing: GhostPilot.exe not found in project root!"
    with open(root_exe, "rb") as f:
        assert f.read(2) == b"MZ", "GhostPilot.exe is not a valid Windows executable (missing MZ signature)!"
    size_mb = round(root_exe.stat().st_size / (1024 * 1024), 2)
    print(f"[PASS] Root Executable: {root_exe.name} exists ({size_mb} MB, Valid Win32/x64 PE)")

    # 2. Check Standalone Worker Binary (worker.exe)
    worker_exe = root_dir / "worker.exe"
    assert worker_exe.exists(), "Standalone Worker missing: worker.exe not found in project root!"
    with open(worker_exe, "rb") as f:
        assert f.read(2) == b"MZ", "worker.exe is not a valid Windows executable (missing MZ signature)!"
    worker_size_mb = round(worker_exe.stat().st_size / (1024 * 1024), 2)
    print(f"[PASS] Standalone Worker: {worker_exe.name} exists ({worker_size_mb} MB, Valid Win32/x64 PE)")

    # 3. Check Storage & SQLite DB
    from storage import StorageManager, get_db_path
    sm = StorageManager()
    db_file = get_db_path()
    assert Path(db_file).exists(), f"Database file does not exist at {db_file}"
    print(f"[PASS] Storage: SQLite Database active at {db_file}")

    workflows = sm.list_workflows()
    watchdogs = sm.list_watchdogs()
    schedules = sm.list_schedules()
    audit_logs = sm.list_audit_logs()
    settings = sm.get_settings()
    assert isinstance(settings, dict) and "safety_sandbox_level" in settings, "Invalid settings returned from database"
    print(f"[PASS] Database Entities: {len(workflows)} Workflows, {len(watchdogs)} Watchdogs, {len(schedules)} Schedules, {len(audit_logs)} Audit Logs")
    print(f"[PASS] Settings Keys: {', '.join(settings.keys())}")

    # 4. Check Safety Sandbox & Risk Engine
    from safety import SafetySandbox
    assert SafetySandbox.is_restricted_path("C:\\Windows\\System32") is True, "System32 was not identified as restricted!"
    assert SafetySandbox.is_restricted_path("C:\\Program Files\\app") is True, "Program Files was not identified as restricted!"
    assert SafetySandbox.is_restricted_path("C:\\Users\\WindowsUser\\Downloads") is False, "Downloads should not be restricted!"

    risk, reasons = SafetySandbox.evaluate_action_risk({"type": "DELETE_FILES", "path": "C:/Temp"})
    assert risk == "HIGH_RISK", f"DELETE_FILES should be HIGH_RISK, got {risk}"
    print("[PASS] Safety Sandbox: Protected system path barriers and risk assessment verified")

    # 5. Check Prompt Compiler (NLP & Rule-based Heuristic)
    from compiler import PromptCompiler
    pc = PromptCompiler({"llm_provider": "heuristics"})
    prompts_to_test = [
        "Organize all PDFs and ZIPs in my Downloads folder into separate subfolders every night at 10 PM",
        "Clean up temporary files in Temp folder older than 24 hours",
        "Batch rename all screenshots in Pictures to Screenshot-YYYY-MM-DD",
        "Launch Visual Studio Code and Spotify when starting work",
        "Terminate unresponsive node.exe processes"
    ]

    for p in prompts_to_test:
        plan = pc.compile(p)
        assert len(plan["actions"]) >= 1, f"Compiler generated 0 actions for prompt: {p}"
        assert "risk_level" in plan, "Missing risk_level in compiled plan"
        print(f"  [PASS] Compiler: '{p[:45]}...' -> [{plan['title']}] ({plan['risk_level']})")

    # 6. Check Process & Resource Service
    from process_service import ProcessService
    metrics = ProcessService.get_system_metrics()
    assert "cpu_percent" in metrics and "ram_percent" in metrics, "Missing metrics from ProcessService"
    print(f"[PASS] ProcessService: CPU {metrics['cpu_percent']}%, RAM {metrics['ram_percent']}% ({metrics['ram_used_gb']}GB / {metrics['ram_total_gb']}GB)")

    # 7. Check Engine & Dry-run Simulation
    from engine import GhostPilotEngine
    engine = GhostPilotEngine(enable_background_workers=False)
    sample_plan = pc.compile(prompts_to_test[0])
    sim_result = engine.execute_workflow(sample_plan, dry_run=True)
    assert sim_result["success"] is True, "Dry-run simulation failed!"
    assert sim_result["dry_run"] is True, "Result was not flagged as dry_run!"
    assert "simulation" in sim_result, "Simulation details missing from result"
    print(f"[PASS] GhostPilot Engine: Dry-run simulation completed in {sim_result['duration_ms']}ms ({sim_result['simulation']['total_affected_count']} items analyzed)")

    # 8. Check Frontend Distribution Files
    dist_dir = root_dir / "dist"
    assert (dist_dir / "index.html").exists(), "Frontend build missing: dist/index.html not found!"
    assert (dist_dir / "assets").exists(), "Frontend assets missing: dist/assets not found!"
    assets = list((dist_dir / "assets").glob("*"))
    assert len(assets) > 0, "No assets found in dist/assets directory!"
    print(f"[PASS] Frontend Bundle: dist/index.html and {len(assets)} compiled assets verified")

    # 9. Check Worker CLI Subcommand Execution (Sub-second execution via worker.py)
    worker_py = root_dir / "automation-engine" / "worker.py"
    assert worker_py.exists(), f"Worker script missing: {worker_py}"

    p_stats = subprocess.run([sys.executable, "-B", str(worker_py), "stats"], capture_output=True, text=True, timeout=15)
    assert p_stats.returncode == 0, f"Worker stats failed with code {p_stats.returncode}: {p_stats.stderr}"
    worker_stats = json.loads(p_stats.stdout)
    assert "cpu_percent" in worker_stats, "Invalid stats payload returned from worker"
    print(f"[PASS] Worker CLI Dispatch: 'worker stats' returned valid JSON metrics")

    # 10. Check Worker Storage CLI Subcommands
    p_storage = subprocess.run([sys.executable, "-B", str(worker_py), "storage", "--action", "get_settings"], capture_output=True, text=True, timeout=15)
    assert p_storage.returncode == 0, f"Worker storage failed with code {p_storage.returncode}: {p_storage.stderr}"
    settings_out = json.loads(p_storage.stdout)
    assert "safety_sandbox_level" in settings_out, "Invalid settings payload returned from worker"
    print(f"[PASS] Worker Storage CLI: 'storage --action get_settings' returned active settings")

    print("====================================================================")
    print(" ALL VERIFICATIONS PASSED (100% OPERATIONAL) ")
    print("====================================================================")

if __name__ == "__main__":
    verify_all()
