use serde_json::Value;
use std::process::Command;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

fn get_python_worker_path() -> (String, Vec<String>) {
    // 1. Check beside current executable
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(parent) = exe_path.parent() {
            let worker_next_to_exe = parent.join("worker.exe");
            if worker_next_to_exe.exists() {
                return (worker_next_to_exe.to_string_lossy().to_string(), vec![]);
            }
            let worker_in_auto = parent.join("automation-engine").join("worker.exe");
            if worker_in_auto.exists() {
                return (worker_in_auto.to_string_lossy().to_string(), vec![]);
            }
            let worker_in_dir = parent.join("automation-engine").join("worker").join("worker.exe");
            if worker_in_dir.exists() {
                return (worker_in_dir.to_string_lossy().to_string(), vec![]);
            }
        }
    }

    // 2. Check current working directory
    let worker_cwd = PathBuf::from("worker.exe");
    if worker_cwd.exists() {
        return (worker_cwd.to_string_lossy().to_string(), vec![]);
    }
    let exe_sidecar = PathBuf::from("automation-engine/worker.exe");
    if exe_sidecar.exists() {
        return (exe_sidecar.to_string_lossy().to_string(), vec![]);
    }
    let worker_in_dir = PathBuf::from("automation-engine/worker/worker.exe");
    if worker_in_dir.exists() {
        return (worker_in_dir.to_string_lossy().to_string(), vec![]);
    }

    // 3. Check AppData local bin
    if let Ok(appdata) = std::env::var("LOCALAPPDATA") {
        let appdata_worker = PathBuf::from(appdata).join("GhostPilot").join("bin").join("worker.exe");
        if appdata_worker.exists() {
            return (appdata_worker.to_string_lossy().to_string(), vec![]);
        }
    }

    // 4. Default to python interpreter
    let python_cmd = if cfg!(windows) { "python" } else { "python3" };
    (python_cmd.to_string(), vec!["automation-engine/worker.py".to_string()])
}

fn execute_worker_cli(subcommand: &str, args: &[&str]) -> Result<Value, String> {
    let (cmd, base_args) = get_python_worker_path();
    let mut command = Command::new(&cmd);

    #[cfg(windows)]
    command.creation_flags(CREATE_NO_WINDOW);
    
    // Add base args (e.g. worker.py)
    for a in &base_args {
        command.arg(a);
    }
    
    command.arg(subcommand);
    for a in args {
        command.arg(a);
    }

    let output = command.output().map_err(|e| format!("Failed to spawn worker: {}", e))?;

    if !output.status.success() {
        let err_msg = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Worker error: {}", err_msg));
    }

    let out_str = String::from_utf8_lossy(&output.stdout);
    serde_json::from_str(&out_str).map_err(|e| format!("Failed to parse worker output: {} (raw: {})", e, out_str))
}

#[tauri::command]
pub async fn compile_prompt(prompt: String) -> Result<Value, String> {
    execute_worker_cli("compile", &["--prompt", &prompt])
}

#[tauri::command]
pub async fn execute_workflow(plan: Value, dry_run: bool, trigger_type: Option<String>) -> Result<Value, String> {
    let plan_str = serde_json::to_string(&plan).map_err(|e| e.to_string())?;
    let mut args = vec!["--plan", &plan_str];
    if dry_run {
        args.push("--dry-run");
    }
    let t_type = trigger_type.unwrap_or_else(|| "MANUAL".to_string());
    args.push("--trigger-type");
    args.push(&t_type);
    execute_worker_cli("execute", &args)
}

#[cfg(windows)]
mod native_stats {
    use serde_json::json;
    use std::sync::atomic::{AtomicU64, Ordering};

    #[repr(C)]
    struct MEMORYSTATUSEX {
        dw_length: u32,
        dw_memory_load: u32,
        ull_total_phys: u64,
        ull_avail_phys: u64,
        ull_total_page_file: u64,
        ull_avail_page_file: u64,
        ull_total_virtual: u64,
        ull_avail_virtual: u64,
        ull_avail_extended_virtual: u64,
    }

    #[repr(C)]
    #[derive(Default, Copy, Clone)]
    struct FILETIME {
        dw_low_date_time: u32,
        dw_high_date_time: u32,
    }

    extern "system" {
        fn GlobalMemoryStatusEx(lp_buffer: *mut MEMORYSTATUSEX) -> i32;
        fn GetSystemTimes(
            lp_idle_time: *mut FILETIME,
            lp_kernel_time: *mut FILETIME,
            lp_user_time: *mut FILETIME,
        ) -> i32;
    }

    fn filetime_to_u64(ft: &FILETIME) -> u64 {
        ((ft.dw_high_date_time as u64) << 32) | (ft.dw_low_date_time as u64)
    }

    static PREV_IDLE: AtomicU64 = AtomicU64::new(0);
    static PREV_TOTAL: AtomicU64 = AtomicU64::new(0);

