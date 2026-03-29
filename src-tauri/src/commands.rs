use std::collections::HashSet;
use std::path::Path;
use std::process::Command;
use tauri::AppHandle;
use tauri_plugin_opener::OpenerExt;

use crate::models::{AppInfo, ItemError, LaunchProfile, Platform, RunResult};
use crate::storage;

fn open_path_with(app: &AppHandle, path: &str, open_with: &Option<String>) -> Result<(), String> {
    if !Path::new(path).exists() {
        return Err(format!("Path does not exist: {}", path));
    }

    if let Some(ref app_path) = open_with {
        if app_path.is_empty() {
            let opener = app.opener();
            opener
                .open_path(path, None::<&str>)
                .map_err(|e| format!("Failed to open: {}", e))
        } else {
            Command::new(app_path)
                .arg(path)
                .spawn()
                .map_err(|e| format!("Failed to open with {}: {}", app_path, e))?;
            Ok(())
        }
    } else {
        let opener = app.opener();
        opener
            .open_path(path, None::<&str>)
            .map_err(|e| format!("Failed to open: {}", e))
    }
}

#[tauri::command]
pub fn load_profiles(app: AppHandle) -> Result<Vec<LaunchProfile>, String> {
    storage::load(&app)
}

#[tauri::command]
pub fn save_profiles(app: AppHandle, profiles: Vec<LaunchProfile>) -> Result<(), String> {
    storage::save(&app, &profiles)
}

#[tauri::command]
pub fn run_item(app: AppHandle, item_path: String, open_with: Option<String>) -> Result<(), String> {
    open_path_with(&app, &item_path, &open_with)
}

#[tauri::command]
pub fn run_profile(app: AppHandle, profile_id: String) -> Result<RunResult, String> {
    let profiles = storage::load(&app)?;

    let profile = profiles
        .iter()
        .find(|p| p.id == profile_id)
        .ok_or_else(|| format!("Profile not found: {}", profile_id))?;

    let current_platform = get_current_platform();
    let matching_items: Vec<_> = profile
        .items
        .iter()
        .filter(|item| {
            item.platform == Platform::Both
                || (current_platform == "macos" && item.platform == Platform::Macos)
                || (current_platform == "windows" && item.platform == Platform::Windows)
        })
        .collect();

    let total = matching_items.len();
    let mut succeeded = 0;
    let mut errors = Vec::new();

    for item in &matching_items {
        match open_path_with(&app, &item.path, &item.open_with) {
            Ok(_) => succeeded += 1,
            Err(e) => {
                errors.push(ItemError {
                    item_id: item.id.clone(),
                    label: item.label.clone(),
                    error: e,
                });
            }
        }
    }

    Ok(RunResult {
        total,
        succeeded,
        errors,
    })
}

#[tauri::command]
pub fn validate_path(path: String) -> bool {
    Path::new(&path).exists()
}

#[tauri::command]
pub fn get_current_platform() -> String {
    if cfg!(target_os = "macos") {
        "macos".to_string()
    } else if cfg!(target_os = "windows") {
        "windows".to_string()
    } else {
        "linux".to_string()
    }
}

#[tauri::command]
pub fn get_installed_apps() -> Vec<AppInfo> {
    list_installed_apps()
}

#[cfg(target_os = "windows")]
fn list_installed_apps() -> Vec<AppInfo> {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    let mut apps = Vec::new();
    let mut seen = HashSet::new();

    for root in ["HKLM", "HKCU"] {
        let key = format!(
            "{}\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths",
            root
        );

        let output = Command::new("reg")
            .args(["query", &key, "/s", "/ve"])
            .creation_flags(CREATE_NO_WINDOW)
            .output();

        let output = match output {
            Ok(o) => o,
            Err(_) => continue,
        };

        let stdout = String::from_utf8_lossy(&output.stdout);
        let mut current_exe: Option<String> = None;

        for line in stdout.lines() {
            let trimmed = line.trim();

            if trimmed.starts_with("HKEY_") {
                current_exe = trimmed.rsplit('\\').next().map(|s| s.to_string());
            } else if trimmed.contains("REG_SZ") {
                if let Some(ref exe_name) = current_exe {
                    if let Some(path_str) = trimmed.split("REG_SZ").last() {
                        let path_str = path_str.trim().to_string();
                        let lower = path_str.to_lowercase();
                        if !path_str.is_empty() && !seen.contains(&lower) {
                            seen.insert(lower);
                            let name = if let Some(pos) = exe_name.rfind('.') {
                                exe_name[..pos].to_string()
                            } else {
                                exe_name.clone()
                            };
                            apps.push(AppInfo {
                                name,
                                path: path_str,
                                icon: None,
                            });
                        }
                    }
                }
                current_exe = None;
            }
        }
    }

    apps.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    // Extract icons for all .exe apps in a single PowerShell call
    extract_icons_windows(&mut apps);

    apps
}

