mod commands;
mod models;
mod storage;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::load_profiles,
            commands::save_profiles,
            commands::run_profile,
            commands::run_item,
            commands::validate_path,
            commands::get_current_platform,
            commands::get_installed_apps,
            commands::get_storage_dir,
            commands::set_storage_dir,
            commands::get_autostart,
            commands::set_autostart,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
