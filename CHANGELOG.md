# 📜 GhostPilot Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-11-20

### 🚀 Major Features & Capabilities
- **Floating Spotlight Command Bar:** 680px Neo-Brutalist floating launcher summoned globally anywhere in Windows 11 with <kbd>Alt</kbd> + <kbd>Space</kbd>.
- **Full Studio Dashboard:** Comprehensive desktop dashboard featuring modules for Command Studio, Real-time Watchdogs, Scheduled Cron Jobs, Execution Audit Logs, and AI Settings.
- **Visual Workflow Node Pipeline:** Connected horizontal brutalist cards (`[TRIGGER] ➔ [CONDITION] ➔ [ACTION]`) with high-contrast color-coded headers (`#FFD600` for triggers, `#00E5FF` for filters/conditions, `#B8FF00` for actions).
- **Embedded Script Inspector:** Real-time transpiler generating production-ready, runnable **Python 3** and **PowerShell 7** code from any parsed natural language automation with full Windows path escaping and copy utilities.
- **Hazard-Striped Dry-Run Sandbox Modal:** Styled destructive confirmations with diagonal black-and-yellow hazard stripes, canonical Windows file paths (`C:\...`), impacted file count previews, and a mandatory confirmation lock.
- **Live Brutalist Console Drawer:** Collapsible bottom terminal drawer formatted in `JetBrains Mono` with color-coded `[INFO]`, `[WATCHDOG]`, `[DRY-RUN]`, `[ERROR]`, and `[SUCCESS]` badges, live pulse beacon, and one-click `"COPY LOGS"` and `"CLEAR"` buttons.
- **Tiered AI Prompt Compiler:** Converts natural language instructions into structured JSON execution plans via:
  - Local Ollama LLM integration (`qwen2.5-coder`, `llama3.2`).
  - Sub-millisecond deterministic offline heuristic compiler (100% functional without internet or API keys).
- **Zero-Risk Safety Sandbox:** Multi-tier path isolation blocking access to critical system directories (`C:\Windows`, `System32`, `Program Files`) and protecting critical OS processes (`explorer.exe`, `svchost.exe`, `csrss.exe`).
- **Real-Time Filesystem Watchdogs:** Background directory observer powered by `watchdog` triggering automations upon file creation, modification, or movement.
- **Persistent Recurring Scheduler:** Cron runner powered by `schedule` and persisted in SQLite.
- **SQLite Persistence Engine:** Local database `%APPDATA%/GhostPilot/ghostpilot.db` maintaining full audit trails, saved workflows, and active schedules.

### 🎨 UI & UX Additions
- **Neo-Brutalism Design Polish:** Universal `2.5px solid #000000` borders, hard `4px 4px 0px #000000` drop shadows, and mechanical press animations (`translate(2px, 2px)`).
- **Tactile Button Physics:** High-contrast color palettes (`#F4F4F0` canvas, `#B8FF00` acid lime, `#FFD600` electric yellow, `#00E5FF` cyber cyan, `#FF4D4D` hot coral) and active click states.
- **Animated Startup Screen:** High-speed cyber grid boot sequence with progressive diagnostic checks and skip triggers (<kbd>Esc</kbd>, <kbd>Space</kbd>, <kbd>Enter</kbd>).
- **Interactive "How to Use" Guide Modal:** 5-tab walkthrough popup accessible via <kbd>F1</kbd> or header button with 1-click test prompts and copyable cheat sheets.
- **Dynamic Animated Vector Assets:** Added SVG hero banner, interactive terminal execution preview, and animated dataflow pipeline.

### ⚡ Low-End Hardware & Performance Optimizations
- **Native Win32 Kernel Polling:** System metrics query Windows `kernel32.dll` (`GlobalMemoryStatusEx` & `GetSystemTimes`) directly from Rust in `< 0.001ms`, eliminating repeated Python process spawning.
- **Background Tab Throttling:** Polling automatically pauses when GhostPilot is minimized or running behind other windows (`document.hidden`), keeping idle CPU `< 0.1%`.
- **Silent Child Execution (`CREATE_NO_WINDOW`):** Subprocess invocations pass `0x08000000`, completely preventing CMD console popups.
- **Standalone Binaries:** Bundled production frontend into `GhostPilot.exe` (~24.6 MB) and standalone Python sidecar into `worker.exe` (~85.1 MB), requiring zero runtime installations.

### 🛡️ Bug Fixes & Refinements
- Resolved interactive `npx` prompt blocking automated Windows builds.
- Added instant 200ms socket probe before Ollama HTTP calls to prevent timeout delays when Ollama is offline.
- Resolved Windows shell argument escaping errors during JSON workflow plan deserialization.
- Cleaned all intermediate build artifacts, reducing workspace footprint by ~309 MB.
