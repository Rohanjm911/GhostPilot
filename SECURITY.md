# 🛡️ GhostPilot Security Policy & Sandbox Architecture

Security and operating system integrity are fundamental principles of GhostPilot. Because GhostPilot executes system-level automations based on natural language instructions, multi-tier isolation barriers are enforced at the compiler, IPC, and filesystem levels.

---

## 🔒 Supported Versions

Only the latest release of GhostPilot receives active security patches:

| Version | Supported |
| :--- | :--- |
| **v1.0.x** | ✅ Yes |
| < v1.0.0 | ❌ No |

---

## 🏗️ Multi-Layer Security Architecture

GhostPilot enforces protection across three distinct layers:

### 1. Filesystem Sandbox & Path Isolation
All file actions (`SCAN_FILES`, `CREATE_DIR`, `MOVE_FILES`, `ORGANIZE_FILES`, `BATCH_RENAME`, `CLEAN_TEMP_FILES`) are strictly validated against Windows canonical paths:

- **Permitted User Directories:**
  - `%USERPROFILE%\Downloads`
  - `%USERPROFILE%\Documents`
  - `%USERPROFILE%\Desktop`
  - `%USERPROFILE%\Pictures`
  - `%USERPROFILE%\Videos`
  - `%USERPROFILE%\Music`
  - `%TEMP%` / `%LOCALAPPDATA%\Temp` (with strict age filters)

- **Hard-Blacklisted System Directories:**
  Any action attempting to read, write, move, or delete paths within the following locations is **immediately rejected and aborted**:
  - `C:\Windows` and all subdirectories (`System32`, `SysWOW64`, `WinSxS`, `Drivers`)
  - `C:\Program Files` and `C:\Program Files (x86)`
  - Bare root drives (`C:\`, `D:\`) without explicit subfolder boundaries
  - Boot partitions and recovery sectors

### 2. Protected Operating System Processes
GhostPilot prevents termination of critical system processes. The following processes can **never** be targeted by `KILL_PROCESS`:
- `explorer.exe`
- `svchost.exe`
- `csrss.exe`
- `lsass.exe`
- `services.exe`
- `dwm.exe`
- `smss.exe`
- `wininit.exe`
- `winlogon.exe`
- `taskhostw.exe`
- `spoolsv.exe`

### 3. Risk Classification Tiers

| Tier | Classification | Conditions | Enforcement |
| :--- | :--- | :--- | :--- |
| **`[SAFE]`** | Low Risk | Read-only scans, creating non-conflicting folders, moving files into designated subfolders with collision-safe automatic incremental naming, launching whitelisted desktop apps. | Auto-approved for execution. |
| **`[ELEVATED]`** | Medium Risk | Batch renaming > 20 files, cleaning non-standard temp cache directories, modifying existing files, terminating user-spawned processes. | Warning badge displayed in UI before execution. |
| **`[HIGH_RISK]`** | Critical Risk | Recursive directory deletion, modifying configuration files, broad wildcard purges. | **Execution locked.** Requires dry-run preview and mandatory confirmation modal with an explicit acknowledgement checkbox. |

### 4. Hazard-Striped Dry-Run Sandbox & Confirmation Gate
Before any destructive or elevated action touches disk:
1. **Canonical Path Resolution:** GhostPilot resolves all environment variables into absolute, canonical Windows paths (`C:\Users\<Name>\...`).
2. **Impact Calculation:** Candidate matching files are cataloged with precise count and byte footprint.
3. **Visual Hazard Alert:** High-risk actions trigger a diagonal black-and-yellow hazard-striped modal (`repeating-linear-gradient(45deg, #FFD600, #FFD600 12px, #000000 12px, #000000 24px)`).
4. **Human Verification Lock:** The crimson `"EXECUTE ANYWAY"` button is disabled until the operator actively checks:
   `[ ] "I verify that these file modifications are safe to apply on this machine"`
5. **Zero Modification Pass:** During the dry-run simulation pass, **zero bytes are modified** on disk.

### 5. Script Inspector for Pre-Execution Security Auditing
For operators who require source-level verification before permitting execution:
- GhostPilot includes a built-in **Script Inspector** in the Visual Workflow Node Pipeline.
- Transpiles the parsed AST into standalone **Python 3** and **PowerShell 7** code.
- Operators can inspect the exact cmdlets, parameters, destination paths, and error-handling blocks prior to approving execution.

---

## 📢 Reporting Security Vulnerabilities

If you discover a security vulnerability or sandbox bypass in GhostPilot:
1. **Do not open a public GitHub issue.**
2. Send an email to the security team or maintainers with details, steps to reproduce, and impact assessment.
3. You will receive an initial response within 48 hours acknowledging receipt.
4. Once verified, a fix will be developed, tested, and released under a security advisory.
