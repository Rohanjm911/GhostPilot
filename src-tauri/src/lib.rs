pub mod commands;

use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Manager,
};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        let shortcut_str = shortcut.to_string();
                        if shortcut_str.contains("Alt") && shortcut_str.contains("Space") {
                            toggle_spotlight_window(app);
                        }
                    }
                })
                .build(),
        )
        .setup(|app| {
            // Register Alt+Space shortcut
            let shortcut = "Alt+Space".parse::<Shortcut>().unwrap();
            let _ = app.global_shortcut().register(shortcut);

            // Configure System Tray
            let quit_i = MenuItem::with_id(app, "quit", "Quit GhostPilot", true, None::<&str>)?;
            let studio_i = MenuItem::with_id(app, "studio", "Open Studio Dashboard", true, None::<&str>)?;
            let spotlight_i = MenuItem::with_id(app, "spotlight", "Quick Spotlight (Alt+Space)", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&studio_i, &spotlight_i, &quit_i])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "studio" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                            let _ = window.eval("window.dispatchEvent(new CustomEvent('switch-mode', { detail: 'studio' }))");
                        }
                    }
                    "spotlight" => {
                        toggle_spotlight_window(app);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click { button: tauri::tray::MouseButton::Left, .. } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::compile_prompt,
            commands::execute_workflow,
            commands::get_system_stats,
            commands::list_workflows,
            commands::save_workflow,
            commands::delete_workflow,
            commands::list_watchdogs,
            commands::save_watchdog,
            commands::toggle_watchdog,
            commands::list_schedules,
            commands::save_schedule,
            commands::toggle_schedule,
            commands::list_audit_logs,
            commands::clear_audit_logs,
            commands::get_settings,
            commands::update_settings,
            commands::resize_window_for_mode
        ])
        .run(tauri::generate_context!())
        .expect("error while running GhostPilot application");
}

fn toggle_spotlight_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {
            // Tell frontend to toggle or focus
            let _ = window.eval("window.dispatchEvent(new CustomEvent('toggle-spotlight'))");
            let _ = window.set_focus();
        } else {
            let _ = window.show();
            let _ = window.set_focus();
            let _ = window.eval("window.dispatchEvent(new CustomEvent('toggle-spotlight'))");
        }
    }
}
