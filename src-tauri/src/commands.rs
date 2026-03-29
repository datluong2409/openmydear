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
pub fn run_item(
    app: AppHandle,
    item_path: String,
    open_with: Option<String>,
) -> Result<(), String> {
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
    use std::collections::HashSet;
    use std::os::windows::process::CommandExt;
    use std::path::Path;
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    let mut apps = Vec::new();
    let mut seen = HashSet::new();

    // ── Source 1: Registry App Paths ─────────────────────────────────────
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

    // ── Source 2: Start Menu shortcuts (.lnk) ────────────────────────────
    let mut lnk_files: Vec<String> = Vec::new();
    let start_menu_dirs: Vec<String> = [
        std::env::var("ProgramData")
            .ok()
            .map(|d| d + "\\Microsoft\\Windows\\Start Menu\\Programs"),
        std::env::var("AppData")
            .ok()
            .map(|d| d + "\\Microsoft\\Windows\\Start Menu\\Programs"),
    ]
    .into_iter()
    .flatten()
    .collect();

    fn collect_lnk_files(dir: &Path, out: &mut Vec<String>) {
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.filter_map(|e| e.ok()) {
                let path = entry.path();
                if path.is_dir() {
                    collect_lnk_files(&path, out);
                } else if path
                    .extension()
                    .map_or(false, |ext| ext.eq_ignore_ascii_case("lnk"))
                {
                    out.push(path.to_string_lossy().to_string());
                }
            }
        }
    }

    for dir in &start_menu_dirs {
        collect_lnk_files(Path::new(dir), &mut lnk_files);
    }

    if !lnk_files.is_empty() {
        // Resolve .lnk targets in a single PowerShell call
        let ps_array = lnk_files
            .iter()
            .map(|p| format!("'{}'", p.replace('\'', "''")))
            .collect::<Vec<_>>()
            .join(",");

        let script = format!(
            concat!(
                "$ws=New-Object -ComObject WScript.Shell;",
                "@({}) | ForEach-Object {{",
                " try {{",
                "  $s=$ws.CreateShortcut($_);",
                "  Write-Output ($_ + \"`t\" + $s.TargetPath)",
                " }} catch {{",
                "  Write-Output ($_ + \"`t\")",
                " }}",
                "}}"
            ),
            ps_array
        );

        if let Ok(output) = Command::new("powershell")
            .args([
                "-NoProfile",
                "-NonInteractive",
                "-ExecutionPolicy",
                "Bypass",
                "-Command",
                &script,
            ])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
        {
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines() {
                let parts: Vec<&str> = line.splitn(2, '\t').collect();
                if parts.len() == 2 {
                    let lnk_path = parts[0].trim();
                    let target = parts[1].trim().to_string();
                    if target.is_empty() {
                        continue;
                    }
                    let lower = target.to_lowercase();
                    if !lower.ends_with(".exe") || seen.contains(&lower) {
                        continue;
                    }
                    seen.insert(lower);
                    // Use the .lnk filename (without extension) as the display name
                    let name = Path::new(lnk_path)
                        .file_stem()
                        .map(|s| s.to_string_lossy().to_string())
                        .unwrap_or_default();
                    if !name.is_empty() {
                        apps.push(AppInfo {
                            name,
                            path: target,
                            icon: None,
                        });
                    }
                }
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

    // Only extract icons/metadata from .exe files (not .cmd, .bat, etc.)
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

    // Combined script: extract both FileDescription (friendly name) and icon in one pass
    // Output format per line: STATUS\tPATH\tFILE_DESCRIPTION\tBASE64_ICON
    let script = format!(
        concat!(
            "Add-Type -AssemblyName System.Drawing;",
            "@({}) | ForEach-Object {{",
            " $p=$_;",
            " try {{",
            "  $vi=[System.Diagnostics.FileVersionInfo]::GetVersionInfo($p);",
            "  $fd=if($vi.FileDescription){{$vi.FileDescription}}else{{''}};",
            "  try {{",
            "   $ic=[System.Drawing.Icon]::ExtractAssociatedIcon($p);",
            "   $bm=New-Object System.Drawing.Bitmap($ic.ToBitmap(),24,24);",
            "   $ms=New-Object IO.MemoryStream;",
            "   $bm.Save($ms,[System.Drawing.Imaging.ImageFormat]::Png);",
            "   $b64=[Convert]::ToBase64String($ms.ToArray());",
            "   $ms.Dispose();$bm.Dispose();$ic.Dispose();",
            "   Write-Output (\"OK`t\" + $p + \"`t\" + $fd + \"`t\" + $b64)",
            "  }} catch {{",
            "   Write-Output (\"OK`t\" + $p + \"`t\" + $fd + \"`t\")",
            "  }}",
            " }} catch {{",
            "  Write-Output (\"ERR`t\" + $p + \"`t`t\")",
            " }}",
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
        // Maps: lowercase path -> (friendly_name, icon_base64)
        let mut meta_map: std::collections::HashMap<String, (String, String)> =
            std::collections::HashMap::new();

        for line in stdout.lines() {
            let parts: Vec<&str> = line.splitn(4, '\t').collect();
            if parts.len() == 4 && parts[0] == "OK" {
                let path_key = parts[1].to_lowercase();
                let friendly = parts[2].trim().to_string();
                let icon_b64 = parts[3].to_string();
                meta_map.insert(path_key, (friendly, icon_b64));
            }
        }

        for app in apps.iter_mut() {
            if let Some((friendly, icon_b64)) = meta_map.get(&app.path.to_lowercase()) {
                // Use FileDescription as display name if non-empty
                if !friendly.is_empty() {
                    app.name = friendly.clone();
                }
                if !icon_b64.is_empty() {
                    app.icon = Some(icon_b64.clone());
                }
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

const AUTOSTART_KEY: &str = "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run";
const AUTOSTART_NAME: &str = "OpenMyDear";

#[tauri::command]
pub fn get_storage_dir(app: AppHandle) -> Result<String, String> {
    storage::get_storage_dir(&app)
}

#[tauri::command]
pub fn set_storage_dir(app: AppHandle, path: String) -> Result<(), String> {
    storage::set_storage_dir(&app, &path)
}

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
pub fn set_autostart(app: AppHandle, enabled: bool) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        if enabled {
            let exe = std::env::current_exe().map_err(|e| e.to_string())?;
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
