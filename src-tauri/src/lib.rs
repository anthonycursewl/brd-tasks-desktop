mod commands;
mod models;
mod state;
mod utils;

use state::AppState;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};
use utils::{load_settings, load_tasks, remove_expired_tasks, save_tasks, toggle_window};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(AppState {
            tasks: std::sync::Mutex::new(vec![]),
            settings: std::sync::Mutex::new(models::Settings::default()),
            tray: std::sync::Mutex::new(None),
        })
        .setup(|app| {
            let saved_tasks = load_tasks(&app.handle());
            let saved_settings = load_settings(&app.handle());

            let mut clean_tasks = saved_tasks.clone();
            remove_expired_tasks(&mut clean_tasks);
            if clean_tasks.len() != saved_tasks.len() {
                save_tasks(&app.handle(), &clean_tasks);
            }

            let state = app.state::<AppState>();
            *state.tasks.lock().unwrap() = clean_tasks;
            *state.settings.lock().unwrap() = saved_settings;

            let show = MenuItem::with_id(app, "toggle", "Show/Hide", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &quit])?;

            let tray = TrayIconBuilder::new()
                .tooltip("BRD Tasks")
                .icon(app.default_window_icon().cloned().unwrap())
                .menu(&menu)
                .on_menu_event(|app, event| {
                    match event.id().as_ref() {
                        "toggle" => toggle_window(app),
                        "quit" => app.exit(0),
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray_icon, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        toggle_window(&tray_icon.app_handle());
                    }
                })
                .build(app)?;

            *state.tray.lock().unwrap() = Some(tray);

            // Position and show the main window on startup.
            let app_handle = app.handle().clone();
            let h = app_handle.clone();
            let _ = app_handle.run_on_main_thread(move || {
                if let Some(window) = h.get_webview_window("main") {
                    crate::utils::position_popup(&h);
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_tasks,
            commands::add_task,
            commands::upsert_task,
            commands::toggle_task,
            commands::delete_task,
            commands::update_task,
            commands::cleanup_expired,
            commands::get_settings,
            commands::set_avatar_url,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
