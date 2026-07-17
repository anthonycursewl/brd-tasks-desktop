use std::path::PathBuf;

use tauri::Manager;

use crate::models::{Settings, Task};

pub fn data_dir(app: &tauri::AppHandle) -> PathBuf {
    let dir = app
        .path()
        .app_data_dir()
        .expect("failed to get app data dir");
    std::fs::create_dir_all(&dir).ok();
    dir
}

fn tasks_path(app: &tauri::AppHandle) -> PathBuf {
    data_dir(app).join("tasks.json")
}

fn settings_path(app: &tauri::AppHandle) -> PathBuf {
    data_dir(app).join("settings.json")
}

pub fn load_tasks(app: &tauri::AppHandle) -> Vec<Task> {
    let path = tasks_path(app);
    if path.exists() {
        let data = std::fs::read_to_string(&path).unwrap_or_default();
        serde_json::from_str(&data).unwrap_or_default()
    } else {
        vec![]
    }
}

pub fn save_tasks(app: &tauri::AppHandle, tasks: &[Task]) {
    let path = tasks_path(app);
    let data = serde_json::to_string_pretty(tasks).unwrap_or_default();
    std::fs::write(&path, data).ok();
}

pub fn load_settings(app: &tauri::AppHandle) -> Settings {
    let path = settings_path(app);
    if path.exists() {
        let data = std::fs::read_to_string(&path).unwrap_or_default();
        serde_json::from_str(&data).unwrap_or_default()
    } else {
        Settings::default()
    }
}

pub fn save_settings(app: &tauri::AppHandle, settings: &Settings) {
    let path = settings_path(app);
    let data = serde_json::to_string_pretty(settings).unwrap_or_default();
    std::fs::write(&path, data).ok();
}

pub fn remove_expired_tasks(_tasks: &mut Vec<Task>) {
    // no-op: expired tasks stay visible in the UI
}

pub fn position_popup(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if let Some(monitor) = window.primary_monitor().ok().flatten() {
            let monitor_size = monitor.size();
            let window_size = tauri::PhysicalSize::new(360, 520);
            let x = monitor_size.width as i32 - window_size.width as i32 - 12;
            let y = monitor_size.height as i32 - window_size.height as i32 - 48;
            let _ = window.set_position(tauri::PhysicalPosition::new(x, y));
        }
    }
}

pub fn toggle_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_minimized().unwrap_or(false) {
            let _ = window.unminimize();
            let _ = window.set_focus();
        } else if window.is_visible().unwrap_or(false) {
            let _ = window.hide();
        } else {
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
}
