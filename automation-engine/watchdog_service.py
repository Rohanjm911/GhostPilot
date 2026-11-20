"""
GhostPilot Watchdog Service
Real-time folder & file event monitoring using the watchdog library.
Monitors created, modified, deleted events and dispatches automated workflows.
"""

import os
import fnmatch
import threading
from pathlib import Path
from typing import Dict, List, Any, Callable, Optional

try:
    from watchdog.observers import Observer
    from watchdog.events import FileSystemEventHandler, FileCreatedEvent, FileModifiedEvent, FileDeletedEvent
    WATCHDOG_AVAILABLE = True
except ImportError:
    WATCHDOG_AVAILABLE = False
    FileSystemEventHandler = object

class GhostPilotFileEventHandler(FileSystemEventHandler):
    def __init__(self, watchdog_id: str, patterns: List[str], event_types: List[str], callback: Callable[[str, str, str], None]):
        self.watchdog_id = watchdog_id
        self.patterns = patterns
        self.event_types = [e.strip().lower() for e in event_types]
        self.callback = callback

    def _matches_pattern(self, file_path: str) -> bool:
        filename = os.path.basename(file_path)
        for pat in self.patterns:
            if fnmatch.fnmatch(filename.lower(), pat.lower()):
                return True
        return False

    def on_created(self, event):
        if not event.is_directory and "created" in self.event_types:
            if self._matches_pattern(event.src_path):
                self.callback(self.watchdog_id, "created", event.src_path)

    def on_modified(self, event):
        if not event.is_directory and "modified" in self.event_types:
            if self._matches_pattern(event.src_path):
                self.callback(self.watchdog_id, "modified", event.src_path)

    def on_deleted(self, event):
        if not event.is_directory and "deleted" in self.event_types:
            if self._matches_pattern(event.src_path):
                self.callback(self.watchdog_id, "deleted", event.src_path)

class WatchdogService:
    def __init__(self, on_event_callback: Optional[Callable[[str, str, str], None]] = None):
        self.on_event_callback = on_event_callback
        self.observers: Dict[str, Any] = {}
        self.active_watches: Dict[str, Dict[str, Any]] = {}
        self.lock = threading.Lock()

    def start_watch(self, config: Dict[str, Any]) -> bool:
        """Starts monitoring a directory path based on config."""
        if not WATCHDOG_AVAILABLE:
            return False

        watch_id = config["id"]
        watch_path = os.path.expandvars(config["watch_path"])
        if not os.path.exists(watch_path):
            try:
                os.makedirs(watch_path, exist_ok=True)
            except Exception:
                return False

        patterns_raw = config.get("file_patterns", "*.*")
        patterns = [p.strip() for p in patterns_raw.split(",") if p.strip()]
        events_raw = config.get("events", "created")
        events = [e.strip() for e in events_raw.split(",") if e.strip()]

        with self.lock:
            # Stop existing observer if present
            self.stop_watch(watch_id)

            def event_handler(wid: str, evt_type: str, fpath: str):
                if self.on_event_callback:
                    self.on_event_callback(wid, evt_type, fpath)

            handler = GhostPilotFileEventHandler(watch_id, patterns, events, event_handler)
            observer = Observer()
            observer.schedule(handler, watch_path, recursive=False)
            observer.daemon = True
            observer.start()

            self.observers[watch_id] = observer
            self.active_watches[watch_id] = config
            return True

    def stop_watch(self, watch_id: str) -> bool:
        with self.lock:
            if watch_id in self.observers:
                try:
                    self.observers[watch_id].stop()
                    self.observers[watch_id].join(timeout=2.0)
                except Exception:
                    pass
                del self.observers[watch_id]
            if watch_id in self.active_watches:
                del self.active_watches[watch_id]
            return True

    def stop_all(self):
        with self.lock:
            for obs in self.observers.values():
                try:
                    obs.stop()
                    obs.join(timeout=1.0)
                except Exception:
                    pass
            self.observers.clear()
            self.active_watches.clear()

    def get_status(self) -> Dict[str, Any]:
        with self.lock:
            return {
                "running_watchers": len(self.observers),
                "watch_ids": list(self.observers.keys())
            }
