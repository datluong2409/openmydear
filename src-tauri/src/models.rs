use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Platform {
    Macos,
    Windows,
    Linux,
    Both,
}

impl Platform {
    /// Lowercase string form, matching `get_current_platform()` output.
    pub fn as_str(&self) -> &'static str {
        match self {
            Platform::Macos => "macos",
            Platform::Windows => "windows",
            Platform::Linux => "linux",
            Platform::Both => "both",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ItemType {
    App,
    File,
    Folder,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LaunchItem {
    pub id: String,
    #[serde(rename = "type")]
    pub item_type: ItemType,
    pub label: String,
    pub path: String,
    pub platform: Platform,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub icon: Option<String>,
    #[serde(rename = "openWith", default, skip_serializing_if = "Option::is_none")]
    pub open_with: Option<String>,
    #[serde(
        rename = "openWithName",
        default,
        skip_serializing_if = "Option::is_none"
    )]
    pub open_with_name: Option<String>,
    #[serde(
        rename = "openWithIcon",
        default,
        skip_serializing_if = "Option::is_none"
    )]
    pub open_with_icon: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum LaunchMode {
    Parallel,
    Sequential,
}

impl Default for LaunchMode {
    fn default() -> Self {
        LaunchMode::Sequential
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LaunchProfile {
    pub id: String,
    pub name: String,
    pub items: Vec<LaunchItem>,
    #[serde(rename = "launchMode", default)]
    pub launch_mode: LaunchMode,
    #[serde(rename = "delaySeconds", default = "default_delay")]
    pub delay_seconds: f64,
}

fn default_delay() -> f64 {
    2.0
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ItemError {
    pub item_id: String,
    pub label: String,
    pub error: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RunResult {
    pub total: usize,
    pub succeeded: usize,
    pub errors: Vec<ItemError>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppInfo {
    pub name: String,
    pub path: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub icon: Option<String>,
}
