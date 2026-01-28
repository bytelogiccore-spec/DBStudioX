//! File Operation Commands
//!
//! Handles file dialogs and data export operations.

use crate::commands::query::QueryResult;
use crate::utils::{AppResult, AppError};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri_plugin_dialog::DialogExt;

/// File entry for directory listing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub modified: Option<u64>,
    pub extension: Option<String>,
}

/// Represents a disk/drive on the system
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DriveInfo {
    pub name: String,
    pub path: String,
    pub is_removable: bool,
}

/// Open file dialog to select a database
#[tauri::command]
pub async fn open_file_dialog(app: tauri::AppHandle) -> AppResult<Option<String>> {
    log::info!("Opening file dialog");

    let file = app
        .dialog()
        .file()
        .add_filter("SQLite Database", &["db", "sqlite", "sqlite3", "db3"])
        .add_filter("All Files", &["*"])
        .blocking_pick_file();

    match file {
        Some(path) => {
            let path_str = path.to_string();
            log::info!("Selected file: {}", path_str);
            Ok(Some(path_str))
        }
        None => {
            log::info!("File dialog cancelled");
            Ok(None)
        }
    }
}

/// Open save file dialog for export
#[tauri::command]
pub async fn save_file_dialog(app: tauri::AppHandle, default_name: String) -> AppResult<Option<String>> {
    log::info!("Opening save file dialog with default name: {}", default_name);

    let file = app
        .dialog()
        .file()
        .set_file_name(&default_name)
        .add_filter("CSV", &["csv"])
        .add_filter("JSON", &["json"])
        .add_filter("SQL", &["sql"])
        .blocking_save_file();

    match file {
        Some(path) => {
            let path_str = path.to_string();
            log::info!("Save path selected: {}", path_str);
            Ok(Some(path_str))
        }
        None => {
            log::info!("Save dialog cancelled");
            Ok(None)
        }
    }
}

/// Open save file dialog for creating a new database
#[tauri::command]
pub async fn create_database_dialog(app: tauri::AppHandle, default_name: String) -> AppResult<Option<String>> {
    log::info!("Opening create database dialog with default name: {}", default_name);

    let file = app
        .dialog()
        .file()
        .set_file_name(&default_name)
        .add_filter("SQLite Database", &["db", "sqlite", "sqlite3", "db3"])
        .add_filter("All Files", &["*"])
        .blocking_save_file();

    match file {
        Some(path) => {
            let path_str = path.to_string();
            log::info!("Create database path selected: {}", path_str);
            Ok(Some(path_str))
        }
        None => {
            log::info!("Create database dialog cancelled");
            Ok(None)
        }
    }
}

/// Export query result to file
#[tauri::command]
pub async fn export_query_result(result: QueryResult, format: String, output_path: String) -> AppResult<()> {
    log::info!("Exporting query result to {} as {}", output_path, format);

    let content = match format.as_str() {
        "csv" => export_to_csv(&result)?,
        "json" => export_to_json(&result)?,
        "sql" => export_to_sql(&result)?,
        _ => return Err(AppError::CommandError(format!("Unsupported export format: {}", format))),
    };

    std::fs::write(&output_path, content)
        .map_err(|e| AppError::FsError(format!("Failed to write file: {}", e)))?;

    log::info!("Export completed: {}", output_path);

    Ok(())
}

fn export_to_csv(result: &QueryResult) -> AppResult<String> {
    let mut csv = String::new();

    // Header
    let column_names: Vec<String> = result.columns.iter().map(|c| c.name.clone()).collect();
    csv.push_str(&column_names.join(","));
    csv.push('\n');

    // Rows
    for row in &result.rows {
        let row_str: Vec<String> = row
            .iter()
            .map(|v| match v {
                serde_json::Value::String(s) => format!("\"{}\"", s.replace('"', "\"\"")),
                serde_json::Value::Null => String::new(),
                other => other.to_string(),
            })
            .collect();
        csv.push_str(&row_str.join(","));
        csv.push('\n');
    }

    Ok(csv)
}

fn export_to_json(result: &QueryResult) -> AppResult<String> {
    // Convert to array of objects
    let rows: Vec<serde_json::Map<String, serde_json::Value>> = result
        .rows
        .iter()
        .map(|row| {
            result
                .columns
                .iter()
                .zip(row.iter())
                .map(|(col, val)| (col.name.clone(), val.clone()))
                .collect()
        })
        .collect();

    serde_json::to_string_pretty(&rows).map_err(|e| AppError::SerializationError(format!("JSON serialization error: {}", e)))
}

fn export_to_sql(result: &QueryResult) -> AppResult<String> {
    let mut sql = String::new();

    // We need a table name - use a placeholder
    let table_name = "exported_data";
    let column_names: Vec<String> = result.columns.iter().map(|c| c.name.clone()).collect();

    for row in &result.rows {
        let values: Vec<String> = row
            .iter()
            .map(|v| match v {
                serde_json::Value::String(s) => format!("'{}'", s.replace('\'', "''")),
                serde_json::Value::Null => "NULL".to_string(),
                other => other.to_string(),
            })
            .collect();

        sql.push_str(&format!(
            "INSERT INTO {} ({}) VALUES ({});\n",
            table_name,
            column_names.join(", "),
            values.join(", ")
        ));
    }

    Ok(sql)
}

