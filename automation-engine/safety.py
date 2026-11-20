"""
GhostPilot Safety Sandbox & Risk Assessment Engine
Analyzes compiled execution plans, classifies risk levels, detects destructive commands,
and provides dry-run simulation mode before executing OS-level changes.
"""

import os
import re
import glob
from pathlib import Path
from typing import Dict, List, Any, Tuple

# System protected paths where modification is dangerous
RESTRICTED_SYSTEM_PATHS = [
    r"^[a-zA-Z]:\\Windows.*",
    r"^[a-zA-Z]:\\System Volume Information.*",
    r"^[a-zA-Z]:\\Program Files.*",
    r"^[a-zA-Z]:\\Program Files \(x86\).*",
    r"^[a-zA-Z]:\\Recovery.*",
    r"^[a-zA-Z]:\\boot.*",
    r"^[a-zA-Z]:\\pagefile\.sys$",
]

DESTRUCTIVE_COMMAND_KEYWORDS = [
    "format", "del /f", "rmdir /s", "remove-item -recurse -force",
    "reg delete", "diskpart", "shutdown", "takeown", "icacls",
    "taskkill /f /im svchost", "taskkill /f /im explorer", "kill -9"
]

class SafetySandbox:
    @staticmethod
    def is_restricted_path(path_str: str) -> bool:
        """Check if path points to a sensitive Windows system directory."""
        if not path_str:
            return False
        normalized = os.path.abspath(os.path.expandvars(path_str)).replace("/", "\\")
        for pattern in RESTRICTED_SYSTEM_PATHS:
            if re.match(pattern, normalized, re.IGNORECASE):
                return True
        # Check if attempting to operate directly on drive root
        if re.match(r"^[a-zA-Z]:\\?$", normalized):
            return True
        return False

    @classmethod
    def evaluate_action_risk(cls, action: Dict[str, Any]) -> Tuple[str, List[str]]:
        """
        Evaluates a single action and returns (risk_level, list_of_reasons).
        Levels: 'SAFE', 'ELEVATED', 'HIGH_RISK'
        """
        reasons = []
        act_type = action.get("type", "").upper()
        target_path = action.get("path") or action.get("source") or ""

        # Check for system paths
        if cls.is_restricted_path(target_path):
            reasons.append(f"Target path '{target_path}' resides in a protected Windows system directory.")
            return "HIGH_RISK", reasons

        # Action-specific risk checks
        if act_type in ["DELETE_FILES", "PERMANENT_DELETE", "PURGE"]:
            params = action.get("params", {})
            reasons.append("Action permanently deletes files or folders from the disk.")
            if params.get("recursive") or "*" in str(action.get("filter", "")):
                reasons.append("Wildcard recursive deletion detected.")
                return "HIGH_RISK", reasons
            return "HIGH_RISK", reasons

        if act_type in ["KILL_PROCESS", "TERMINATE_PROCESS"]:
            proc_name = action.get("process_name", "") or action.get("params", {}).get("process_name", "")
            if proc_name.lower() in ["svchost.exe", "explorer.exe", "csrss.exe", "winlogon.exe", "system"]:
                reasons.append(f"Attempting to terminate critical Windows process '{proc_name}'.")
                return "HIGH_RISK", reasons
            reasons.append(f"Action terminates running process '{proc_name}'.")
            return "ELEVATED", reasons

        if act_type in ["EXECUTE_COMMAND", "POWERSHELL_SCRIPT", "CMD_SCRIPT"]:
            command = action.get("command", "") or action.get("script", "")
            lower_cmd = command.lower()
            for kw in DESTRUCTIVE_COMMAND_KEYWORDS:
                if kw in lower_cmd:
                    reasons.append(f"Detected destructive command pattern '{kw}'.")
                    return "HIGH_RISK", reasons
            reasons.append("Arbitrary script/command execution requires user confirmation.")
            return "ELEVATED", reasons

        if act_type in ["BATCH_RENAME", "MOVE_FILES", "ORGANIZE_FILES"]:
            params = action.get("params", {})
            if params.get("overwrite", False):
                reasons.append("Overwrite option is enabled; files might be replaced.")
                return "ELEVATED", reasons
            return "SAFE", []

        if act_type in ["CLEAN_TEMP_FILES"]:
            # Temp cleanup is safe if restricted to standard user Temp
            user_temp = os.environ.get("TEMP", "").lower()
            if target_path and target_path.lower() not in user_temp:
                reasons.append(f"Cleaning non-standard temporary folder '{target_path}'.")
                return "ELEVATED", reasons
            return "SAFE", ["Standard temporary folder cleanup."]

        if act_type in ["SCAN_FILES", "CREATE_DIR", "NOTIFICATION", "LAUNCH_APP", "GUI_HOTKEY"]:
            return "SAFE", []

        return "SAFE", []

    @classmethod
    def evaluate_plan(cls, plan: Dict[str, Any]) -> Dict[str, Any]:
        """
        Evaluates an entire workflow plan and returns combined risk metrics.
        """
        actions = plan.get("actions", [])
        overall_risk = "SAFE"
        all_reasons = []

        for idx, act in enumerate(actions):
            level, reasons = cls.evaluate_action_risk(act)
            if reasons:
                all_reasons.extend([f"Step {idx+1} ({act.get('title', act.get('type'))}): {r}" for r in reasons])
            
            if level == "HIGH_RISK":
                overall_risk = "HIGH_RISK"
            elif level == "ELEVATED" and overall_risk != "HIGH_RISK":
                overall_risk = "ELEVATED"

        return {
            "overall_risk": overall_risk,
            "reasons": all_reasons,
            "requires_confirmation": overall_risk in ["ELEVATED", "HIGH_RISK"]
        }

    @classmethod
    def simulate_plan(cls, plan: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes a dry-run simulation of the plan:
        - Resolves real Windows paths.
        - Scans directories in read-only mode to count affected files.
        - Generates step-by-step preview messages and logs without modifying the disk.
        """
        eval_result = cls.evaluate_plan(plan)
        actions = plan.get("actions", [])
        
        simulated_steps = []
        affected_items = []
        total_affected_count = 0
        total_bytes_affected = 0
        simulation_logs = []

        simulation_logs.append(f"[SIMULATION START] Plan: '{plan.get('title', 'Workflow')}' | Risk Assessment: {eval_result['overall_risk']}")

        for idx, act in enumerate(actions):
            act_type = act.get("type", "").upper()
            step_title = act.get("title", f"Step {idx+1}")
            step_summary = {"step_index": idx + 1, "title": step_title, "type": act_type, "items_count": 0, "preview": ""}

            if act_type in ["SCAN_FILES", "ORGANIZE_FILES", "MOVE_FILES", "BATCH_RENAME"]:
                source_dir = os.path.expandvars(act.get("source") or act.get("path") or "")
                filters = act.get("filter") or ["*.*"]
                if isinstance(filters, str):
                    filters = [filters]

                matching_files = []
                if os.path.exists(source_dir):
                    for flt in filters:
                        pattern = os.path.join(source_dir, flt)
                        found = glob.glob(pattern)
                        for f in found:
                            if os.path.isfile(f):
                                try:
                                    sz = os.path.getsize(f)
                                    matching_files.append({"path": f, "name": os.path.basename(f), "size": sz})
                                    total_bytes_affected += sz
                                except Exception:
                                    pass

                count = len(matching_files)
                total_affected_count += count
                step_summary["items_count"] = count
                step_summary["preview"] = f"Identified {count} matching files in '{source_dir}'."
                simulation_logs.append(f"[STEP {idx+1}] {act_type}: {count} files matched filters {filters} in {source_dir}")

                for item in matching_files[:10]:
                    affected_items.append(item["path"])
                if count > 10:
                    affected_items.append(f"... and {count - 10} more files")

            elif act_type == "CREATE_DIR":
                target_dir = os.path.expandvars(act.get("path") or "")
                exists = os.path.exists(target_dir)
                step_summary["preview"] = f"Target directory already exists: {exists}. Would create '{target_dir}' if missing."
                simulation_logs.append(f"[STEP {idx+1}] CREATE_DIR: Target '{target_dir}' (Exists: {exists})")

            elif act_type in ["DELETE_FILES", "CLEAN_TEMP_FILES"]:
                target_dir = os.path.expandvars(act.get("path") or os.environ.get("TEMP", ""))
                temp_files = []
                if os.path.exists(target_dir):
                    for f in glob.glob(os.path.join(target_dir, "*")):
                        if os.path.isfile(f):
                            temp_files.append(f)
                count = len(temp_files)
                total_affected_count += count
                step_summary["items_count"] = count
                step_summary["preview"] = f"[DRY-RUN] Would remove {count} candidate files in '{target_dir}'."
                simulation_logs.append(f"[STEP {idx+1}] {act_type}: Dry-run identified {count} files for potential removal.")

            elif act_type in ["LAUNCH_APP", "GUI_HOTKEY"]:
                step_summary["preview"] = f"Simulation: Would execute GUI command / launch '{act.get('params', {})}'."
                simulation_logs.append(f"[STEP {idx+1}] {act_type}: GUI action simulated.")

            else:
                step_summary["preview"] = f"Action '{act_type}' validated for execution."
                simulation_logs.append(f"[STEP {idx+1}] {act_type}: Action verified.")

            simulated_steps.append(step_summary)

        simulation_logs.append(f"[SIMULATION COMPLETED] Total affected items: {total_affected_count}. Safe simulation finished without modifying any files.")

        return {
            "risk_assessment": eval_result,
            "total_affected_count": total_affected_count,
            "total_bytes_affected": total_bytes_affected,
            "affected_items_preview": affected_items,
            "steps": simulated_steps,
            "simulation_logs": simulation_logs
        }
