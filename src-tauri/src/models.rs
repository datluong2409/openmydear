use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Platform {
    Macos,
    Windows,
    Both,
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
    #[serde(rename = "openWith", default, skip_serializing_if = "Option::is_none")]
    pub open_with: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LaunchProfile {
    pub id: String,
    pub name: String,
    pub items: Vec<LaunchItem>,
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
