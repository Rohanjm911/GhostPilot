"""
GhostPilot Scheduler Service
Executes automated workflows on recurring intervals or cron times.
Uses python 'schedule' library with a background daemon thread.
"""

import time
import threading
from typing import Dict, List, Any, Callable, Optional

try:
    import schedule
    SCHEDULE_AVAILABLE = True
except ImportError:
    SCHEDULE_AVAILABLE = False

class SchedulerService:
    def __init__(self, on_job_trigger_callback: Optional[Callable[[str], None]] = None):
        self.on_job_trigger_callback = on_job_trigger_callback
        self.jobs: Dict[str, Any] = {}
        self.is_running = False
        self.thread: Optional[threading.Thread] = None
        self.lock = threading.Lock()

    def start(self):
        """Starts the background scheduler loop thread."""
        if not SCHEDULE_AVAILABLE:
            return
        if self.is_running:
            return
        self.is_running = True
        self.thread = threading.Thread(target=self._run_loop, daemon=True)
        self.thread.start()

    def _run_loop(self):
        while self.is_running:
            try:
                schedule.run_pending()
            except Exception:
                pass
            time.sleep(1)

    def stop(self):
        self.is_running = False
        schedule.clear()
        self.jobs.clear()

    def register_job(self, schedule_config: Dict[str, Any]) -> bool:
        """
        Parses expression and schedules job.
        Examples:
        - "Every 10 minutes"
        - "Every 1 hour"
        - "Every day at 22:00" or "Daily at 10 PM"
        """
        if not SCHEDULE_AVAILABLE:
            return False

        sched_id = schedule_config["id"]
        expr = schedule_config.get("expression", "").lower().strip()

        with self.lock:
            self.remove_job(sched_id)

            def make_trigger_func(sid: str):
                return lambda: self._on_job_fired(sid)

            job = None
            try:
                if "every" in expr and "minute" in expr:
                    parts = expr.split()
                    minutes = 1
                    for p in parts:
                        if p.isdigit():
                            minutes = int(p)
                            break
                    job = schedule.every(minutes).minutes.do(make_trigger_func(sched_id))

                elif "every" in expr and "hour" in expr:
                    parts = expr.split()
                    hours = 1
                    for p in parts:
                        if p.isdigit():
                            hours = int(p)
                            break
                    job = schedule.every(hours).hours.do(make_trigger_func(sched_id))

                elif "day" in expr or "daily" in expr or "night" in expr:
                    import re
                    match = re.search(r"(\d{1,2}):(\d{2})", expr)
                    if match:
                        time_str = f"{int(match.group(1)):02d}:{match.group(2)}"
                    else:
                        time_str = "22:00"
                    job = schedule.every().day.at(time_str).do(make_trigger_func(sched_id))

                else:
                    job = schedule.every(30).minutes.do(make_trigger_func(sched_id))

                if job:
                    job.tag(sched_id)
                    self.jobs[sched_id] = job
                    return True
            except Exception:
                return False

        return False

    def remove_job(self, sched_id: str):
        with self.lock:
            if sched_id in self.jobs:
                schedule.clear(sched_id)
                del self.jobs[sched_id]

    def _on_job_fired(self, sched_id: str):
        if self.on_job_trigger_callback:
            self.on_job_trigger_callback(sched_id)

    def get_status(self) -> Dict[str, Any]:
        with self.lock:
            return {
                "active_schedules": len(self.jobs),
                "is_running": self.is_running
            }