#[cfg(target_os = "windows")]
fn extract_icons_windows(apps: &mut Vec<AppInfo>) {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    // Only extract icons from .exe files (not .cmd, .bat, etc.)
    let exe_paths: Vec<&str> = apps
        .iter()
        .filter(|a| a.path.to_lowercase().ends_with(".exe"))
        .map(|a| a.path.as_str())
        .collect();

    if exe_paths.is_empty() {
        return;
    }

    let ps_array = exe_paths
        .iter()
        .map(|p| format!("'{}'", p.replace('\'', "''")))
        .collect::<Vec<_>>()
        .join(",");

    let script = format!(
        concat!(
            "Add-Type -AssemblyName System.Drawing;",
            "@({}) | ForEach-Object {{",
            " try {{",
            "  $i=[System.Drawing.Icon]::ExtractAssociatedIcon($_);",
            "  $b=New-Object System.Drawing.Bitmap($i.ToBitmap(),24,24);",
            "  $m=New-Object IO.MemoryStream;",
            "  $b.Save($m,[System.Drawing.Imaging.ImageFormat]::Png);",
            "  Write-Output (\"OK`t\" + $_ + \"`t\" + [Convert]::ToBase64String($m.ToArray()));",
            "  $m.Dispose();$b.Dispose();$i.Dispose()",
            " }} catch {{ Write-Output (\"ERR`t\" + $_ + \"`t\") }}",
            "}}"
        ),
        ps_array
    );

    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            &script,
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .output();

    if let Ok(output) = output {
        let stdout = String::from_utf8_lossy(&output.stdout);
        let mut icon_map: std::collections::HashMap<String, String> = std::collections::HashMap::new();

        for line in stdout.lines() {
            let parts: Vec<&str> = line.splitn(3, '\t').collect();
            if parts.len() == 3 && parts[0] == "OK" && !parts[2].is_empty() {
                icon_map.insert(parts[1].to_lowercase(), parts[2].to_string());
            }
        }

        for app in apps.iter_mut() {
            if let Some(icon) = icon_map.get(&app.path.to_lowercase()) {
                app.icon = Some(icon.clone());
            }
        }
    }
}

#[cfg(target_os = "macos")]
fn list_installed_apps() -> Vec<AppInfo> {
    let mut apps = Vec::new();
    for dir in ["/Applications", "/System/Applications"] {
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.filter_map(|e| e.ok()) {
                let path = entry.path();
                if path.extension().map_or(false, |ext| ext == "app") {
                    if let Some(name) = path.file_stem().map(|s| s.to_string_lossy().to_string()) {
                        if !name.is_empty() {
                            apps.push(AppInfo {
                                name,
                                path: path.to_string_lossy().to_string(),
                                icon: None,
                            });
                        }
                    }
                }
            }
        }
    }
    apps.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    apps
}

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
fn list_installed_apps() -> Vec<AppInfo> {
    Vec::new()
}

// ── Autostart ──────────────────────────────────────────────────────────────

const AUTOSTART_KEY: &str =
    "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run";
const AUTOSTART_NAME: &str = "OpenMyDear";

#[tauri::command]
pub fn get_autostart() -> bool {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        Command::new("reg")
            .args(["query", AUTOSTART_KEY, "/v", AUTOSTART_NAME])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }
    #[cfg(not(target_os = "windows"))]
    false
}

#[tauri::command]
pub fn set_autostart(_app: AppHandle, enabled: bool) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        if enabled {
            let exe = std::env::current_exe()
                .map_err(|e| e.to_string())?;
            let exe_str = exe.to_string_lossy().to_string();
            Command::new("reg")
                .args([
                    "add",
                    AUTOSTART_KEY,
                    "/v",
                    AUTOSTART_NAME,
                    "/t",
                    "REG_SZ",
                    "/d",
                    &exe_str,
                    "/f",
                ])
                .creation_flags(CREATE_NO_WINDOW)
                .output()
                .map_err(|e| e.to_string())?;
        } else {
            Command::new("reg")
                .args(["delete", AUTOSTART_KEY, "/v", AUTOSTART_NAME, "/f"])
                .creation_flags(CREATE_NO_WINDOW)
                .output()
                .map_err(|e| e.to_string())?;
        }
        Ok(())
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = (app, enabled); // not supported on non-Windows
        Ok(())
    }
}
