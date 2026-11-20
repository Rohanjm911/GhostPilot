# 🏗️ GhostPilot Architecture & Technical Specifications

> **Tagline:** *Command your machine in plain English*  
> **Target OS:** Windows 11 x64 Native Desktop Application  
> **Design Philosophy:** Neo-Brutalism UI & Zero-Risk Safety Sandbox  

---

## 1. System Overview

GhostPilot is built on a **three-tier architecture** designed to combine high-speed system-level control with a tactile user experience and operating system safety:

```
┌─────────────────────────────────────────────────────────────┐
│ 🎨 FRONTEND LAYER (React 18 + Vite + Tailwind CSS)           │
│  - 680px Floating Spotlight Command Bar (Alt + Space)       │
│  - Full Studio Dashboard (Watchdogs, Cron Jobs, Audit Logs) │
│  - Animated Startup Screen & 5-Tab Interactive User Guide   │
└──────────────────────────────┬──────────────────────────────┘
                               │ Tauri IPC (invoke / emit)
┌──────────────────────────────▼──────────────────────────────┐
│ 🦀 DESKTOP HOST (Tauri v2 + Rust 1.80+)                      │
│  - Window Management & Global Hotkeys (Alt + Space)         │
│  - Native Win32 Kernel Polling (0.001ms GlobalMemoryStatus) │
│  - Silent Background Process Dispatch (CREATE_NO_WINDOW)    │
│  - System Tray Persistence & Native Windows Notifications   │
└──────────────────────────────┬──────────────────────────────┘
                               │ Subprocess CLI / stdio JSON
┌──────────────────────────────▼──────────────────────────────┐
│ ⚙️ AUTOMATION WORKER (worker.exe / Python 3.14 Standalone)   │
│  - AI Compiler (Local Ollama / Cloud / Offline Heuristics)  │
│  - Multi-Tier Safety Sandbox & Read-Only Dry-Run Simulator  │
│  - Real-time Folder Watchdogs (watchdog Observer)           │
│  - Recurring Cron Schedules (schedule daemon)               │
│  - OS Automations (Explorer, psutil, pyautogui, pywinauto)  │
│  - Persistent SQLite Database (%APPDATA%/GhostPilot)        │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Desktop Host & IPC Layer (`src-tauri/`)

The host application is written in **Rust** using **Tauri v2**:

### Key Modules:
- **`src-tauri/src/main.rs`**: Entrypoint initializing Tauri runtime, system tray icon, window resizing handlers (`studio` vs `spotlight`), and global shortcut listener (`Alt + Space`).
- **`src-tauri/src/commands.rs`**: Implements native commands invoked by the React frontend:
  - `compile_prompt(prompt)`: Routes prompt to compiler.
  - `execute_workflow(plan, dry_run, trigger_type)`: Dispatches workflow plans.
  - `get_system_stats()`: Reads CPU & RAM metrics directly via Windows Win32 API.
  - `list_workflows()`, `save_workflow()`, `delete_workflow()`: Manages saved workflows in SQLite.
  - `list_watchdogs()`, `save_watchdog()`, `toggle_watchdog()`: Manages real-time folder watchers.
  - `list_schedules()`, `save_schedule()`, `toggle_schedule()`: Manages recurring cron jobs.
  - `list_audit_logs()`, `clear_audit_logs()`: Manages execution audit history.

### Windows Native Optimizations:
1. **Silent Child Execution (`CREATE_NO_WINDOW = 0x08000000`):**
   Using `std::os::windows::process::CommandExt`, all subprocess invocations suppress console window allocation, preventing CMD popups or taskbar flickering.
2. **Microsecond Kernel Polling (`kernel32.dll`):**
   Calls `GlobalMemoryStatusEx` and `GetSystemTimes` directly from Rust without spawning child processes. This keeps host CPU consumption `< 0.1%` and execution latency `< 0.001ms`.

---

## 3. Automation Engine Sidecar (`automation-engine/`)

The automation sidecar is bundled into a standalone executable (`worker.exe`) using PyInstaller:

### Core Services:
| File | Responsibility |
| :--- | :--- |
| `worker.py` | CLI router and stdio JSON-RPC server entrypoint. |
| `engine.py` | Central coordinator orchestrating compiler, sandbox, and dispatchers. |
| `compiler.py` | 3-mode natural language intent compiler (Ollama, Cloud, Heuristics). |
| `safety.py` | Path validation, risk classification, and dry-run simulation engine. |
| `storage.py` | Thread-safe SQLite persistence layer for workflows, watchdogs, schedules, and audit logs. |
| `watchdog_service.py` | Real-time filesystem observer monitoring directory changes. |
| `scheduler_service.py` | Thread-based cron runner executing recurrent automations. |
| `process_service.py` | Process inspector and safe process termination manager. |
| `file_ops_service.py` | Safe file operations (organize, batch rename, cleanup, quarantine). |
| `gui_macro_service.py` | Silent application launching and keyboard/mouse automation. |

---

## 4. AI Prompt Compiler Architecture

The compiler translates natural language into a deterministic JSON schema through a tiered approach:

```
[User Prompt]
      │
      ▼
