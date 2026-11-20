# 🤝 Contributing to GhostPilot

Thank you for your interest in contributing to **GhostPilot**! This guide provides everything you need to set up your local development environment, build from source, run automated tests, and submit high-quality contributions.

---

## 🛠️ Development Prerequisites

To contribute code and build binaries from source, ensure your development machine has the following installed:

1. **Operating System:** Windows 10 (21H2+) or Windows 11 x64.
2. **Node.js:** v18.0.0 or higher (v20+ LTS recommended) + `npm`.
3. **Rust Toolchain:** Rust `1.80.0` or higher (`rustup default stable-x86_64-pc-windows-msvc`).
4. **C++ Build Tools:** Visual Studio 2022 C++ Build Tools (with Windows 10/11 SDK).
5. **Python:** Python `3.11` to `3.14` x64 (with `pip`).
6. **WebView2 Runtime:** Pre-installed on Windows 10/11.

---

## 🚀 Setting Up Local Development

### 1. Clone the Repository
```powershell
git clone https://github.com/your-username/GhostPilot.git
cd GhostPilot
```

### 2. Install Frontend Dependencies
```powershell
npm install
```

### 3. Install Python Engine Dependencies
```powershell
pip install -r automation-engine/requirements.txt
```

### 4. Run Frontend in Development Mode
To run the React/Vite development server:
```powershell
npm run dev
```

### 5. Run Full Desktop App in Tauri Dev Mode
To launch the Tauri desktop shell with hot reloading:
```powershell
npm run tauri:dev
```

---

## 📦 Building Standalone Release Binaries

GhostPilot uses an automated build script that compiles both the Rust host and the Python sidecar:

```powershell
# Automated one-step build pipeline:
npm run build:win

# Or run the PowerShell script directly:
powershell -ExecutionPolicy Bypass -File ./scripts/build-win.ps1
```

### Build Artifacts:
- `./GhostPilot.exe` (~24.6 MB): The standalone Windows 11 executable.
- `./worker.exe` (~85.1 MB): The standalone PyInstaller worker.

---

## 🧪 Verification & Test Suite

Before submitting any Pull Request, you **must run the automated verification suite**:

```powershell
python scripts/verify-all.py
```

### The verification suite validates:
1. `GhostPilot.exe` exists in root and contains embedded production assets.
2. `worker.exe` exists in root and responds to `--help` and `stats`.
3. SQLite database persistence (`ghostpilot.db`) connects and executes queries.
4. AI compiler heuristic parses all core prompt categories correctly.
5. Safety sandbox correctly flags protected paths (`C:\Windows`, `System32`) and blocks dangerous operations.
6. Process service accurately queries CPU and RAM utilization.
7. Dry-run simulation executes with zero filesystem modifications.

All 9/9 verification checks must pass!

---

## 🎨 Design System & Code Style Guidelines

### 1. Neo-Brutalism Design Tokens & Component Guidelines
All UI components must strictly adhere to the Neo-Brutalism aesthetic:
- **Canvas (`#F4F4F0`):** Warm paper tone; avoid soft gradients.
- **Acid Lime (`#B8FF00`):** Safe status, active compilation, primary buttons, action nodes.
- **Electric Yellow (`#FFD600`):** Scheduled triggers, pending states, trigger nodes, hazard stripe accents.
- **Cyber Cyan (`#00E5FF`):** Real-time watchdogs, filter chips, condition nodes.
- **Hot Coral (`#FF4D4D`):** Dangerous/elevated actions, delete buttons, hazard modal confirmations.
- **Pitch Black (`#000000`):** Crisp `2.5px solid` borders and hard unblurred drop shadows (`4px 4px 0px #000000`).
- **Tactile Physics:** Interactive buttons must depress on click (`active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#000000]`).
- **Standardized Components:**
  - `NeoButton.tsx`: Use for all interactive triggers, respecting tactile click physics and focus rings.
  - `WorkflowPipelineView.tsx`: Use for rendering parsed `WorkflowPlan` pipelines as horizontal connected cards (`[TRIGGER] ➔ [CONDITION] ➔ [ACTION]`).
  - `ConsoleDrawer.tsx`: Use for real-time telemetry streaming in `JetBrains Mono` with color-coded badges (`[INFO]`, `[WATCHDOG]`, `[DRY-RUN]`, `[ERROR]`, `[SUCCESS]`).
  - `DryRunModal.tsx`: Use for high-risk action confirmation with diagonal hazard stripes and safety gates.
  - `scriptGenerator.ts`: Transpiles any `WorkflowPlan` into runnable Python 3 and PowerShell 7 scripts. Ensure any new action types are supported in both languages.

### 2. Windows Process Management
- **Never spawn visible console windows:** Always pass `command.creation_flags(0x08000000)` (`CREATE_NO_WINDOW`) in Rust via `std::os::windows::process::CommandExt`.
- In Python scripts launching desktop apps, pass `creationflags=0x08000000` in `subprocess.Popen`.

### 3. TypeScript & Rust Strictness
- `npx tsc --noEmit` must report **0 errors**.
- `cargo check` in `src-tauri` must report **0 warnings, 0 errors**.
- All Tauri commands must return typed `Result<Value, String>`.

---

## 📝 Pull Request Checklist

When submitting a PR:
- [ ] Code compiles without warnings (`cargo check`, `npx tsc --noEmit`).
- [ ] `python scripts/verify-all.py` passes all checks (100% operational).
- [ ] No temporary files (`__pycache__`, `.spec`, `target/`) are committed.
- [ ] Detailed description of the feature or bugfix provided.
- [ ] UI changes maintain high-contrast Neo-Brutalism design tokens.