    pub fn get_metrics() -> Option<serde_json::Value> {
        unsafe {
            let mut mem_status: MEMORYSTATUSEX = std::mem::zeroed();
            mem_status.dw_length = std::mem::size_of::<MEMORYSTATUSEX>() as u32;
            if GlobalMemoryStatusEx(&mut mem_status) == 0 {
                return None;
            }

            let total_gb = (mem_status.ull_total_phys as f64) / (1024.0 * 1024.0 * 1024.0);
            let avail_gb = (mem_status.ull_avail_phys as f64) / (1024.0 * 1024.0 * 1024.0);
            let used_gb = total_gb - avail_gb;
            let ram_percent = mem_status.dw_memory_load as f64;

            let mut idle_time: FILETIME = Default::default();
            let mut kernel_time: FILETIME = Default::default();
            let mut user_time: FILETIME = Default::default();

            let mut cpu_percent = 5.0;
            if GetSystemTimes(&mut idle_time, &mut kernel_time, &mut user_time) != 0 {
                let idle = filetime_to_u64(&idle_time);
                let kernel = filetime_to_u64(&kernel_time);
                let user = filetime_to_u64(&user_time);
                let total = kernel + user;

                let prev_idle = PREV_IDLE.swap(idle, Ordering::Relaxed);
                let prev_total = PREV_TOTAL.swap(total, Ordering::Relaxed);

                if prev_total > 0 && total > prev_total {
                    let total_diff = (total - prev_total) as f64;
                    let idle_diff = (idle - prev_idle) as f64;
                    if total_diff > 0.0 {
                        let usage = 100.0 * (1.0 - (idle_diff / total_diff));
                        cpu_percent = (usage.max(0.0).min(100.0) * 10.0).round() / 10.0;
                    }
                }
            }

            Some(json!({
                "cpu_percent": cpu_percent,
                "ram_percent": (ram_percent * 10.0).round() / 10.0,
                "ram_used_gb": (used_gb * 100.0).round() / 100.0,
                "ram_total_gb": (total_gb * 100.0).round() / 100.0,
                "active_watchdogs": 1,
                "active_schedules": 1
            }))
        }
    }
}

#[tauri::command]
pub async fn get_system_stats() -> Result<Value, String> {
    #[cfg(windows)]
    {
        if let Some(metrics) = native_stats::get_metrics() {
            return Ok(metrics);
        }
    }
    execute_worker_cli("stats", &[])
}

#[tauri::command]
pub async fn list_workflows() -> Result<Value, String> {
    execute_worker_cli("storage", &["--action", "list_workflows"])
}

#[tauri::command]
pub async fn save_workflow(workflow: Value) -> Result<Value, String> {
    let wf_str = serde_json::to_string(&workflow).map_err(|e| e.to_string())?;
    execute_worker_cli("storage", &["--action", "save_workflow", "--data", &wf_str])
}

#[tauri::command]
pub async fn delete_workflow(workflow_id: String) -> Result<Value, String> {
    execute_worker_cli("storage", &["--action", "delete_workflow", "--id", &workflow_id])
}

#[tauri::command]
pub async fn list_watchdogs() -> Result<Value, String> {
    execute_worker_cli("storage", &["--action", "list_watchdogs"])
}

#[tauri::command]
pub async fn save_watchdog(watchdog: Value) -> Result<Value, String> {
    let wd_str = serde_json::to_string(&watchdog).map_err(|e| e.to_string())?;
    execute_worker_cli("storage", &["--action", "save_watchdog", "--data", &wd_str])
}

#[tauri::command]
pub async fn toggle_watchdog(watchdog_id: String, active: bool) -> Result<Value, String> {
    let act_str = if active { "true" } else { "false" };
    execute_worker_cli("storage", &["--action", "toggle_watchdog", "--id", &watchdog_id, "--active", act_str])
}

#[tauri::command]
pub async fn list_schedules() -> Result<Value, String> {
    execute_worker_cli("storage", &["--action", "list_schedules"])
}

#[tauri::command]
pub async fn save_schedule(schedule: Value) -> Result<Value, String> {
    let sc_str = serde_json::to_string(&schedule).map_err(|e| e.to_string())?;
    execute_worker_cli("storage", &["--action", "save_schedule", "--data", &sc_str])
}

#[tauri::command]
pub async fn toggle_schedule(schedule_id: String, active: bool) -> Result<Value, String> {
    let act_str = if active { "true" } else { "false" };
    execute_worker_cli("storage", &["--action", "toggle_schedule", "--id", &schedule_id, "--active", act_str])
}

#[tauri::command]
pub async fn list_audit_logs(limit: Option<usize>) -> Result<Value, String> {
    let lim_str = limit.unwrap_or(100).to_string();
    execute_worker_cli("storage", &["--action", "list_audit_logs", "--limit", &lim_str])
}

#[tauri::command]
pub async fn clear_audit_logs() -> Result<Value, String> {
    execute_worker_cli("storage", &["--action", "clear_audit_logs"])
}

#[tauri::command]
pub async fn get_settings() -> Result<Value, String> {
    execute_worker_cli("storage", &["--action", "get_settings"])
}

#[tauri::command]
pub async fn update_settings(settings: Value) -> Result<Value, String> {
    let s_str = serde_json::to_string(&settings).map_err(|e| e.to_string())?;
    execute_worker_cli("storage", &["--action", "update_settings", "--data", &s_str])
}

#[tauri::command]
pub async fn resize_window_for_mode(app: AppHandle, mode: String) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        if mode == "spotlight" {
            let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize { width: 720.0, height: 440.0 }));
            let _ = window.center();
            let _ = window.set_always_on_top(true);
        } else {
            let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize { width: 1240.0, height: 840.0 }));
            let _ = window.center();
            let _ = window.set_always_on_top(false);
        }
    }
    Ok(())
}
