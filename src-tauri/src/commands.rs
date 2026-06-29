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

    match open_with {
        Some(app_path) if !app_path.is_empty() => {
            Command::new(app_path)
                .arg(path)
                .spawn()
                .map_err(|e| format!("Failed to open with {}: {}", app_path, e))?;
            Ok(())
        }
        _ => default_open(app, path),
    }
}

/// Open a path with the system default handler. On Linux, executable files are
/// spawned directly — `xdg-open` would only "open" a binary (e.g. in an editor)
/// rather than launch it; files and folders still go through the opener.
fn default_open(app: &AppHandle, path: &str) -> Result<(), String> {
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        use std::os::unix::fs::PermissionsExt;
        if let Ok(meta) = std::fs::metadata(path) {
            if meta.is_file() && meta.permissions().mode() & 0o111 != 0 {
                return Command::new(path)
                    .spawn()
                    .map(|_| ())
                    .map_err(|e| format!("Failed to launch: {}", e));
            }
        }
    }
    let opener = app.opener();
    opener
        .open_path(path, None::<&str>)
        .map_err(|e| format!("Failed to open: {}", e))
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
            item.platform == Platform::Both || item.platform.as_str() == current_platform
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

    let mut dirs = vec![
        "/Applications".to_string(),
        "/System/Applications".to_string(),
    ];
    if let Ok(home) = std::env::var("HOME") {
        dirs.push(format!("{}/Applications", home));
    }

    for dir in &dirs {
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
    extract_icons_macos(&mut apps);
    apps
}

#[cfg(target_os = "macos")]
fn extract_icons_macos(apps: &mut Vec<AppInfo>) {
    if apps.is_empty() {
        return;
    }

    // Single bash call processes all apps: reads Info.plist, converts icns→png via sips,
    // encodes base64, outputs "PATH\tBASE64" per line.
    // Paths are passed as positional args ($@) to avoid shell injection.
    const SCRIPT: &str = r#"
for app_path in "$@"; do
    plist="$app_path/Contents/Info.plist"
    icon_name=$(/usr/libexec/PlistBuddy -c "Print CFBundleIconFile" "$plist" 2>/dev/null)
    [ -z "$icon_name" ] && continue
    case "$icon_name" in *.icns) ;; *) icon_name="${icon_name}.icns" ;; esac
    icns="$app_path/Contents/Resources/$icon_name"
    [ ! -f "$icns" ] && continue
    tmp=$(mktemp /tmp/omd_XXXXXX.png)
    sips -s format png -Z 32 "$icns" --out "$tmp" >/dev/null 2>&1
    if [ -s "$tmp" ]; then
        printf '%s\t%s\n' "$app_path" "$(base64 -i "$tmp")"
    fi
    rm -f "$tmp"
done
"#;

    let mut cmd = Command::new("bash");
    cmd.args(["-c", SCRIPT, "--"]);
    for app in apps.iter() {
        cmd.arg(&app.path);
    }

    let output = match cmd.output() {
        Ok(o) => o,
        Err(_) => return,
    };

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut icon_map: std::collections::HashMap<String, String> =
        std::collections::HashMap::new();

    for line in stdout.lines() {
        let mut parts = line.splitn(2, '\t');
        if let (Some(path), Some(b64)) = (parts.next(), parts.next()) {
            if !b64.is_empty() {
                icon_map.insert(path.to_string(), b64.to_string());
            }
        }
    }

    for app in apps.iter_mut() {
        if let Some(icon) = icon_map.get(&app.path) {
            app.icon = Some(icon.clone());
        }
    }
}

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
fn list_installed_apps() -> Vec<AppInfo> {
    use std::collections::HashSet;
    use std::path::PathBuf;

    let mut apps = Vec::new();
    let mut seen = HashSet::new();

    // Standard XDG application directories + Flatpak exports.
    let mut dirs: Vec<PathBuf> = vec![
        PathBuf::from("/usr/share/applications"),
        PathBuf::from("/usr/local/share/applications"),
        PathBuf::from("/var/lib/flatpak/exports/share/applications"),
    ];
    if let Ok(home) = std::env::var("HOME") {
        dirs.push(PathBuf::from(format!("{}/.local/share/applications", home)));
        dirs.push(PathBuf::from(format!(
            "{}/.local/share/flatpak/exports/share/applications",
            home
        )));
    }

    for dir in &dirs {
        let entries = match std::fs::read_dir(dir) {
            Ok(e) => e,
            Err(_) => continue,
        };
        for entry in entries.filter_map(|e| e.ok()) {
            let path = entry.path();
            if path.extension().map_or(false, |ext| ext == "desktop") {
                if let Some(app) = parse_desktop_file(&path) {
                    if seen.insert(app.path.to_lowercase()) {
                        apps.push(app);
                    }
                }
            }
        }
    }

    apps.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    apps
}

