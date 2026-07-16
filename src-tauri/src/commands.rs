use chrono::Utc;
use tauri::Manager;
use uuid::Uuid;

use crate::models::Task;
use crate::state::AppState;
use crate::utils::{load_tasks, save_tasks};

#[tauri::command]
pub fn get_tasks(app: tauri::AppHandle) -> Vec<Task> {
    let state: tauri::State<'_, AppState> = app.state::<AppState>();
    let mut tasks: std::sync::MutexGuard<'_, Vec<Task>> = state.tasks.lock().unwrap();
    let saved = load_tasks(&app);
    *tasks = saved;
    tasks.clone()
}

#[tauri::command]
pub fn add_task(
    app: tauri::AppHandle,
    id: Option<String>,
    title: String,
    description: String,
    priority: String,
    tags: Vec<String>,
    notes: String,
    expiry_hours: Option<i64>,
) -> Task {
    let hours = expiry_hours.unwrap_or(24).max(1);
    let now = Utc::now();
    let task = Task {
        id: id.unwrap_or_else(|| Uuid::new_v4().to_string()),
        title,
        description,
        completed: false,
        created_at: now,
        expires_at: now + chrono::Duration::hours(hours),
        priority,
        tags,
        notes,
    };
    let state = app.state::<AppState>();
    let mut tasks = state.tasks.lock().unwrap();
    if tasks.iter().any(|t| t.id == task.id) {
      return task;
    }
    tasks.push(task.clone());
    save_tasks(&app, &tasks);
    task
}

#[tauri::command]
pub fn update_task(
    app: tauri::AppHandle,
    id: String,
    title: String,
    priority: String,
    tags: Vec<String>,
    notes: String,
    expiry_hours: Option<i64>,
) -> Option<Task> {
    let state: tauri::State<'_, AppState> = app.state::<AppState>();
    let mut tasks: std::sync::MutexGuard<'_, Vec<Task>> = state.tasks.lock().unwrap();
    if let Some(task) = tasks.iter_mut().find(|t: &&mut Task| t.id == id) {
        task.title = title;
        task.priority = priority;
        task.tags = tags;
        task.notes = notes;
        if let Some(hours) = expiry_hours {
            task.expires_at = Utc::now() + chrono::Duration::hours(hours.max(1));
        }
        let updated = task.clone();
        save_tasks(&app, &tasks);
        Some(updated)
    } else {
        None
    }
}

#[tauri::command]
pub fn toggle_task(app: tauri::AppHandle, id: String) -> Option<Task> {
    let state: tauri::State<'_, AppState> = app.state::<AppState>();
    let mut tasks: std::sync::MutexGuard<'_, Vec<Task>> = state.tasks.lock().unwrap();
    if let Some(task) = tasks.iter_mut().find(|t: &&mut Task| t.id == id) {
        task.completed = !task.completed;
        let updated = task.clone();
        save_tasks(&app, &tasks);
        Some(updated)
    } else {
        None
    }
}

#[tauri::command]
pub fn delete_task(app: tauri::AppHandle, id: String) -> bool {
    let state: tauri::State<'_, AppState> = app.state::<AppState>();
    let mut tasks: std::sync::MutexGuard<'_, Vec<Task>> = state.tasks.lock().unwrap();
    let len_before = tasks.len();
    tasks.retain(|t| t.id != id);
    let removed = tasks.len() < len_before;
    if removed {
        save_tasks(&app, &tasks);
    }
    removed
}

#[tauri::command]
pub fn cleanup_expired(app: tauri::AppHandle) -> Vec<String> {
    let state = app.state::<AppState>();
    let mut tasks = state.tasks.lock().unwrap();
    let before = tasks.len();
    crate::utils::remove_expired_tasks(&mut tasks);
    let removed = tasks.len() < before;
    if removed {
        save_tasks(&app, &tasks);
    }
    Vec::new()
}

#[tauri::command]
pub fn get_settings(app: tauri::AppHandle) -> crate::models::Settings {
    let state = app.state::<AppState>();
    let mut settings = state.settings.lock().unwrap();
    let saved = crate::utils::load_settings(&app);
    *settings = saved;
    settings.clone()
}

#[tauri::command]
pub fn set_avatar_url(app: tauri::AppHandle, url: String) -> crate::models::Settings {
    let state = app.state::<AppState>();
    let mut settings = state.settings.lock().unwrap();
    settings.avatar_url = url;
    crate::utils::save_settings(&app, &settings);
    settings.clone()
}
