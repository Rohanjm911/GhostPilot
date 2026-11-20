"""
GhostPilot AI / Prompt Compiler Engine
Converts natural language instructions into structured, deterministic Windows 11 execution plans.
Supports:
1. Local Ollama (e.g. qwen2.5-coder, llama3.2)
2. Cloud LLMs (OpenAI / Gemini API)
3. Offline Deterministic Rule-Based Heuristic Compiler (100% functional without external network/keys)
"""

import os
import re
import json
import time
import urllib.request
import urllib.error
from pathlib import Path
from typing import Dict, List, Any, Optional

from safety import SafetySandbox

SYSTEM_PROMPT = """You are GhostPilot's core Windows 11 automation compiler.
Your task is to convert the user's natural language request into a strictly structured JSON execution plan.
Target OS: Windows 11 x64.

Always respond with ONLY valid JSON (no markdown formatting, no commentary).
The JSON must follow this exact schema:
{
  "id": "wf_<unique_hash>",
  "title": "<Short punchy action title>",
  "description": "<Detailed explanation of what this workflow does>",
  "trigger": {
    "type": "MANUAL" | "SCHEDULED" | "WATCHDOG",
    "expression": "<cron/interval expression or folder pattern>",
    "path": "<folder path if watchdog>"
  },
  "risk_level": "SAFE" | "ELEVATED" | "HIGH_RISK",
  "actions": [
    {
      "id": "step_1",
      "type": "SCAN_FILES" | "CREATE_DIR" | "MOVE_FILES" | "ORGANIZE_FILES" | "BATCH_RENAME" | "CLEAN_TEMP_FILES" | "LAUNCH_APP" | "KILL_PROCESS" | "GUI_HOTKEY" | "EXECUTE_COMMAND",
      "title": "<Human-readable title>",
      "path": "<Windows path with forward slashes or escaped backslashes>",
      "source": "<source directory if moving>",
      "destination": "<target directory>",
      "filter": ["*.pdf", "*.zip"],
      "params": {}
    }
  ]
}
"""

def get_windows_user_paths() -> Dict[str, str]:
    """Returns canonical Windows user directory paths."""
    home = Path.home()
    return {
        "home": str(home).replace("\\", "/"),
        "downloads": str(home / "Downloads").replace("\\", "/"),
        "desktop": str(home / "Desktop").replace("\\", "/"),
        "documents": str(home / "Documents").replace("\\", "/"),
        "pictures": str(home / "Pictures").replace("\\", "/"),
        "videos": str(home / "Videos").replace("\\", "/"),
        "music": str(home / "Music").replace("\\", "/"),
        "temp": os.environ.get("TEMP", "C:/Users/AppData/Local/Temp").replace("\\", "/"),
    }