/// Parse a freedesktop `.desktop` entry into an AppInfo whose `path` is the
/// resolved, absolute executable. Returns None for hidden/non-application
/// entries or when the binary can't be resolved on $PATH.
#[cfg(not(any(target_os = "windows", target_os = "macos")))]
fn parse_desktop_file(path: &Path) -> Option<AppInfo> {
    let content = std::fs::read_to_string(path).ok()?;

    let mut name: Option<String> = None;
    let mut exec: Option<String> = None;
    let mut no_display = false;
    let mut is_application = true;
    let mut in_entry = false;

    for line in content.lines() {
        let line = line.trim();
        if line.starts_with('[') {
            // Only read the main [Desktop Entry] group, not action groups.
            in_entry = line == "[Desktop Entry]";
            continue;
        }
        if !in_entry {
            continue;
        }
        // Take the first un-localized key (skip e.g. `Name[fr]=`).
        if let Some(v) = line.strip_prefix("Name=") {
            name.get_or_insert_with(|| v.trim().to_string());
        } else if let Some(v) = line.strip_prefix("Exec=") {
            exec.get_or_insert_with(|| v.trim().to_string());
        } else if let Some(v) = line.strip_prefix("NoDisplay=") {
            no_display = v.trim().eq_ignore_ascii_case("true");
        } else if let Some(v) = line.strip_prefix("Type=") {
            is_application = v.trim().eq_ignore_ascii_case("application");
        }
    }

    if no_display || !is_application {
        return None;
    }

    let name = name?;
    // First token of Exec is the binary; later tokens / %-field-codes are args.
    let binary = exec?.split_whitespace().next()?.to_string();
    let resolved = resolve_in_path(&binary)?;

    Some(AppInfo {
        name,
        path: resolved,
        icon: None,
    })
}

/// Resolve a binary name to an absolute path via $PATH; pass through absolute
/// paths that exist. Returns None if not found.
#[cfg(not(any(target_os = "windows", target_os = "macos")))]
fn resolve_in_path(binary: &str) -> Option<String> {
    let p = Path::new(binary);
    if p.is_absolute() {
        return if p.exists() {
            Some(binary.to_string())
        } else {
            None
        };
    }
    let path_var = std::env::var("PATH").ok()?;
    for dir in path_var.split(':') {
        if dir.is_empty() {
            continue;
        }
        let candidate = Path::new(dir).join(binary);
        if candidate.exists() {
            return Some(candidate.to_string_lossy().to_string());
        }
    }
    None
}

// ── Autostart ──────────────────────────────────────────────────────────────

const AUTOSTART_KEY: &str = "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run";
const AUTOSTART_NAME: &str = "OpenMyDear";

/// Path to the XDG autostart `.desktop` entry on Linux/BSD.
#[cfg(all(unix, not(target_os = "macos")))]
fn linux_autostart_path() -> Option<std::path::PathBuf> {
    let config_home = std::env::var("XDG_CONFIG_HOME")
        .ok()
        .filter(|s| !s.is_empty())
        .or_else(|| std::env::var("HOME").ok().map(|h| format!("{}/.config", h)))?;
    Some(
        std::path::PathBuf::from(config_home)
            .join("autostart")
            .join("OpenMyDear.desktop"),
    )
}

#[tauri::command]
pub fn get_storage_dir(app: AppHandle) -> Result<String, String> {
    storage::get_storage_dir(&app)
}

#[tauri::command]
pub fn set_storage_dir(app: AppHandle, path: String) -> Result<(), String> {
    storage::set_storage_dir(&app, &path)
}

#[tauri::command]
pub fn get_always_on_top(app: AppHandle) -> bool {
    storage::get_always_on_top(&app)
}

#[tauri::command]
pub fn set_always_on_top(app: AppHandle, enabled: bool) -> Result<(), String> {
    storage::set_always_on_top(&app, enabled)
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
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        linux_autostart_path().map_or(false, |p| p.exists())
    }
    #[cfg(not(any(target_os = "windows", all(unix, not(target_os = "macos")))))]
    {
        false
    }
}

#[tauri::command]
pub fn set_autostart(app: AppHandle, enabled: bool) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        let _ = &app;

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
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        let _ = app;
        let path = linux_autostart_path().ok_or("Cannot resolve autostart directory")?;
        if enabled {
            if let Some(parent) = path.parent() {
                std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }
            let exe = std::env::current_exe().map_err(|e| e.to_string())?;
            let content = format!(
                "[Desktop Entry]\nType=Application\nName=OpenMyDear\nExec={}\nX-GNOME-Autostart-enabled=true\n",
                exe.to_string_lossy()
            );
            std::fs::write(&path, content).map_err(|e| e.to_string())?;
        } else if path.exists() {
            std::fs::remove_file(&path).map_err(|e| e.to_string())?;
        }
        Ok(())
    }
    #[cfg(not(any(target_os = "windows", all(unix, not(target_os = "macos")))))]
    {
        let _ = (app, enabled); // not supported on this platform
        Ok(())
    }
}