// ============================================================================
// File System Navigation Commands
// ============================================================================

/// List contents of a directory
#[tauri::command]
pub async fn list_directory(path: String) -> AppResult<Vec<FileEntry>> {
    log::info!("Listing directory: {}", path);
    
    let dir_path = PathBuf::from(&path);
    
    if !dir_path.exists() {
        return Err(AppError::NotFound(format!("Directory does not exist: {}", path)));
    }
    
    if !dir_path.is_dir() {
        return Err(AppError::CommandError(format!("Path is not a directory: {}", path)));
    }
    
    let mut entries = Vec::new();
    
    let read_dir = std::fs::read_dir(&dir_path)
        .map_err(|e| AppError::FsError(format!("Failed to read directory: {}", e)))?;
    
    for entry in read_dir {
        if let Ok(entry) = entry {
            let path = entry.path();
            let metadata = entry.metadata().ok();
            
            let name = entry.file_name().to_string_lossy().to_string();
            let is_dir = path.is_dir();
            let size = metadata.as_ref().map(|m| m.len()).unwrap_or(0);
            let modified = metadata.as_ref().and_then(|m| {
                m.modified().ok().and_then(|t| {
                    t.duration_since(std::time::UNIX_EPOCH).ok().map(|d| d.as_secs())
                })
            });
            let extension = if is_dir {
                None
            } else {
                path.extension().map(|e| e.to_string_lossy().to_string())
            };
            
            entries.push(FileEntry {
                name,
                path: path.to_string_lossy().to_string(),
                is_dir,
                size,
                modified,
                extension,
            });
        }
    }
    
    // Sort: directories first, then by name
    entries.sort_by(|a, b| {
        match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });
    
    Ok(entries)
}

/// Get available drives (Windows) or mount points
#[tauri::command]
pub async fn get_drives() -> AppResult<Vec<DriveInfo>> {
    log::info!("Getting available drives");
    
    let mut drives = Vec::new();
    
    #[cfg(target_os = "windows")]
    {
        // On Windows, check common drive letters
        for letter in b'A'..=b'Z' {
            let drive_path = format!("{}:\\", letter as char);
            let path = PathBuf::from(&drive_path);
            if path.exists() {
                drives.push(DriveInfo {
                    name: format!("{}: Drive", letter as char),
                    path: drive_path,
                    is_removable: false, // Simplified; could use Windows API for accurate info
                });
            }
        }
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        // On Unix-like systems, common mount points
        let common_paths = vec![
            ("/", "Root"),
            ("/home", "Home"),
            ("/mnt", "Mounts"),
            ("/media", "Media"),
        ];
        
        for (path, name) in common_paths {
            let p = PathBuf::from(path);
            if p.exists() {
                drives.push(DriveInfo {
                    name: name.to_string(),
                    path: path.to_string(),
                    is_removable: false,
                });
            }
        }
    }
    
    Ok(drives)
}

/// Get user's home directory
#[tauri::command]
pub async fn get_home_directory() -> AppResult<String> {
    log::info!("Getting home directory");
    
    dirs::home_dir()
        .map(|p| p.to_string_lossy().to_string())
        .ok_or_else(|| AppError::NotFound("Could not determine home directory".to_string()))
}

/// Get special directories (Desktop, Documents, Downloads, etc.)
#[tauri::command]
pub async fn get_special_directories() -> AppResult<Vec<DriveInfo>> {
    log::info!("Getting special directories");
    
    let mut dirs_list = Vec::new();
    
    if let Some(home) = dirs::home_dir() {
        dirs_list.push(DriveInfo {
            name: "Home".to_string(),
            path: home.to_string_lossy().to_string(),
            is_removable: false,
        });
    }
    
    if let Some(desktop) = dirs::desktop_dir() {
        dirs_list.push(DriveInfo {
            name: "Desktop".to_string(),
            path: desktop.to_string_lossy().to_string(),
            is_removable: false,
        });
    }
    
    if let Some(documents) = dirs::document_dir() {
        dirs_list.push(DriveInfo {
            name: "Documents".to_string(),
            path: documents.to_string_lossy().to_string(),
            is_removable: false,
        });
    }
    
    if let Some(downloads) = dirs::download_dir() {
        dirs_list.push(DriveInfo {
            name: "Downloads".to_string(),
            path: downloads.to_string_lossy().to_string(),
            is_removable: false,
        });
    }
    
    Ok(dirs_list)
}

/// Check if a path exists and is a file
#[tauri::command]
pub async fn path_exists(path: String) -> AppResult<bool> {
    let p = PathBuf::from(&path);
    Ok(p.exists() && p.is_file())
}

/// Create a new directory
#[tauri::command]
pub async fn create_directory(path: String) -> AppResult<()> {
    log::info!("Creating directory: {}", path);
    std::fs::create_dir_all(&path)
        .map_err(|e| AppError::FsError(format!("Failed to create directory: {}", e)))
}

/// Get parent directory path
#[tauri::command]
pub async fn get_parent_directory(path: String) -> AppResult<Option<String>> {
    let p = PathBuf::from(&path);
    Ok(p.parent().map(|p| p.to_string_lossy().to_string()))
}
