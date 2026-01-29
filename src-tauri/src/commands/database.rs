//! Database Connection Commands
//!
//! Handles database connection lifecycle operations.

use crate::state::AppState;
use crate::utils::{AppResult, AppError};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Represents a database connection
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseConnection {
    pub id: String,
    pub path: String,
    pub name: String,
    pub is_connected: bool,
    pub created_at: String,
}

/// Connect to a SQLite database
#[tauri::command]
pub async fn connect_database(
    app: tauri::AppHandle,
    state: tauri::State<'_, std::sync::Arc<AppState>>,
    path: String,
) -> AppResult<DatabaseConnection> {
    log::info!("Connecting to database: {}", path);

    // Note: sqlite3x will create the file if it doesn't exist

    // Generate connection ID
    let connection_id = Uuid::new_v4().to_string();

    // Extract filename for display
    let name = std::path::Path::new(&path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("Unknown")
        .to_string();

    // Actually connect using sqlite3x
    let db = crate::sqlite3x::wrapper::Database::open(&path)
        .map_err(|e| AppError::ConnectionError(format!("{:?}", e)))?;

    let connection = DatabaseConnection {
        id: connection_id.clone(),
        path: path.clone(),
        name,
        is_connected: true,
        created_at: chrono::Utc::now().to_rfc3339(),
    };

    // Store connection and handle in app state
    state.add_connection(connection.clone(), db)
        .map_err(|e| AppError::InternalError(e))?;

    // Setup data change hooks
    crate::events::data_change::setup_hooks(&app, &state, &connection_id);

    log::info!("Connected to database: {} (id: {})", path, connection_id);

    Ok(connection)
}

#[tauri::command]
pub async fn disconnect_database(
    state: tauri::State<'_, std::sync::Arc<AppState>>,
    connection_id: String,
) -> AppResult<()> {
    log::info!("Disconnecting from database: {}", connection_id);

    state.remove_connection(&connection_id)
        .map_err(|e| AppError::InternalError(e))?;

    log::info!("Disconnected from database: {}", connection_id);

    Ok(())
}

#[tauri::command]
pub async fn get_database_list(
    state: tauri::State<'_, std::sync::Arc<AppState>>,
) -> AppResult<Vec<DatabaseConnection>> {
    Ok(state.get_connections())
}

#[tauri::command]
pub async fn backup_database(
    state: tauri::State<'_, std::sync::Arc<AppState>>,
    connection_id: String,
    dest_path: String,
) -> AppResult<()> {
    log::info!("Backing up database {} to {}", connection_id, dest_path);

    let db_handle = state.get_db_handle(&connection_id)
        .ok_or_else(|| AppError::InternalError(format!("Connection not found: {}", connection_id)))?;

    let db = db_handle.lock();
    db.backup_to_file(&dest_path)
        .map_err(|e| AppError::InternalError(format!("{:?}", e)))?;

    Ok(())
}

#[tauri::command]
pub async fn restore_database(
    state: tauri::State<'_, std::sync::Arc<AppState>>,
    connection_id: String,
    src_path: String,
) -> AppResult<()> {
    log::info!("Restoring database {} from {}", connection_id, src_path);

    let db_handle = state.get_db_handle(&connection_id)
        .ok_or_else(|| AppError::InternalError(format!("Connection not found: {}", connection_id)))?;

    let db = db_handle.lock();
    db.restore_from_file(&src_path)
        .map_err(|e| AppError::InternalError(format!("{:?}", e)))?;

    Ok(())
}
