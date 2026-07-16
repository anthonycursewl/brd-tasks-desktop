use std::sync::Mutex;
use tauri::tray::TrayIcon;

use crate::models::{Settings, Task};

pub struct AppState {
    pub tasks: Mutex<Vec<Task>>,
    pub settings: Mutex<Settings>,
    pub tray: Mutex<Option<TrayIcon>>,
}
