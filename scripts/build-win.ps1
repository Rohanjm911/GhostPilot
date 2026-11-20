# ====================================================================
# [ GHOSTPILOT ] Windows 11 Desktop Production Build Pipeline
# Tagline: "Command your machine in plain English"
# Builds frontend, compiles Rust/Tauri backend, bundles Python engine,
# and copies the final standalone GhostPilot.exe to the project root.
# ====================================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "====================================================================" -ForegroundColor Black -BackgroundColor Green
Write-Host " [ GHOSTPILOT ] Windows 11 Desktop Release Build Pipeline " -ForegroundColor Black -BackgroundColor Yellow
Write-Host " Target OS: Windows 11 (x64) | Standalone ./GhostPilot.exe " -ForegroundColor White -BackgroundColor Black
Write-Host "====================================================================" -ForegroundColor Black -BackgroundColor Green
Write-Host ""

$RootDir = Get-Location
Write-Host "[1/5] Verifying System Runtimes & Workspace..." -ForegroundColor Cyan
Write-Host "  -> Node:   $(node -v)" -ForegroundColor Gray
Write-Host "  -> NPM:    $(npm -v)" -ForegroundColor Gray
Write-Host "  -> Python: $(python --version)" -ForegroundColor Gray
Write-Host "  -> Rust:   $(rustc --version)" -ForegroundColor Gray

# Step 1: Build React Frontend
Write-Host ""
Write-Host "[2/5] Building React/TypeScript Frontend (Vite + Tailwind)..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Frontend build failed with exit code $LASTEXITCODE"
    exit 1
}
Write-Host "  -> Frontend build completed successfully: dist/" -ForegroundColor Green

# Step 2: Ensure Python automation dependencies
Write-Host ""
Write-Host "[3/5] Verifying Python Automation Engine Dependencies..." -ForegroundColor Cyan
python -m pip install -r automation-engine/requirements.txt --quiet
Write-Host "  -> Python dependencies verified (watchdog, schedule, psutil, pyautogui, pywinauto)." -ForegroundColor Green

# Optional: Attempt PyInstaller compilation for sidecar worker if pyinstaller is present
Write-Host ""
Write-Host "[3.1] Bundling Python Automation Worker Engine..." -ForegroundColor Cyan
try {
    Write-Host "  -> Checking PyInstaller..." -ForegroundColor Gray
    python -m PyInstaller --version | Out-Null
    Write-Host "  -> Compiling standalone worker.exe with PyInstaller (--onefile)..." -ForegroundColor Gray
    python -m PyInstaller --noconfirm --onefile --clean --name worker "automation-engine/worker.py" --distpath "automation-engine"
    if (Test-Path "automation-engine/worker.exe") {
        Copy-Item -Path "automation-engine/worker.exe" -Destination (Join-Path $RootDir "worker.exe") -Force
        Remove-Item -Path "automation-engine/worker.exe" -Force -ErrorAction SilentlyContinue
        Write-Host "  -> Successfully generated standalone ./worker.exe" -ForegroundColor Green
    }
    if (Test-Path "worker.spec") {
        Remove-Item -Path "worker.spec" -Force -ErrorAction SilentlyContinue
    }
} catch {
    Write-Host "  -> PyInstaller compilation skipped or using direct Python sidecar runtime." -ForegroundColor Yellow
}

# Step 3: Build Tauri Rust Release Executable with embedded frontend assets
Write-Host ""
Write-Host "[4/5] Compiling Tauri v2 Windows Release Executable (Embedding Frontend)..." -ForegroundColor Cyan
npx @tauri-apps/cli build --no-bundle
if ($LASTEXITCODE -ne 0) {
    Write-Error "Tauri build failed with exit code $LASTEXITCODE"
    exit 1
}

# Step 4: Locate and copy binary to Project Root folder as ./GhostPilot.exe
Write-Host ""
Write-Host "[5/5] Deploying Standalone Executable to Project Root (./GhostPilot.exe)..." -ForegroundColor Cyan

$CandidatePaths = @(
    "src-tauri/target/release/ghostpilot.exe",
    "src-tauri/target/release/GhostPilot.exe"
)

$SourceExe = $null
foreach ($path in $CandidatePaths) {
    if (Test-Path $path) {
        $SourceExe = $path
        break
    }
}

if (-not $SourceExe) {
    Write-Error "Could not locate compiled release executable in src-tauri/target/release/"
    exit 1
}

$DestExe = Join-Path $RootDir "GhostPilot.exe"
Copy-Item -Path $SourceExe -Destination $DestExe -Force

if (Test-Path $DestExe) {
    $ExeItem = Get-Item $DestExe
    $SizeMB = [math]::Round($ExeItem.Length / 1MB, 2)
    Write-Host ""
    Write-Host "====================================================================" -ForegroundColor Black -BackgroundColor Green
    Write-Host " SUCCESS! Standalone GhostPilot.exe is ready in the project root: " -ForegroundColor Black -BackgroundColor Green
    Write-Host " Path: $DestExe" -ForegroundColor Yellow
    Write-Host " Size: $SizeMB MB" -ForegroundColor Yellow
    Write-Host " Global Hotkey: Alt + Space" -ForegroundColor Yellow
    Write-Host " Launch command: .\GhostPilot.exe" -ForegroundColor White -BackgroundColor Black
    Write-Host "====================================================================" -ForegroundColor Black -BackgroundColor Green
    Write-Host ""
} else {
    Write-Error "Failed to copy GhostPilot.exe to root folder."
    exit 1
}
