use chrono::Utc;
use chrono::DateTime;
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
    expiry_minutes: Option<i64>,
) -> Task {
    let minutes = expiry_minutes.unwrap_or(1440).max(1).min(525600);
    let now = Utc::now();
    let task = Task {
        id: id.unwrap_or_else(|| Uuid::new_v4().to_string()),
        title,
        description,
        completed: false,
        completed_at: None,
        created_at: now,
        expires_at: now + chrono::Duration::minutes(minutes),
        updated_at: now,
        deleted_at: None,
        priority,
        tags,
        notes,
        version: Some(1),
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
pub fn upsert_task(
    app: tauri::AppHandle,
    id: String,
    title: String,
    description: String,
    completed: bool,
    completed_at: Option<String>,
    priority: String,
    tags: Vec<String>,
    notes: String,
    created_at: String,
    expires_at: String,
    updated_at: String,
    deleted_at: Option<String>,
    version: Option<i64>,
) -> Task {
    let parse_dt = |s: String| -> DateTime<Utc> {
        DateTime::parse_from_rfc3339(&s)
            .map(|d| d.with_timezone(&Utc))
            .unwrap_or_else(|_| Utc::now())
    };
    let task = Task {
        id,
        title,
        description,
        completed,
        completed_at: completed_at.map(|s| parse_dt(s)),
        created_at: parse_dt(created_at),
        expires_at: parse_dt(expires_at),
        updated_at: parse_dt(updated_at),
        deleted_at: deleted_at.map(|s| parse_dt(s)),
        priority,
        tags,
        notes,
        version,
    };
    let state = app.state::<AppState>();
    let mut tasks = state.tasks.lock().unwrap();
    if let Some(existing) = tasks.iter_mut().find(|t| t.id == task.id) {
        *existing = task.clone();
    } else {
        tasks.push(task.clone());
    }
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
    expiry_minutes: Option<i64>,
) -> Option<Task> {
    let state: tauri::State<'_, AppState> = app.state::<AppState>();
    let mut tasks: std::sync::MutexGuard<'_, Vec<Task>> = state.tasks.lock().unwrap();
    if let Some(task) = tasks.iter_mut().find(|t: &&mut Task| t.id == id) {
        task.title = title;
        task.priority = priority;
        task.tags = tags;
        task.notes = notes;
        task.updated_at = Utc::now();
        if let Some(minutes) = expiry_minutes {
            task.expires_at = Utc::now() + chrono::Duration::minutes(minutes.max(1).min(525600));
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
        task.completed_at = if task.completed { Some(Utc::now()) } else { None };
        task.updated_at = Utc::now();
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