[Ollama Socket Probe (Port 11434, 200ms timeout)]
   ├── Active? ──► [Local Ollama LLM (qwen2.5-coder / llama3.2)]
   └── Offline? ─► [Deterministic Rule-Based Heuristic Compiler]
                          │
                          ▼
             [Structured Workflow Plan (JSON)]
```

### Heuristic Compiler Capabilities:
- **Downloads & File Management:** Regex matching for extensions (`pdf`, `zip`, `images`, `docs`), folder creation, and collision-safe moves.
- **Disk Cleanup:** Identification of cache folders (`%TEMP%`, `%APPDATA%/Local/Temp`), age thresholds, and preview generation.
- **Batch Renaming:** Date prefixing, standardized slug formatting, and file categorization.
- **Development Workspaces:** Multi-application silent launches (`code`, `spotify`, `chrome`).
- **Process Management:** Name resolution, resource threshold checking, and critical process protection.

---

## 5. Safety Sandbox & Security Model

To prevent accidental system damage, GhostPilot enforces strict path barriers and execution modes:

### Blacklisted System Directories:
- `C:\Windows` and all subfolders (`System32`, `SysWOW64`, `WinSxS`)
- `C:\Program Files` and `C:\Program Files (x86)`
- Root drive paths (`C:\`, `D:\`) without subfolder qualifiers
- Boot and recovery partitions

### Protected Operating System Processes:
`explorer.exe`, `svchost.exe`, `csrss.exe`, `lsass.exe`, `services.exe`, `dwm.exe`, `smss.exe`, `wininit.exe`.

### Risk Levels:
- **`[SAFE]`**: Auto-approved. Read-only directory scans, creating folders, collision-safe moves.
- **`[ELEVATED]`**: User prompt warning. Batch renaming > 20 files, purging cache folders.
- **`[HIGH_RISK]`**: Mandatory confirmation modal with explicit checkbox. Recursive deletes, broad directory removals.

---

## 6. Persistence & Storage Schema (`ghostpilot.db`)

GhostPilot stores all persistent configuration in an SQLite database located at `%APPDATA%/GhostPilot/ghostpilot.db`:

```sql
-- Saved Workflows
CREATE TABLE workflows (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    plan_json TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Active Watchdogs
CREATE TABLE watchdogs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    pattern TEXT NOT NULL,
    plan_json TEXT NOT NULL,
    active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recurring Schedules
CREATE TABLE schedules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    cron_expr TEXT NOT NULL,
    plan_json TEXT NOT NULL,
    active INTEGER DEFAULT 1,
    last_run TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit History Logs
CREATE TABLE audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workflow_id TEXT,
    trigger_type TEXT NOT NULL,
    status TEXT NOT NULL,
    duration_ms INTEGER,
    affected_files_count INTEGER,
    error_message TEXT,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 7. Frontend Design System (Neo-Brutalism)

The UI uses high-contrast Neo-Brutalism design tokens defined in Tailwind CSS:
- **Canvas Base:** `#F4F4F0` (warm studio paper)
- **Acid Lime:** `#B8FF00` (safe state, AI compilation active, action nodes)
- **Electric Yellow:** `#FFD600` (scheduled triggers, alerts, hazard accents)
- **Cyber Cyan:** `#00E5FF` (file watchdogs, condition/filter nodes)
- **Hot Coral:** `#FF4D4D` (high-risk actions, cancel buttons, hazard warnings)
- **Pitch Black:** `#000000` (2.5px solid borders, 4px 4px 0px offset drop shadows)

---

## 8. Frontend Component & Pipeline Architecture

GhostPilot's frontend is built with React 18, TypeScript, and Vite, structured into modular brutalist components:

```
src/
├── App.tsx                     # Top-level window controller, view router (Spotlight vs Studio), global logs
├── components/
│   ├── CommandBar.tsx          # 680px floating Spotlight bar (Alt+Space), prompt compiler, quick action chips
│   ├── StudioDashboard.tsx     # Full management studio, Win32 hardware monitors, navigation tabs
│   ├── WorkflowPipelineView.tsx# Visual horizontal node pipeline: [TRIGGER] ➔ [CONDITION] ➔ [ACTION]
│   ├── DryRunModal.tsx         # Hazard-striped simulation modal with canonical paths & safety gate
│   ├── ConsoleDrawer.tsx       # Collapsible live bottom terminal in JetBrains Mono with log telemetry
│   ├── WorkflowBuilder.tsx     # Interactive workflow constructor embedding the visual node pipeline
│   ├── WatchdogManager.tsx     # Real-time directory watcher cards with toggle switches
│   ├── ScheduleManager.tsx     # Recurring cron schedule manager with next-run timers
│   ├── AuditLogViewer.tsx      # Execution history tables with status badges and duration metrics
│   ├── SettingsView.tsx        # LLM provider configurator (Ollama, OpenAI, Gemini) and hotkeys
│   ├── NeoButton.tsx           # Reusable brutalist button with tactile translate(2px, 2px) click physics
│   └── HowToUseModal.tsx       # 5-tab onboarding manual with interactive prompt templates
└── lib/
    ├── scriptGenerator.ts      # Deterministic transpiler converting WorkflowPlan AST -> Python 3 & PowerShell 7
    └── types.ts                # TypeScript schemas for WorkflowPlan, Trigger, Condition, Action, and Logs
```

### Visual Workflow Node Pipeline Flow
1. **Plan Parsing:** The AI compiler converts natural language to a structured `WorkflowPlan`.
2. **Horizontal Node Rendering:** `WorkflowPipelineView.tsx` decomposes the plan into:
   - `[TRIGGER]` Node: Header `#FFD600` (Electric Yellow). Shows trigger mechanism (`HOTKEY`, `FILE_WATCHER`, `CRON_SCHEDULE`, `MANUAL`) and debounce constraints.
   - Connector Pill: Chunky black `➔` badge.
   - `[CONDITION]` Node: Header `#00E5FF` (Cyber Cyan). Shows canonical target paths (`C:\...`) and filter criteria pills.
   - Connector Pill: Chunky black `➔` badge.
   - `[ACTION]` Node: Header `#B8FF00` (Acid Lime). Shows sequential execution operations (`CREATE_DIR`, `MOVE_FILES`, `LAUNCH_APP`, etc.).
3. **AST-to-Script Transpilation (`scriptGenerator.ts`):** Users can click `"INSPECT SCRIPT"` to generate production-ready **Python 3** (using `pathlib`, `shutil`, `os`) and **PowerShell 7** (using `Get-ChildItem`, `Move-Item`, `New-Item`) scripts with error handling and full Windows path escaping.

### Dry-Run Sandbox Modal Architecture
- **Hazard Pattern Header:** Top 12px accent using `repeating-linear-gradient(45deg, #FFD600, #FFD600 12px, #000000 12px, #000000 24px)`.
- **Absolute Path Expansion:** Resolves environment variables to exact Windows paths (`C:\Users\<Name>\...`).
- **Mechanical Safety Gate:** The execution trigger button remains locked until the operator explicitly confirms an acknowledgment checkbox, ensuring zero unintended disk modifications.

### Live Telemetry Console Drawer Architecture
- **Real-Time Log Stream:** Subscribes to execution events across the Tauri IPC bridge and worker sidecar.
- **Badge Classification:** Categorizes logs into `[INFO]`, `[WATCHDOG]`, `[DRY-RUN]`, `[ERROR]`, and `[SUCCESS]`.
- **Operator Controls:** Includes live pulse indicator, counter pill, clipboard copy, and buffer purge.
