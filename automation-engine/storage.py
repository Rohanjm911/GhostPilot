"""
GhostPilot SQLite Storage Layer
Persists workflows, active watchdogs, cron schedules, execution audit logs, and settings.
"""

import os
import json
import sqlite3
import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional

def get_db_path() -> Path:
    """Returns the persistent SQLite database path for GhostPilot."""
    appdata = os.getenv("APPDATA")
    if appdata:
        target_dir = Path(appdata) / "GhostPilot"
    else:
        target_dir = Path.home() / ".ghostpilot"
    
    try:
        target_dir.mkdir(parents=True, exist_ok=True)
        return target_dir / "ghostpilot.db"
    except Exception:
        # Fallback to local working directory
        local_dir = Path(__file__).parent
        return local_dir / "ghostpilot.db"

class StorageManager:
    def __init__(self, db_path: Optional[str] = None):
        self.db_path = Path(db_path) if db_path else get_db_path()
        self._init_db()

    def get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Workflows table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS workflows (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                prompt TEXT NOT NULL,
                plan_json TEXT NOT NULL,
                trigger_type TEXT DEFAULT 'MANUAL',
                trigger_meta TEXT DEFAULT '{}',
                risk_level TEXT DEFAULT 'SAFE',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """)

            # Watchdogs table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS watchdogs (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                watch_path TEXT NOT NULL,
                file_patterns TEXT NOT NULL,
                events TEXT NOT NULL, -- e.g. "created,modified"
                workflow_id TEXT,
                active INTEGER DEFAULT 1,
                trigger_count INTEGER DEFAULT 0,
                last_triggered_at TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE SET NULL
            )
            """)

            # Scheduled jobs table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS schedules (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                schedule_type TEXT NOT NULL, -- "INTERVAL" or "CRON"
                expression TEXT NOT NULL,     -- e.g. "every 10 minutes" or "22:00"
                workflow_id TEXT,
                active INTEGER DEFAULT 1,
                last_run_at TEXT,
                next_run_at TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE SET NULL
            )
            """)

            # Audit logs table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS audit_logs (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                trigger_type TEXT NOT NULL,  -- MANUAL, COMMAND_BAR, WATCHDOG, SCHEDULE
                workflow_name TEXT NOT NULL,
                status TEXT NOT NULL,        -- SUCCESS, FAILED, SIMULATED, REJECTED
                risk_level TEXT NOT NULL,    -- SAFE, ELEVATED, HIGH_RISK
                affected_files_count INTEGER DEFAULT 0,
                duration_ms INTEGER DEFAULT 0,
                details_json TEXT NOT NULL
            )
            """)

            # Settings table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
            """)

            conn.commit()
            self._seed_default_data(cursor, conn)

    def _seed_default_data(self, cursor: sqlite3.Cursor, conn: sqlite3.Connection):
        """Seed sample starter workflows if the table is empty."""
        cursor.execute("SELECT COUNT(*) FROM workflows")
        count = cursor.fetchone()[0]
        if count == 0:
            now = datetime.datetime.now(datetime.timezone.utc).isoformat()
            
            # 1. Downloads organizer
            downloads_path = str(Path.home() / "Downloads").replace("\\", "/")
            wf1_plan = {
                "id": "wf_downloads_organizer",
                "title": "Auto-Organize Downloads (PDFs, ZIPs, EXEs)",
                "description": "Scans Downloads folder and moves PDFs, ZIPs, and Installers into neatly organized subfolders.",
                "risk_level": "SAFE",
                "actions": [
                    {
                        "id": "act_1",
                        "type": "SCAN_FILES",
                        "title": "Scan Downloads folder",
                        "path": downloads_path,
                        "filter": ["*.pdf", "*.zip", "*.exe"],
                        "params": {}
                    },
                    {
                        "id": "act_2",
                        "type": "CREATE_DIR",
                        "title": "Ensure categorized subdirectories exist",
                        "path": f"{downloads_path}/PDFs",
                        "params": {"dirs": [f"{downloads_path}/PDFs", f"{downloads_path}/Archives", f"{downloads_path}/Installers"]}
                    },
                    {
                        "id": "act_3",
                        "type": "ORGANIZE_FILES",
                        "title": "Sort files into designated folders",
                        "source": downloads_path,
                        "rules": [
                            {"extension": "pdf", "target": f"{downloads_path}/PDFs"},
                            {"extension": "zip", "target": f"{downloads_path}/Archives"},
                            {"extension": "exe", "target": f"{downloads_path}/Installers"}
                        ],
                        "params": {"safe_conflict_resolution": "rename"}
                    }
                ]
            }

            cursor.execute("""
            INSERT INTO workflows (id, name, prompt, plan_json, trigger_type, trigger_meta, risk_level, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                "wf_downloads_organizer",
                "Organize Downloads by Filetype",
                "Organize all PDFs and ZIPs in my Downloads folder into separate subfolders every night at 10 PM",
                json.dumps(wf1_plan),
                "SCHEDULED",
                json.dumps({"expression": "22:00 daily"}),
                "SAFE",
                now,
                now
            ))

            # Sample schedule
            cursor.execute("""
            INSERT INTO schedules (id, name, schedule_type, expression, workflow_id, active, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                "sched_downloads_nightly",
                "Nightly Downloads Cleanup",
                "CRON",
                "Every day at 22:00",
                "wf_downloads_organizer",
                1,
                now
            ))

            # Sample watchdog
            cursor.execute("""
            INSERT INTO watchdogs (id, name, watch_path, file_patterns, events, workflow_id, active, trigger_count, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                "wd_downloads_live",
                "Downloads Watcher (PDFs & ZIPs)",
                downloads_path,
                "*.pdf, *.zip",
                "created",
                "wf_downloads_organizer",
                1,
                3,
                now
            ))

            # Sample initial audit log
            cursor.execute("""
            INSERT INTO audit_logs (id, timestamp, trigger_type, workflow_name, status, risk_level, affected_files_count, duration_ms, details_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                "log_init_sample",
                now,
                "MANUAL",
                "Organize Downloads by Filetype",
                "SUCCESS",
                "SAFE",
                8,
                142,
                json.dumps({
                    "message": "Organized 8 files (5 PDFs, 3 ZIP archives) into respective subfolders.",
                    "dry_run": False
                })
            ))

            # Default settings
            default_settings = {
                "llm_provider": "ollama",
                "ollama_host": "http://localhost:11434",
                "ollama_model": "qwen2.5-coder",
                "openai_api_key": "",
                "openai_model": "gpt-4o-mini",
                "gemini_api_key": "",
                "gemini_model": "gemini-2.0-flash",
                "safety_sandbox_level": "strict",
                "dry_run_default": False,
                "spotlight_hotkey": "Alt+Space",
                "autostart_on_login": True,
                "notify_on_completion": True
            }

            for k, v in default_settings.items():
                cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (k, json.dumps(v)))

            conn.commit()

    # --- Workflows CRUD ---
    def list_workflows(self) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM workflows ORDER BY created_at DESC")
            rows = cursor.fetchall()
            return [dict(row) for row in rows]

    def get_workflow(self, workflow_id: str) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM workflows WHERE id = ?", (workflow_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def save_workflow(self, workflow: Dict[str, Any]) -> str:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            now = datetime.datetime.now(datetime.timezone.utc).isoformat()
            cursor.execute("""
            INSERT OR REPLACE INTO workflows (id, name, prompt, plan_json, trigger_type, trigger_meta, risk_level, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                workflow["id"],
                workflow["name"],
                workflow["prompt"],
                json.dumps(workflow.get("plan_json", workflow.get("plan", {}))),
                workflow.get("trigger_type", "MANUAL"),
                json.dumps(workflow.get("trigger_meta", {})),
                workflow.get("risk_level", "SAFE"),
                workflow.get("created_at", now),
                now
            ))
            conn.commit()
            return workflow["id"]

    def delete_workflow(self, workflow_id: str) -> bool:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM workflows WHERE id = ?", (workflow_id,))
            conn.commit()
            return cursor.rowcount > 0

    # --- Watchdogs CRUD ---
    def list_watchdogs(self) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM watchdogs ORDER BY created_at DESC")
            return [dict(row) for row in cursor.fetchall()]

    def save_watchdog(self, watchdog: Dict[str, Any]) -> str:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            now = datetime.datetime.now(datetime.timezone.utc).isoformat()
            cursor.execute("""
            INSERT OR REPLACE INTO watchdogs (id, name, watch_path, file_patterns, events, workflow_id, active, trigger_count, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                watchdog["id"],
                watchdog["name"],
                watchdog["watch_path"],
                watchdog["file_patterns"],
                watchdog.get("events", "created"),
                watchdog.get("workflow_id"),
                watchdog.get("active", 1),
                watchdog.get("trigger_count", 0),
                watchdog.get("created_at", now)
            ))
            conn.commit()
            return watchdog["id"]

    def toggle_watchdog(self, watchdog_id: str, active: bool) -> bool:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE watchdogs SET active = ? WHERE id = ?", (1 if active else 0, watchdog_id))
            conn.commit()
            return cursor.rowcount > 0

    def increment_watchdog_trigger(self, watchdog_id: str):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            now = datetime.datetime.now(datetime.timezone.utc).isoformat()
            cursor.execute("""
            UPDATE watchdogs 
            SET trigger_count = trigger_count + 1, last_triggered_at = ? 
            WHERE id = ?
            """, (now, watchdog_id))
            conn.commit()

    def delete_watchdog(self, watchdog_id: str) -> bool:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM watchdogs WHERE id = ?", (watchdog_id,))
            conn.commit()
            return cursor.rowcount > 0

    # --- Schedules CRUD ---
    def list_schedules(self) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM schedules ORDER BY created_at DESC")
            return [dict(row) for row in cursor.fetchall()]

    def save_schedule(self, sched: Dict[str, Any]) -> str:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            now = datetime.datetime.now(datetime.timezone.utc).isoformat()
            cursor.execute("""
            INSERT OR REPLACE INTO schedules (id, name, schedule_type, expression, workflow_id, active, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                sched["id"],
                sched["name"],
                sched.get("schedule_type", "INTERVAL"),
                sched["expression"],
                sched.get("workflow_id"),
                sched.get("active", 1),
                sched.get("created_at", now)
            ))
            conn.commit()
            return sched["id"]

    def toggle_schedule(self, sched_id: str, active: bool) -> bool:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE schedules SET active = ? WHERE id = ?", (1 if active else 0, sched_id))
            conn.commit()
            return cursor.rowcount > 0

    def delete_schedule(self, sched_id: str) -> bool:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM schedules WHERE id = ?", (sched_id,))
            conn.commit()
            return cursor.rowcount > 0

    # --- Audit Logs ---
    def list_audit_logs(self, limit: int = 100) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?", (limit,))
            return [dict(row) for row in cursor.fetchall()]

    def add_audit_log(self, log_entry: Dict[str, Any]) -> str:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            log_id = log_entry.get("id") or f"log_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S_%f')}"
            cursor.execute("""
            INSERT INTO audit_logs (id, timestamp, trigger_type, workflow_name, status, risk_level, affected_files_count, duration_ms, details_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                log_id,
                log_entry.get("timestamp", datetime.datetime.now(datetime.timezone.utc).isoformat()),
                log_entry.get("trigger_type", "MANUAL"),
                log_entry.get("workflow_name", "Unnamed Workflow"),
                log_entry.get("status", "SUCCESS"),
                log_entry.get("risk_level", "SAFE"),
                log_entry.get("affected_files_count", 0),
                log_entry.get("duration_ms", 0),
                json.dumps(log_entry.get("details", {}))
            ))
            conn.commit()
            return log_id

    def clear_audit_logs(self) -> bool:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM audit_logs")
            conn.commit()
            return True

    # --- Settings ---
    def get_settings(self) -> Dict[str, Any]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT key, value FROM settings")
            rows = cursor.fetchall()
            settings = {}
            for row in rows:
                try:
                    settings[row["key"]] = json.loads(row["value"])
                except Exception:
                    settings[row["key"]] = row["value"]
            return settings

    def set_setting(self, key: str, value: Any):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (key, json.dumps(value)))
            conn.commit()

    def update_settings(self, settings_dict: Dict[str, Any]):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            for k, v in settings_dict.items():
                cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (k, json.dumps(v)))
            conn.commit()
