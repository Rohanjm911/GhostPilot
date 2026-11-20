"""
GhostPilot Standalone Automation Worker & Tauri Sidecar Entrypoint
Provides JSON-RPC stdio server interface, background daemon, and standalone CLI utilities.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import json
import argparse
import time
from typing import Dict, Any

from engine import GhostPilotEngine
from process_service import ProcessService

def run_stdio_server():
    """
    Runs persistent stdio JSON-RPC server communicating with Tauri Rust backend.
    Reads line-delimited JSON commands from stdin and outputs JSON responses to stdout.
    """
    engine = GhostPilotEngine(enable_background_workers=True)
    sys.stdout.write(json.dumps({"status": "READY", "message": "GhostPilot Automation Engine Initialized"}) + "\n")
    sys.stdout.flush()

    while True:
        try:
            line = sys.stdin.readline()
            if not line:
                break
            line = line.strip()
            if not line:
                continue

            try:
                request = json.loads(line)
            except json.JSONDecodeError as err:
                sys.stdout.write(json.dumps({"error": f"Invalid JSON: {str(err)}"}) + "\n")
                sys.stdout.flush()
                continue

            cmd = request.get("command")
            req_id = request.get("id")

            response = {"id": req_id, "success": True}

            if cmd == "ping":
                response["data"] = {"pong": True, "timestamp": time.time()}

            elif cmd == "get_system_stats":
                metrics = ProcessService.get_system_metrics()
                w_status = engine.watchdog_service.get_status()
                s_status = engine.scheduler_service.get_status()
                response["data"] = {
                    **metrics,
                    "active_watchdogs": w_status["running_watchers"],
                    "active_schedules": s_status["active_schedules"]
                }

            elif cmd == "compile":
                prompt = request.get("prompt", "")
                plan = engine.compile_prompt(prompt)
                response["data"] = plan

            elif cmd == "execute":
                plan = request.get("plan", {})
                dry_run = request.get("dry_run", False)
                trigger_type = request.get("trigger_type", "MANUAL")
                res = engine.execute_workflow(plan, dry_run=dry_run, trigger_type=trigger_type)
                response["data"] = res

            elif cmd == "list_workflows":
                response["data"] = engine.storage.list_workflows()

            elif cmd == "save_workflow":
                wf = request.get("workflow", {})
                wid = engine.storage.save_workflow(wf)
                response["data"] = {"id": wid}

            elif cmd == "delete_workflow":
                wid = request.get("workflow_id", "")
                response["data"] = {"deleted": engine.storage.delete_workflow(wid)}

            elif cmd == "list_watchdogs":
                response["data"] = engine.storage.list_watchdogs()

            elif cmd == "save_watchdog":
                wd = request.get("watchdog", {})
                wid = engine.storage.save_watchdog(wd)
                if wd.get("active", 1):
                    engine.watchdog_service.start_watch(wd)
                else:
                    engine.watchdog_service.stop_watch(wid)
                response["data"] = {"id": wid}

            elif cmd == "toggle_watchdog":
                wid = request.get("watchdog_id", "")
                active = request.get("active", True)
                engine.storage.toggle_watchdog(wid, active)
                if active:
                    wds = engine.storage.list_watchdogs()
                    matched = next((w for w in wds if w["id"] == wid), None)
                    if matched:
                        engine.watchdog_service.start_watch(matched)
                else:
                    engine.watchdog_service.stop_watch(wid)
                response["data"] = {"id": wid, "active": active}

            elif cmd == "delete_watchdog":
                wid = request.get("watchdog_id", "")
                engine.watchdog_service.stop_watch(wid)
                response["data"] = {"deleted": engine.storage.delete_watchdog(wid)}

            elif cmd == "list_schedules":
                response["data"] = engine.storage.list_schedules()

            elif cmd == "save_schedule":
                sc = request.get("schedule", {})
                sid = engine.storage.save_schedule(sc)
                if sc.get("active", 1):
                    engine.scheduler_service.register_job(sc)
                else:
                    engine.scheduler_service.remove_job(sid)
                response["data"] = {"id": sid}

            elif cmd == "toggle_schedule":
                sid = request.get("schedule_id", "")
                active = request.get("active", True)
                engine.storage.toggle_schedule(sid, active)
                if active:
                    scheds = engine.storage.list_schedules()
                    matched = next((s for s in scheds if s["id"] == sid), None)
                    if matched:
                        engine.scheduler_service.register_job(matched)
                else:
                    engine.scheduler_service.remove_job(sid)
                response["data"] = {"id": sid, "active": active}

            elif cmd == "delete_schedule":
                sid = request.get("schedule_id", "")
                engine.scheduler_service.remove_job(sid)
                response["data"] = {"deleted": engine.storage.delete_schedule(sid)}

            elif cmd == "list_audit_logs":
                response["data"] = engine.storage.list_audit_logs(limit=request.get("limit", 100))

            elif cmd == "clear_audit_logs":
                response["data"] = {"cleared": engine.storage.clear_audit_logs()}

            elif cmd == "get_settings":
                response["data"] = engine.storage.get_settings()

            elif cmd == "update_settings":
                settings = request.get("settings", {})
                engine.storage.update_settings(settings)
                engine.reload_settings()
                response["data"] = {"updated": True}

            else:
                response["success"] = False
                response["error"] = f"Unknown command: '{cmd}'"

            sys.stdout.write(json.dumps(response) + "\n")
            sys.stdout.flush()

        except Exception as ex:
            sys.stdout.write(json.dumps({"error": str(ex)}) + "\n")
            sys.stdout.flush()

def main():
    parser = argparse.ArgumentParser(description="GhostPilot Automation Worker")
    subparsers = parser.add_subparsers(dest="subcommand")

    subparsers.add_parser("server", help="Run stdio JSON-RPC server")

    compile_p = subparsers.add_parser("compile", help="Compile a plain English prompt")
    compile_p.add_argument("--prompt", required=True, help="Natural language prompt")

    exec_p = subparsers.add_parser("execute", help="Execute or simulate workflow plan")
    exec_p.add_argument("--plan", help="JSON string of plan")
    exec_p.add_argument("--plan-file", help="Path to JSON file containing plan")
    exec_p.add_argument("--dry-run", action="store_true", help="Run simulation only")
    exec_p.add_argument("--trigger-type", default="MANUAL", help="Trigger source (MANUAL, SCHEDULE, WATCHDOG)")

    subparsers.add_parser("stats", help="Get system and worker metrics")

    storage_p = subparsers.add_parser("storage", help="Query or mutate local storage entities")
    storage_p.add_argument("--action", required=True, help="Storage action to perform")
    storage_p.add_argument("--id", help="Entity ID")
    storage_p.add_argument("--data", help="JSON data payload")
    storage_p.add_argument("--limit", type=int, default=100, help="Query limit")
    storage_p.add_argument("--active", help="Active boolean state ('true' or 'false')")

    args = parser.parse_args()

    if args.subcommand == "server" or len(sys.argv) == 1:
        run_stdio_server()
    elif args.subcommand == "compile":
        engine = GhostPilotEngine()
        plan = engine.compile_prompt(args.prompt)
        print(json.dumps(plan, indent=2))
    elif args.subcommand == "execute":
        engine = GhostPilotEngine()
        plan = None
        if args.plan:
            raw = args.plan.strip()
            try:
                plan = json.loads(raw)
            except Exception:
                if (raw.startswith("'") and raw.endswith("'")) or (raw.startswith('"') and raw.endswith('"')):
                    raw = raw[1:-1]
                if '\\"' in raw:
                    raw = raw.replace('\\"', '"')
                plan = json.loads(raw)
        elif args.plan_file:
            with open(args.plan_file, "r") as f:
                plan = json.load(f)
        if not plan:
            print(json.dumps({"error": "No plan provided"}))
            sys.exit(1)
        res = engine.execute_workflow(plan, dry_run=args.dry_run, trigger_type=args.trigger_type)
        print(json.dumps(res, indent=2))
    elif args.subcommand == "stats":
        metrics = ProcessService.get_system_metrics()
        print(json.dumps(metrics, indent=2))
    elif args.subcommand == "storage":
        from storage import StorageManager
        sm = StorageManager()
        action = args.action

        def parse_data(raw_val):
            if not raw_val:
                return {}
            v = raw_val.strip()
            try:
                return json.loads(v)
            except Exception:
                if (v.startswith("'") and v.endswith("'")) or (v.startswith('"') and v.endswith('"')):
                    v = v[1:-1]
                if '\\"' in v:
                    v = v.replace('\\"', '"')
                return json.loads(v)

        if action == "list_workflows":
            print(json.dumps(sm.list_workflows()))
        elif action == "save_workflow":
            data = parse_data(args.data)
            wid = sm.save_workflow(data)
            print(json.dumps({"id": wid}))
        elif action == "delete_workflow":
            deleted = sm.delete_workflow(args.id)
            print(json.dumps({"deleted": deleted}))
        elif action == "list_watchdogs":
            print(json.dumps(sm.list_watchdogs()))
        elif action == "save_watchdog":
            data = parse_data(args.data)
            wid = sm.save_watchdog(data)
            print(json.dumps({"id": wid}))
        elif action == "toggle_watchdog":
            is_active = str(args.active).lower() in ("true", "1")
            sm.toggle_watchdog(args.id, is_active)
            print(json.dumps({"id": args.id, "active": is_active}))
        elif action == "list_schedules":
            print(json.dumps(sm.list_schedules()))
        elif action == "save_schedule":
            data = parse_data(args.data)
            sid = sm.save_schedule(data)
            print(json.dumps({"id": sid}))
        elif action == "toggle_schedule":
            is_active = str(args.active).lower() in ("true", "1")
            sm.toggle_schedule(args.id, is_active)
            print(json.dumps({"id": args.id, "active": is_active}))
        elif action == "list_audit_logs":
            print(json.dumps(sm.list_audit_logs(limit=args.limit)))
        elif action == "clear_audit_logs":
            cleared = sm.clear_audit_logs()
            print(json.dumps({"cleared": cleared}))
        elif action == "get_settings":
            print(json.dumps(sm.get_settings()))
        elif action == "update_settings":
            data = parse_data(args.data)
            sm.update_settings(data)
            print(json.dumps({"updated": True}))
        else:
            print(json.dumps({"error": f"Unknown storage action: {action}"}))
            sys.exit(1)

if __name__ == "__main__":
    main()
