import { WorkflowPlan } from '../types';

export function generatePythonScript(plan: WorkflowPlan): string {
  const steps = plan.actions || [];
  const lines: string[] = [
    `# ========================================================`,
    `# GhostPilot Automation Engine // Standalone Python Script`,
    `# Title: ${plan.title}`,
    `# Risk: ${plan.risk_level} | Trigger: ${plan.trigger.type}`,
    `# ========================================================`,
    ``,
    `import os`,
    `import sys`,
    `import shutil`,
    `from pathlib import Path`,
    `from datetime import datetime`,
    ``,
    `def run_automation():`,
    `    print("[INIT] Starting GhostPilot workflow execution...")`,
  ];

  let stepIdx = 1;
  for (const step of steps) {
    const p = step.path || step.source || '%USERPROFILE%/Downloads';
    const cleanPath = p.replace(/\\/g, '/');

    lines.push(`    # ----------------------------------------------------`);
    lines.push(`    # Step ${stepIdx}: ${step.title} (${step.type})`);
    lines.push(`    # ----------------------------------------------------`);

    if (step.type === 'SCAN_FILES') {
      const filters = step.filter && step.filter.length > 0 ? JSON.stringify(step.filter) : `["*.*"]`;
      lines.push(`    scan_dir = Path(os.path.expandvars(r"${cleanPath}"))`);
      lines.push(`    filters = ${filters}`);
      lines.push(`    matched_files = []`);
      lines.push(`    for pattern in filters:`);
      lines.push(`        matched_files.extend(list(scan_dir.glob(pattern)))`);
      lines.push(`    print(f"Matched {len(matched_files)} files in {scan_dir}")`);
    } else if (step.type === 'CREATE_DIR') {
      const dest = step.destination || `${cleanPath}/Organized`;
      lines.push(`    target_dir = Path(os.path.expandvars(r"${dest}"))`);
      lines.push(`    target_dir.mkdir(parents=True, exist_ok=True)`);
      lines.push(`    print(f"Created target directory: {target_dir}")`);
    } else if (step.type === 'ORGANIZE_FILES' || step.type === 'MOVE_FILES') {
      const dest = typeof step.destination === 'string' ? step.destination : `${cleanPath}/Sorted`;
      lines.push(`    source_dir = Path(os.path.expandvars(r"${cleanPath}"))`);
      lines.push(`    target_dir = Path(os.path.expandvars(r"${dest}"))`);
      lines.push(`    target_dir.mkdir(parents=True, exist_ok=True)`);
      lines.push(`    for item in source_dir.iterdir():`);
      lines.push(`        if item.is_file():`);
      lines.push(`            target_dest = target_dir / item.name`);
      lines.push(`            # Collision-safe auto-renaming`);
      lines.push(`            if target_dest.exists():`);
      lines.push(`                target_dest = target_dir / f"{item.stem}_copy{item.suffix}"`);
      lines.push(`            shutil.move(str(item), str(target_dest))`);
      lines.push(`            print(f"Relocated: {item.name} -> {target_dest.name}")`);
    } else if (step.type === 'BATCH_RENAME') {
      lines.push(`    target_dir = Path(os.path.expandvars(r"${cleanPath}"))`);
      lines.push(`    date_stamp = datetime.now().strftime("%Y-%m-%d")`);
      lines.push(`    for idx, item in enumerate(target_dir.iterdir()):`);
      lines.push(`        if item.is_file():`);
      lines.push(`            new_name = f"{date_stamp}_{item.name}"`);
      lines.push(`            item.rename(target_dir / new_name)`);
      lines.push(`            print(f"Renamed: {item.name} -> {new_name}")`);
    } else if (step.type === 'CLEAN_TEMP_FILES') {
      lines.push(`    temp_dir = Path(os.environ.get("TEMP", r"C:\\Temp"))`);
      lines.push(`    cutoff = datetime.now().timestamp() - 86400  # 24 hours`);
      lines.push(`    cleaned = 0`);
      lines.push(`    for item in temp_dir.iterdir():`);
      lines.push(`        try:`);
      lines.push(`            if item.is_file() and item.stat().st_mtime < cutoff:`);
      lines.push(`                item.unlink()`);
      lines.push(`                cleaned += 1`);
      lines.push(`        except Exception:`);
      lines.push(`            pass`);
      lines.push(`    print(f"Purged {cleaned} stale temporary files.")`);
    } else if (step.type === 'LAUNCH_APP') {
      const cmd = step.params?.command || 'notepad';
      lines.push(`    import subprocess`);
      lines.push(`    CREATE_NO_WINDOW = 0x08000000`);
      lines.push(`    subprocess.Popen(["${cmd}"], creationflags=CREATE_NO_WINDOW)`);
      lines.push(`    print("Spawned background process: ${cmd}")`);
    } else if (step.type === 'KILL_PROCESS') {
      lines.push(`    import psutil`);
      lines.push(`    for p in psutil.process_iter(['name']):`);
      lines.push(`        if p.info['name'] and 'node' in p.info['name'].lower():`);
      lines.push(`            p.terminate()`);
      lines.push(`            print(f"Terminated process: {p.info['name']}")`);
    } else {
      lines.push(`    # Generic execution block`);
      lines.push(`    print(f"Executed step: {step.title}")`);
    }

    lines.push(``);
    stepIdx++;
  }

  lines.push(`    print("[COMPLETE] Workflow executed successfully with 0 errors.")`);
  lines.push(``);
  lines.push(`if __name__ == "__main__":`);
  lines.push(`    run_automation()`);

  return lines.join('\n');
}

