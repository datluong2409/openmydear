use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

use crate::models::LaunchProfile;

#[derive(Serialize, Deserialize, Default)]
struct Config {
    storage_dir: Option<String>,
}

fn get_default_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))
}

fn get_config_file(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(get_default_data_dir(app)?.join("config.json"))
}

fn read_config(app: &AppHandle) -> Config {
    let path = match get_config_file(app) {
        Ok(p) => p,
        Err(_) => return Config::default(),
    };
    if !path.exists() {
        return Config::default();
    }
    let content = fs::read_to_string(&path).unwrap_or_default();
    serde_json::from_str(&content).unwrap_or_default()
}

fn write_config(app: &AppHandle, config: &Config) -> Result<(), String> {
    let path = get_config_file(app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create config dir: {}", e))?;
    }
    let content = serde_json::to_string_pretty(config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;
    fs::write(&path, content).map_err(|e| format!("Failed to write config: {}", e))
}

fn get_data_file(app: &AppHandle) -> Result<PathBuf, String> {
    let config = read_config(app);
    let dir = if let Some(custom_dir) = config.storage_dir {
        PathBuf::from(custom_dir)
    } else {
        get_default_data_dir(app)?
    };
    Ok(dir.join("profiles.json"))
}

pub fn get_storage_dir(app: &AppHandle) -> Result<String, String> {
    let config = read_config(app);
    let dir = if let Some(custom_dir) = config.storage_dir {
        PathBuf::from(custom_dir)
    } else {
        get_default_data_dir(app)?
    };
    dir.to_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Invalid path encoding".to_string())
}

pub fn set_storage_dir(app: &AppHandle, new_dir: &str) -> Result<(), String> {
    let new_dir_path = PathBuf::from(new_dir);
    let old_data_file = get_data_file(app)?;
    let new_data_file = new_dir_path.join("profiles.json");

    fs::create_dir_all(&new_dir_path)
        .map_err(|e| format!("Failed to create directory: {}", e))?;

    if old_data_file.exists() && old_data_file != new_data_file {
        fs::copy(&old_data_file, &new_data_file)
            .map_err(|e| format!("Failed to copy profiles: {}", e))?;
        fs::remove_file(&old_data_file)
            .map_err(|e| format!("Failed to remove old profiles file: {}", e))?;
    }

    let default_dir = get_default_data_dir(app)?;
    let config = if new_dir_path == default_dir {
        Config { storage_dir: None }
    } else {
        Config { storage_dir: Some(new_dir.to_string()) }
    };

    write_config(app, &config)
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
