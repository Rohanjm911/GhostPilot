"""
GhostPilot Core Automation Execution Engine
Coordinates compilers, watchdog observers, schedulers, and executes step-by-step actions.
Handles both real execution and dry-run simulation mode.
"""

import os
import re
import sys
import glob
import time
import shutil
import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional

from storage import StorageManager
from safety import SafetySandbox
from compiler import PromptCompiler
from watchdog_service import WatchdogService
from scheduler_service import SchedulerService
from process_service import ProcessService
from gui_macro_service import GuiMacroService

class GhostPilotEngine:
    def __init__(self, db_path: Optional[str] = None, enable_background_workers: bool = False):
        self.storage = StorageManager(db_path)
        self.settings = self.storage.get_settings()
        self.compiler = PromptCompiler(self.settings)

        self.watchdog_service = WatchdogService(self._on_watchdog_event)
        self.scheduler_service = SchedulerService(self._on_schedule_fired)
        
        if enable_background_workers:
            self.scheduler_service.start()
            self._init_active_services()

    def reload_settings(self):
        self.settings = self.storage.get_settings()
        self.compiler = PromptCompiler(self.settings)

    def _init_active_services(self):
        """Loads and activates active watchdogs and schedules on engine start."""
        for wd in self.storage.list_watchdogs():
            if wd.get("active"):
                self.watchdog_service.start_watch(wd)

        for sched in self.storage.list_schedules():
            if sched.get("active"):
                self.scheduler_service.register_job(sched)

    def _on_watchdog_event(self, watchdog_id: str, event_type: str, file_path: str):
        """Callback when a watched directory event fires."""
        self.storage.increment_watchdog_trigger(watchdog_id)
        
        wds = self.storage.list_watchdogs()
        matched = next((w for w in wds if w["id"] == watchdog_id), None)
        if matched and matched.get("workflow_id"):
            wf = self.storage.get_workflow(matched["workflow_id"])
            if wf:
                import json
                try:
                    plan = json.loads(wf["plan_json"])
                    self.execute_workflow(plan, dry_run=False, trigger_type="WATCHDOG")
                except Exception:
                    pass

    def _on_schedule_fired(self, schedule_id: str):
        """Callback when a scheduled job triggers."""
        scheds = self.storage.list_schedules()
        matched = next((s for s in scheds if s["id"] == schedule_id), None)
        if matched and matched.get("workflow_id"):
            wf = self.storage.get_workflow(matched["workflow_id"])
            if wf:
                import json
                try:
                    plan = json.loads(wf["plan_json"])
                    self.execute_workflow(plan, dry_run=False, trigger_type="SCHEDULE")
                except Exception:
                    pass

    def compile_prompt(self, prompt: str) -> Dict[str, Any]:
        """Compiles a user prompt into a structured plan with risk metrics."""
        self.reload_settings()
        return self.compiler.compile(prompt)

    def execute_workflow(self, plan: Dict[str, Any], dry_run: bool = False, trigger_type: str = "MANUAL") -> Dict[str, Any]:
        """
        Executes a workflow plan (or runs dry-run simulation if dry_run=True).
        Returns execution results and logs entry into the SQLite audit table.
        """
        start_time = time.time()
        workflow_title = plan.get("title", "Unnamed Workflow")

        if dry_run:
            sim_result = SafetySandbox.simulate_plan(plan)
            duration_ms = int((time.time() - start_time) * 1000)

            self.storage.add_audit_log({
                "trigger_type": trigger_type,
                "workflow_name": workflow_title,
                "status": "SIMULATED",
                "risk_level": sim_result["risk_assessment"]["overall_risk"],
                "affected_files_count": sim_result["total_affected_count"],
                "duration_ms": duration_ms,
                "details": {
                    "simulation": True,
                    "preview": sim_result["affected_items_preview"],
                    "steps": sim_result["steps"],
                    "logs": sim_result["simulation_logs"]
                }
            })

            return {
                "success": True,
                "dry_run": True,
                "workflow_title": workflow_title,
                "duration_ms": duration_ms,
                "simulation": sim_result
            }

        eval_result = SafetySandbox.evaluate_plan(plan)
        risk_level = eval_result["overall_risk"]

        executed_steps = []
        total_affected_files = 0
        execution_errors = []

        try:
            for idx, action in enumerate(plan.get("actions", [])):
                act_type = action.get("type", "").upper()
                step_title = action.get("title", f"Step {idx+1}")
                result = self._execute_action_step(action)

                total_affected_files += result.get("affected_count", 0)
                executed_steps.append({
                    "step_index": idx + 1,
                    "title": step_title,
                    "type": act_type,
                    "success": result.get("success", True),
                    "message": result.get("message", ""),
                    "affected_count": result.get("affected_count", 0)
                })

                if not result.get("success", True) and result.get("error"):
                    execution_errors.append(result["error"])

            duration_ms = int((time.time() - start_time) * 1000)
            overall_success = len(execution_errors) == 0

            self.storage.add_audit_log({
                "trigger_type": trigger_type,
                "workflow_name": workflow_title,
                "status": "SUCCESS" if overall_success else "FAILED",
                "risk_level": risk_level,
                "affected_files_count": total_affected_files,
                "duration_ms": duration_ms,
                "details": {
                    "dry_run": False,
                    "steps": executed_steps,
                    "errors": execution_errors
                }
            })

            return {
                "success": overall_success,
                "dry_run": False,
                "workflow_title": workflow_title,
                "affected_files_count": total_affected_files,
                "duration_ms": duration_ms,
                "steps": executed_steps,
                "errors": execution_errors
            }

        except Exception as ex:
            duration_ms = int((time.time() - start_time) * 1000)
            self.storage.add_audit_log({
                "trigger_type": trigger_type,
                "workflow_name": workflow_title,
                "status": "FAILED",
                "risk_level": risk_level,
                "affected_files_count": total_affected_files,
                "duration_ms": duration_ms,
                "details": {"error": str(ex), "steps": executed_steps}
            })
            return {
                "success": False,
                "dry_run": False,
                "workflow_title": workflow_title,
                "error": str(ex),
                "duration_ms": duration_ms,
                "steps": executed_steps
            }

    def _execute_action_step(self, action: Dict[str, Any]) -> Dict[str, Any]:
        """Dispatches an individual action step."""
        act_type = action.get("type", "").upper()

        if act_type == "SCAN_FILES":
            source = os.path.expandvars(action.get("path") or action.get("source") or "")
            filters = action.get("filter") or ["*.*"]
            if isinstance(filters, str):
                filters = [filters]
            found = []
            if os.path.exists(source):
                for flt in filters:
                    for f in glob.glob(os.path.join(source, flt)):
                        if os.path.isfile(f):
                            found.append(f)
            return {"success": True, "affected_count": len(found), "message": f"Found {len(found)} matching files in '{source}'."}

        elif act_type == "CREATE_DIR":
            dirs = action.get("params", {}).get("dirs")
            if not dirs:
                dirs = [action.get("path")]
            created = 0
            for d in dirs:
                if d:
                    target = os.path.expandvars(d)
                    if not os.path.exists(target):
                        os.makedirs(target, exist_ok=True)
                        created += 1
            return {"success": True, "affected_count": created, "message": f"Created {created} directory structure(s)."}

        elif act_type in ["ORGANIZE_FILES", "MOVE_FILES"]:
            source = os.path.expandvars(action.get("source") or action.get("path") or "")
            rules = action.get("rules", [])
            moved_count = 0

            if not os.path.exists(source):
                return {"success": False, "error": f"Source directory '{source}' does not exist."}

            ext_map = {}
            for r in rules:
                ext = r.get("extension", "").lower().lstrip(".")
                tgt = os.path.expandvars(r.get("target", ""))
                if ext and tgt:
                    os.makedirs(tgt, exist_ok=True)
                    ext_map[ext] = tgt

            for item in os.listdir(source):
                full_path = os.path.join(source, item)
                if os.path.isfile(full_path):
                    ext = item.split(".")[-1].lower() if "." in item else ""
                    dest_folder = ext_map.get(ext) or ext_map.get("*")
                    if dest_folder and os.path.abspath(source) != os.path.abspath(dest_folder):
                        dest_path = os.path.join(dest_folder, item)
                        if os.path.exists(dest_path):
                            base, fext = os.path.splitext(item)
                            ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
                            dest_path = os.path.join(dest_folder, f"{base}_{ts}{fext}")
                        shutil.move(full_path, dest_path)
                        moved_count += 1

            return {"success": True, "affected_count": moved_count, "message": f"Organized {moved_count} file(s) into subdirectories."}

        elif act_type == "BATCH_RENAME":
            target_dir = os.path.expandvars(action.get("path") or "")
            filters = action.get("filter") or ["*.*"]
            if isinstance(filters, str):
                filters = [filters]
            renamed = 0

            if os.path.exists(target_dir):
                today_str = datetime.date.today().strftime("%Y-%m-%d")
                for flt in filters:
                    for f in glob.glob(os.path.join(target_dir, flt)):
                        if os.path.isfile(f):
                            orig_name = os.path.basename(f)
                            if not orig_name.startswith(today_str):
                                new_name = f"{today_str}_{orig_name}"
                                new_path = os.path.join(target_dir, new_name)
                                if not os.path.exists(new_path):
                                    os.rename(f, new_path)
                                    renamed += 1

            return {"success": True, "affected_count": renamed, "message": f"Renamed {renamed} file(s)."}

        elif act_type == "CLEAN_TEMP_FILES":
            target = os.path.expandvars(action.get("path") or os.environ.get("TEMP", ""))
            cleaned = 0
            if os.path.exists(target):
                for f in glob.glob(os.path.join(target, "*")):
                    if os.path.isfile(f):
                        try:
                            mtime = os.path.getmtime(f)
                            if (time.time() - mtime) > 21600:
                                os.remove(f)
                                cleaned += 1
                        except Exception:
                            continue
            return {"success": True, "affected_count": cleaned, "message": f"Cleaned {cleaned} temporary files."}

        elif act_type == "LAUNCH_APP":
            cmd = action.get("params", {}).get("command") or action.get("path") or "notepad"
            ok = GuiMacroService.launch_app(cmd)
            return {"success": ok, "affected_count": 1 if ok else 0, "message": f"Launched application: {cmd}"}

        elif act_type == "KILL_PROCESS":
            proc_name = action.get("params", {}).get("process_name") or action.get("process_name", "")
            res = ProcessService.terminate_process_by_name(proc_name)
            return {"success": res.get("success", False), "affected_count": res.get("terminated_count", 0), "message": f"Terminated {res.get('terminated_count', 0)} instance(s) of {proc_name}."}

        elif act_type == "GUI_HOTKEY":
            keys = action.get("params", {}).get("keys", ["win", "d"])
            ok = GuiMacroService.press_hotkey(keys)
            return {"success": ok, "affected_count": 0, "message": f"Pressed hotkey: {'+'.join(keys)}"}

        elif act_type == "NOTIFICATION":
            return {"success": True, "affected_count": 0, "message": action.get("params", {}).get("message", "Task completed.")}

        return {"success": True, "affected_count": 0, "message": f"Step {act_type} completed."}