class PromptCompiler:
    def __init__(self, settings: Optional[Dict[str, Any]] = None):
        self.settings = settings or {}

    def compile(self, prompt: str) -> Dict[str, Any]:
        """
        Compiles natural language prompt into a structured workflow plan.
        Tries chosen LLM provider, and seamlessly falls back to the deterministic heuristic engine.
        """
        provider = self.settings.get("llm_provider", "ollama")
        prompt = prompt.strip()

        # Try LLM provider if configured
        plan = None
        if provider == "ollama":
            plan = self._call_ollama(prompt)
        elif provider == "openai":
            plan = self._call_openai(prompt)
        elif provider == "gemini":
            plan = self._call_gemini(prompt)

        # If LLM didn't return or was unavailable, use deterministic rule-based heuristic compiler
        if not plan:
            plan = self.compile_heuristic(prompt)

        # Validate risk and attach sandbox assessment
        eval_result = SafetySandbox.evaluate_plan(plan)
        plan["risk_level"] = eval_result["overall_risk"]
        plan["risk_assessment"] = eval_result
        return plan

    def _call_ollama(self, prompt: str) -> Optional[Dict[str, Any]]:
        """Call local Ollama endpoint if running."""
        import socket
        host = self.settings.get("ollama_host", "http://localhost:11434").rstrip("/")
        model = self.settings.get("ollama_model", "qwen2.5-coder")
        
        # Fast probe check (100ms) to see if Ollama port is open
        try:
            # Parse host and port
            from urllib.parse import urlparse
            parsed = urlparse(host)
            h = parsed.hostname or "127.0.0.1"
            p = parsed.port or 11434
            with socket.create_connection((h, p), timeout=0.2):
                pass
        except Exception:
            # Port closed or Ollama not running; instantly skip
            return None

        url = f"{host}/api/generate"
        payload = {
            "model": model,
            "system": SYSTEM_PROMPT,
            "prompt": f"Compile this Windows 11 automation request: '{prompt}'",
            "stream": False,
            "format": "json"
        }

        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=3) as resp:
                result = json.loads(resp.read().decode("utf-8"))
                response_text = result.get("response", "")
                return self._clean_and_parse_json(response_text)
        except Exception:
            return None

    def _call_openai(self, prompt: str) -> Optional[Dict[str, Any]]:
        """Call OpenAI endpoint."""
        api_key = self.settings.get("openai_api_key", "").strip()
        if not api_key:
            return None

        model = self.settings.get("openai_model", "gpt-4o-mini")
        url = "https://api.openai.com/v1/chat/completions"

        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Compile this Windows 11 automation request: '{prompt}'"}
            ],
            "response_format": {"type": "json_object"}
        }

        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}"
                },
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=12) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                content = data["choices"][0]["message"]["content"]
                return self._clean_and_parse_json(content)
        except Exception:
            return None

    def _call_gemini(self, prompt: str) -> Optional[Dict[str, Any]]:
        """Call Gemini API endpoint."""
        api_key = self.settings.get("gemini_api_key", "").strip()
        if not api_key:
            return None
        model = self.settings.get("gemini_model", "gemini-2.0-flash")
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": f"{SYSTEM_PROMPT}\n\nCompile this request: {prompt}"}
                    ]
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json"
            }
        }

        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=12) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                return self._clean_and_parse_json(text)
        except Exception:
            return None

    def _clean_and_parse_json(self, text: str) -> Optional[Dict[str, Any]]:
        """Strip markdown fences and parse JSON."""
        cleaned = re.sub(r"^```(?:json)?\s*", "", text.strip(), flags=re.MULTILINE)
        cleaned = re.sub(r"```$", "", cleaned.strip(), flags=re.MULTILINE).strip()
        try:
            return json.loads(cleaned)
        except Exception:
            return None

    def compile_heuristic(self, prompt: str) -> Dict[str, Any]:
        """
        High-precision deterministic rule-based NLP compiler for Windows 11.
        Understands intent, target paths, schedules, file filters, and generates valid execution plans.
        """
        user_paths = get_windows_user_paths()
        p_lower = prompt.lower()
        now_ts = int(time.time())

        # Determine target base path
        base_path = user_paths["downloads"]
        folder_label = "Downloads"
        if "desktop" in p_lower:
            base_path = user_paths["desktop"]
            folder_label = "Desktop"
        elif "document" in p_lower:
            base_path = user_paths["documents"]
            folder_label = "Documents"
        elif "picture" in p_lower or "photo" in p_lower:
            base_path = user_paths["pictures"]
            folder_label = "Pictures"
        elif "temp" in p_lower:
            base_path = user_paths["temp"]
            folder_label = "Temp"

        # Determine trigger type
        trigger = {"type": "MANUAL", "expression": "1-click execution"}
        if "every night at" in p_lower or "daily at" in p_lower or "at 10 pm" in p_lower or "at 22" in p_lower:
            time_match = re.search(r"(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)", p_lower)
            time_str = time_match.group(1) if time_match else "22:00"
            trigger = {"type": "SCHEDULED", "expression": f"Daily at {time_str}"}
        elif "every" in p_lower and ("minute" in p_lower or "hour" in p_lower or "day" in p_lower):
            interval_match = re.search(r"every\s+(\d+)?\s*(minute|hour|day)s?", p_lower)
            if interval_match:
                qty = interval_match.group(1) or "1"
                unit = interval_match.group(2)
                trigger = {"type": "SCHEDULED", "expression": f"Every {qty} {unit}s"}
        elif "when" in p_lower and ("added" in p_lower or "created" in p_lower or "new file" in p_lower or "modified" in p_lower):
            trigger = {"type": "WATCHDOG", "expression": "*.pdf, *.zip", "path": base_path}

        # Recognize file extensions mentioned
        filters = []
        ext_map = {
            "pdf": "*.pdf",
            "zip": "*.zip",
            "rar": "*.rar",
            "7z": "*.7z",
            "tar": "*.tar.gz",
            "installer": "*.exe",
            "exe": "*.exe",
            "msi": "*.msi",
            "image": "*.png, *.jpg, *.jpeg, *.webp",
            "png": "*.png",
            "jpg": "*.jpg",
            "jpeg": "*.jpeg",
            "csv": "*.csv",
            "excel": "*.xlsx, *.xls",
            "word": "*.docx, *.doc",
            "video": "*.mp4, *.mkv",
            "audio": "*.mp3, *.wav"
        }
        for kw, ext_pattern in ext_map.items():
            if kw in p_lower:
                for ep in ext_pattern.split(", "):
                    if ep not in filters:
                        filters.append(ep)

        if not filters:
            if "screenshot" in p_lower:
                filters = ["*.png", "*.jpg"]
            elif "temp" in p_lower:
                filters = ["*.tmp", "*.log", "*.*"]
            else:
                filters = ["*.pdf", "*.zip"]

        # CASE 1: Organize / Sort into subfolders
        if any(w in p_lower for w in ["organize", "sort", "categorize", "separate"]):
            rules = []
            subdirs = []
            if any("pdf" in f for f in filters):
                subdirs.append(f"{base_path}/PDFs")
                rules.append({"extension": "pdf", "target": f"{base_path}/PDFs"})
            if any("zip" in f for f in filters) or any("rar" in f for f in filters):
                subdirs.append(f"{base_path}/Archives")
                rules.append({"extension": "zip", "target": f"{base_path}/Archives"})
                rules.append({"extension": "rar", "target": f"{base_path}/Archives"})
            if any("exe" in f for f in filters) or any("msi" in f for f in filters):
                subdirs.append(f"{base_path}/Installers")
                rules.append({"extension": "exe", "target": f"{base_path}/Installers"})
            if any("png" in f or "jpg" in f for f in filters):
                subdirs.append(f"{base_path}/Images")
                rules.append({"extension": "png", "target": f"{base_path}/Images"})
                rules.append({"extension": "jpg", "target": f"{base_path}/Images"})

            if not rules:
                subdirs = [f"{base_path}/Organized"]
                rules = [{"extension": "*", "target": f"{base_path}/Organized"}]

            return {
                "id": f"wf_org_{now_ts}",
                "title": f"Organize {folder_label} ({', '.join(filters)})",
                "description": f"Scans {folder_label} and sorts matching files into dedicated subfolders with safe collision resolution.",
                "trigger": trigger,
                "risk_level": "SAFE",
                "actions": [
                    {
                        "id": "act_1",
                        "type": "SCAN_FILES",
                        "title": f"Scan {folder_label} for {', '.join(filters)}",
                        "path": base_path,
                        "filter": filters,
                        "params": {}
                    },
                    {
                        "id": "act_2",
                        "type": "CREATE_DIR",
                        "title": "Ensure destination subfolders exist",
                        "path": subdirs[0],
                        "params": {"dirs": subdirs}
                    },
                    {
                        "id": "act_3",
                        "type": "ORGANIZE_FILES",
                        "title": "Sort files into designated folders",
                        "source": base_path,
                        "rules": rules,
                        "params": {"safe_conflict_resolution": "rename"}
                    }
                ]
            }

        # CASE 2: Clean up temporary files
        if any(w in p_lower for w in ["clean", "cleanup", "purge", "clear temp", "empty temp"]):
            target = user_paths["temp"] if "temp" in p_lower else base_path
            return {
                "id": f"wf_clean_{now_ts}",
                "title": f"System Cleanup: {folder_label if 'temp' not in p_lower else 'Temp Files'}",
                "description": f"Safely scans and removes temporary cached files and logs older than 24 hours.",
                "trigger": trigger,
                "risk_level": "ELEVATED",
                "actions": [
                    {
                        "id": "act_1",
                        "type": "SCAN_FILES",
                        "title": f"Scan {target} for temporary files",
                        "path": target,
                        "filter": ["*.tmp", "*.log", "*.bak"],
                        "params": {"min_age_hours": 24}
                    },
                    {
                        "id": "act_2",
                        "type": "CLEAN_TEMP_FILES",
                        "title": "Purge temporary and obsolete files",
                        "path": target,
                        "filter": ["*.tmp", "*.log", "*.bak"],
                        "params": {"min_age_hours": 24}
                    }
                ]
            }

        # CASE 3: Batch Rename
        if any(w in p_lower for w in ["rename", "batch rename", "prefix", "suffix"]):
            return {
                "id": f"wf_rename_{now_ts}",
                "title": f"Batch Rename Files in {folder_label}",
                "description": f"Renames files matching {', '.join(filters)} with standardized timestamped prefixes.",
                "trigger": trigger,
                "risk_level": "SAFE",
                "actions": [
                    {
                        "id": "act_1",
                        "type": "SCAN_FILES",
                        "title": f"Scan {folder_label} files",
                        "path": base_path,
                        "filter": filters,
                        "params": {}
                    },
                    {
                        "id": "act_2",
                        "type": "BATCH_RENAME",
                        "title": "Apply standardized naming convention",
                        "path": base_path,
                        "filter": filters,
                        "params": {"pattern": "{YYYY}-{MM}-{DD}_{orig_name}", "overwrite": False}
                    }
                ]
            }

        # CASE 4: App Launch / GUI macro
        if any(w in p_lower for w in ["launch", "open", "start", "run"]):
            apps = []
            if "code" in p_lower or "vs code" in p_lower:
                apps.append({"name": "Visual Studio Code", "cmd": "code"})
            if "spotify" in p_lower:
                apps.append({"name": "Spotify", "cmd": "spotify"})
            if "chrome" in p_lower or "browser" in p_lower:
                apps.append({"name": "Google Chrome", "cmd": "chrome"})
            if "notepad" in p_lower:
                apps.append({"name": "Notepad", "cmd": "notepad"})
            if not apps:
                apps.append({"name": "Application", "cmd": "notepad"})

            actions = []
            for idx, a in enumerate(apps):
                actions.append({
                    "id": f"act_{idx+1}",
                    "type": "LAUNCH_APP",
                    "title": f"Launch {a['name']}",
                    "params": {"command": a["cmd"]}
                })

            return {
                "id": f"wf_launch_{now_ts}",
                "title": f"Launch Work Environment ({', '.join([a['name'] for a in apps])})",
                "description": f"Launches specified Windows applications and arranges windows on desktop.",
                "trigger": trigger,
                "risk_level": "SAFE",
                "actions": actions
            }

        # CASE 5: Process Monitor / Kill
        if any(w in p_lower for w in ["kill", "terminate", "close process", "ram exceeds", "cpu exceeds"]):
            target_proc = "node.exe"
            if "chrome" in p_lower:
                target_proc = "chrome.exe"
            elif "python" in p_lower:
                target_proc = "python.exe"
            elif "teams" in p_lower:
                target_proc = "teams.exe"

            return {
                "id": f"wf_proc_{now_ts}",
                "title": f"Monitor and Manage Process ({target_proc})",
                "description": f"Monitors resource usage and safely closes unresponsive instances of {target_proc}.",
                "trigger": {"type": "WATCHDOG", "expression": "High Resource Threshold", "path": "ProcessMonitor"},
                "risk_level": "ELEVATED",
                "actions": [
                    {
                        "id": "act_1",
                        "type": "KILL_PROCESS",
                        "title": f"Terminate unresponsive {target_proc} instances",
                        "params": {"process_name": target_proc, "confirm_dialog": True}
                    }
                ]
            }

        # Fallback Generic Plan
        return {
            "id": f"wf_gen_{now_ts}",
            "title": f"Custom Automation: {prompt[:35]}...",
            "description": f"Deterministic execution plan compiled from user request: '{prompt}'.",
            "trigger": trigger,
            "risk_level": "SAFE",
            "actions": [
                {
                    "id": "act_1",
                    "type": "SCAN_FILES",
                    "title": f"Inspect target directory ({folder_label})",
                    "path": base_path,
                    "filter": filters,
                    "params": {}
                },
                {
                    "id": "act_2",
                    "type": "NOTIFICATION",
                    "title": "Windows System Notification",
                    "params": {"title": "GhostPilot Automation", "message": f"Successfully processed '{prompt}'"}
                }
            ]
        }