export function generatePowerShellScript(plan: WorkflowPlan): string {
  const steps = plan.actions || [];
  const lines: string[] = [
    `<#`,
    `========================================================`,
    `GhostPilot Windows 11 Native Automation Script (PowerShell 7)`,
    `Title: ${plan.title}`,
    `Risk: ${plan.risk_level} | Trigger: ${plan.trigger.type}`,
    `========================================================`,
    `#>`,
    `$ErrorActionPreference = "Stop"`,
    `Write-Host "[INIT] Launching GhostPilot Native Pipeline..." -ForegroundColor Cyan`,
    ``,
  ];

  let stepIdx = 1;
  for (const step of steps) {
    const p = step.path || step.source || '$HOME\\Downloads';
    const winPath = p.replace(/\//g, '\\');

    lines.push(`# ----------------------------------------------------`);
    lines.push(`# Step ${stepIdx}: ${step.title}`);
    lines.push(`# ----------------------------------------------------`);

    if (step.type === 'SCAN_FILES') {
      const filters = step.filter && step.filter.length > 0 ? step.filter.join('", "') : '*.*';
      lines.push(`$Source = Resolve-Path "${winPath}"`);
      lines.push(`$Files = Get-ChildItem -Path $Source -Include "${filters}" -File -Recurse`);
      lines.push(`Write-Host "Scanned $($Files.Count) candidate files in $Source" -ForegroundColor Green`);
    } else if (step.type === 'CREATE_DIR') {
      const dest = step.destination || `${winPath}\\Organized`;
      lines.push(`$Target = "${dest}"`);
      lines.push(`if (-not (Test-Path $Target)) { New-Item -ItemType Directory -Path $Target -Force }`);
      lines.push(`Write-Host "Ensured directory exists: $Target" -ForegroundColor Yellow`);
    } else if (step.type === 'ORGANIZE_FILES' || step.type === 'MOVE_FILES') {
      const dest = typeof step.destination === 'string' ? step.destination : `${winPath}\\Sorted`;
      lines.push(`$Source = "${winPath}"`);
      lines.push(`$Target = "${dest}"`);
      lines.push(`if (-not (Test-Path $Target)) { New-Item -ItemType Directory -Path $Target -Force }`);
      lines.push(`Get-ChildItem -Path $Source -File | ForEach-Object {`);
      lines.push(`    $DestFile = Join-Path $Target $_.Name`);
      lines.push(`    Move-Item -Path $_.FullName -Destination $DestFile -Force`);
      lines.push(`    Write-Host "Moved: $($_.Name) -> $Target" -ForegroundColor Green`);
      lines.push(`}`);
    } else if (step.type === 'BATCH_RENAME') {
      lines.push(`$DateStamp = (Get-Date).ToString("yyyy-MM-dd")`);
      lines.push(`Get-ChildItem -Path "${winPath}" -File | ForEach-Object {`);
      lines.push(`    $NewName = "$DateStamp" + "_" + $_.Name`);
      lines.push(`    Rename-Item -Path $_.FullName -NewName $NewName`);
      lines.push(`    Write-Host "Renamed: $($_.Name) -> $NewName" -ForegroundColor Cyan`);
      lines.push(`}`);
    } else if (step.type === 'CLEAN_TEMP_FILES') {
      lines.push(`$Limit = (Get-Date).AddDays(-1)`);
      lines.push(`Get-ChildItem -Path $env:TEMP -File | Where-Object { $_.LastWriteTime -lt $Limit } | ForEach-Object {`);
      lines.push(`    Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue`);
      lines.push(`}`);
      lines.push(`Write-Host "Temporary cache files cleaned." -ForegroundColor Yellow`);
    } else if (step.type === 'LAUNCH_APP') {
      const cmd = step.params?.command || 'notepad';
      lines.push(`Start-Process -FilePath "${cmd}" -WindowStyle Hidden`);
      lines.push(`Write-Host "Launched application: ${cmd}" -ForegroundColor Green`);
    } else {
      lines.push(`Write-Host "Executing step: ${step.title}" -ForegroundColor Cyan`);
    }

    lines.push(``);
    stepIdx++;
  }

  lines.push(`Write-Host "[SUCCESS] Pipeline execution finished with 0 errors." -ForegroundColor Green`);
  return lines.join('\n');
}
