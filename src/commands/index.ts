import { invoke } from "@tauri-apps/api/core";
import type { AppInfo, LaunchProfile, RunResult } from "../types";

export async function loadProfiles(): Promise<LaunchProfile[]> {
  return invoke<LaunchProfile[]>("load_profiles");
}

export async function saveProfiles(
  profiles: LaunchProfile[]
): Promise<void> {
  return invoke("save_profiles", { profiles });
}

export async function runProfile(profileId: string): Promise<RunResult> {
  return invoke<RunResult>("run_profile", { profileId });
}

export async function runItem(
  itemPath: string,
  openWith?: string
): Promise<void> {
  return invoke("run_item", { itemPath, openWith: openWith || null });
}

export async function validatePath(path: string): Promise<boolean> {
  return invoke<boolean>("validate_path", { path });
}

export async function getCurrentPlatform(): Promise<string> {
  return invoke<string>("get_current_platform");
}

export async function getInstalledApps(): Promise<AppInfo[]> {
  return invoke<AppInfo[]>("get_installed_apps");
}

export async function getStorageDir(): Promise<string> {
  return invoke<string>("get_storage_dir");
}

export async function setStorageDir(path: string): Promise<void> {
  return invoke("set_storage_dir", { path });
}

export async function getAutostart(): Promise<boolean> {
  return invoke<boolean>("get_autostart");
}

export async function setAutostart(enabled: boolean): Promise<void> {
  return invoke("set_autostart", { enabled });
}

export async function getAlwaysOnTop(): Promise<boolean> {
  return invoke<boolean>("get_always_on_top");
}

export async function setAlwaysOnTop(enabled: boolean): Promise<void> {
  return invoke("set_always_on_top", { enabled });
}
