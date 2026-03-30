export type Platform = "macos" | "windows" | "both";
export type ItemType = "app" | "file" | "folder";
export type LaunchMode = "parallel" | "sequential";

export interface LaunchItem {
  id: string;
  type: ItemType;
  label: string;
  path: string;
  platform: Platform;
  icon?: string;
  openWith?: string;
  openWithName?: string;
  openWithIcon?: string;
}

export interface LaunchProfile {
  id: string;
  name: string;
  items: LaunchItem[];
  launchMode: LaunchMode;
  delaySeconds: number;
}

export interface ItemError {
  item_id: string;
  label: string;
  error: string;
}

export interface RunResult {
  total: number;
  succeeded: number;
  errors: ItemError[];
}

export interface AppInfo {
  name: string;
  path: string;
  icon?: string;
}
