"""
GhostPilot GUI & Keyboard Macro Service
Automates desktop interactions using pyautogui and pywinauto on Windows 11.
"""

import os
import subprocess
import time
from typing import Dict, List, Any, Optional

try:
    import pyautogui
    # Configure safety fail-safe
    pyautogui.FAILSAFE = True
    pyautogui.PAUSE = 0.1
    PYAUTOGUI_AVAILABLE = True
except ImportError:
    PYAUTOGUI_AVAILABLE = False

try:
    import pywinauto
    from pywinauto import Desktop
    PYWINAUTO_AVAILABLE = True
except ImportError:
    PYWINAUTO_AVAILABLE = False

class GuiMacroService:
    @staticmethod
    def launch_app(command_or_path: str) -> bool:
        """Launches an application or executable."""
        try:
            flags = subprocess.CREATE_NO_WINDOW if hasattr(subprocess, "CREATE_NO_WINDOW") else 0
            # Check if command is a common keyword e.g. 'code', 'spotify', 'notepad'
            cmd = command_or_path.strip()
            if cmd == "code":
                subprocess.Popen(["cmd.exe", "/c", "code"], shell=True, creationflags=flags)
            elif cmd == "spotify":
                subprocess.Popen(["cmd.exe", "/c", "start", "spotify:"], shell=True, creationflags=flags)
            elif cmd == "chrome":
                subprocess.Popen(["cmd.exe", "/c", "start", "chrome"], shell=True, creationflags=flags)
            elif cmd == "notepad":
                subprocess.Popen(["notepad.exe"])
            elif cmd == "calc" or cmd == "calculator":
                subprocess.Popen(["calc.exe"])
            else:
                subprocess.Popen(cmd, shell=True, creationflags=flags)
            return True
        except Exception:
            return False

    @staticmethod
    def press_hotkey(keys: List[str]) -> bool:
        """Presses a combination of keys e.g. ['ctrl', 'shift', 'esc']."""
        if not PYAUTOGUI_AVAILABLE:
            return False
        try:
            pyautogui.hotkey(*keys)
            return True
        except Exception:
            return False

    @staticmethod
    def type_text(text: str, interval: float = 0.05) -> bool:
        """Types out a string."""
        if not PYAUTOGUI_AVAILABLE:
            return False
        try:
            pyautogui.write(text, interval=interval)
            return True
        except Exception:
            return False

    @staticmethod
    def list_visible_windows() -> List[str]:
        """Lists active top-level desktop windows."""
        if not PYWINAUTO_AVAILABLE:
            return []
        try:
            desktop = Desktop(backend="uia")
            windows = desktop.windows()
            return [w.window_text() for w in windows if w.window_text()]
        except Exception:
            return []
