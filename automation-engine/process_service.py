"""
GhostPilot Process & Resource Monitor
Uses psutil to query Windows 11 system metrics, process usage, and execute controlled terminations.
"""

import os
from typing import Dict, List, Any, Optional

try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False

CRITICAL_SYSTEM_PROCESSES = {
    "system", "system idle process", "smss.exe", "csrss.exe", "wininit.exe",
    "services.exe", "lsass.exe", "svchost.exe", "explorer.exe", "winlogon.exe",
    "dwm.exe", "taskhostw.exe", "spoolsv.exe"
}

class ProcessService:
    @staticmethod
    def get_system_metrics() -> Dict[str, Any]:
        """Returns overall CPU and Memory utilization."""
        if not PSUTIL_AVAILABLE:
            return {"cpu_percent": 0.0, "ram_percent": 0.0, "ram_used_gb": 0.0, "ram_total_gb": 0.0}

        try:
            cpu = psutil.cpu_percent(interval=0.1)
            mem = psutil.virtual_memory()
            return {
                "cpu_percent": cpu,
                "ram_percent": mem.percent,
                "ram_used_gb": round(mem.used / (1024 ** 3), 2),
                "ram_total_gb": round(mem.total / (1024 ** 3), 2),
            }
        except Exception:
            return {"cpu_percent": 0.0, "ram_percent": 0.0, "ram_used_gb": 0.0, "ram_total_gb": 0.0}

    @staticmethod
    def list_top_processes(limit: int = 15) -> List[Dict[str, Any]]:
        """Returns top memory/cpu consuming processes."""
        if not PSUTIL_AVAILABLE:
            return []

        procs = []
        for p in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent', 'memory_info']):
            try:
                info = p.info
                mem_mb = round(info['memory_info'].rss / (1024 * 1024), 1) if info.get('memory_info') else 0
                procs.append({
                    "pid": info['pid'],
                    "name": info['name'],
                    "cpu_percent": info.get('cpu_percent', 0.0),
                    "ram_percent": round(info.get('memory_percent', 0.0), 1),
                    "ram_mb": mem_mb,
                    "is_critical": (info['name'] or '').lower() in CRITICAL_SYSTEM_PROCESSES
                })
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                continue

        procs.sort(key=lambda x: x["ram_mb"], reverse=True)
        return procs[:limit]

    @staticmethod
    def terminate_process_by_name(process_name: str) -> Dict[str, Any]:
        """Safely terminates all instances of a non-critical process."""
        if not PSUTIL_AVAILABLE:
            return {"success": False, "error": "psutil not available"}

        p_lower = process_name.lower().strip()
        if p_lower in CRITICAL_SYSTEM_PROCESSES:
            return {
                "success": False,
                "error": f"Refusing to terminate critical Windows system process '{process_name}'."
            }

        terminated_count = 0
        pids = []
        for proc in psutil.process_iter(['pid', 'name']):
            try:
                if (proc.info['name'] or '').lower() == p_lower:
                    pid = proc.info['pid']
                    p = psutil.Process(pid)
                    p.terminate()
                    pids.append(pid)
                    terminated_count += 1
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue

        return {
            "success": True,
            "terminated_count": terminated_count,
            "pids": pids
        }
