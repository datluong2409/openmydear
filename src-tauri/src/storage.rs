use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

use crate::models::LaunchProfile;

fn get_data_file(app: &AppHandle) -> Result<PathBuf, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    Ok(app_dir.join("profiles.json"))
}

pub fn load(app: &AppHandle) -> Result<Vec<LaunchProfile>, String> {
    let file_path = get_data_file(app)?;

    if !file_path.exists() {
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read profiles: {}", e))?;

    let profiles: Vec<LaunchProfile> =
        serde_json::from_str(&content).map_err(|e| format!("Failed to parse profiles: {}", e))?;

    Ok(profiles)
}

pub fn save(app: &AppHandle, profiles: &[LaunchProfile]) -> Result<(), String> {
    let file_path = get_data_file(app)?;

    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create data directory: {}", e))?;
    }

    let content = serde_json::to_string_pretty(profiles)
        .map_err(|e| format!("Failed to serialize profiles: {}", e))?;

    fs::write(&file_path, content).map_err(|e| format!("Failed to write profiles: {}", e))?;

    Ok(())
}
