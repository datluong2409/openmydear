export type Platform = "macos" | "windows" | "both";
export type ItemType = "app" | "file" | "folder";

export interface LaunchItem {
  id: string;
  type: ItemType;
  label: string;
  path: string;
  platform: Platform;
  openWith?: string;
}

export interface LaunchProfile {
  id: string;
  name: string;
  items: LaunchItem[];
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
