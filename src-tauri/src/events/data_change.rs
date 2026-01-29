//! Data Change Events
//!
//! Monitors and emits data change events to the frontend.

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use rusqlite::hooks::Action;

/// Data change event payload
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DataChangeEvent {
    pub table: String,
    pub operation: String,
    pub rowid: i64,
    pub timestamp: String,
}

/// Emit a data change event to all listeners
pub fn emit_data_change(app: &AppHandle, event: DataChangeEvent) {
    if let Err(e) = app.emit("db:data_changed", &event) {
        log::error!("Failed to emit data change event: {}", e);
    }
}

/// Setup data change hooks for a database connection
pub fn setup_hooks(app: &AppHandle, state: &crate::state::AppState, connection_id: &str) {
    let db_handle = match state.get_db_handle(connection_id) {
        Some(handle) => handle,
        None => {
            log::error!("Cannot setup hooks: Connection {} not found", connection_id);
            return;
        }
    };

    let app_clone = std::panic::AssertUnwindSafe(app.clone());
    let db = db_handle.lock();

    if let Err(e) = db.on_update(move |action: Action, _db_name: &str, table: &str, rowid: i64| {
        let action_str = format!("{:?}", action);
        let operation = match action_str.as_str() {
            "Insert" => "INSERT",
            "Update" => "UPDATE",
            "Delete" => "DELETE",
            _ => "UNKNOWN",
        };

        let event = DataChangeEvent {
            table: table.to_string(),
            operation: operation.to_string(),
            rowid,
            timestamp: chrono::Utc::now().to_rfc3339(),
        };

        let app = &*app_clone;
        if let Err(e) = app.emit("db:data_changed", &event) {
            log::error!("Failed to emit data change event: {}", e);
        }
    }) {
        log::error!("Failed to register update hook for {}: {:?}", connection_id, e);
    } else {
        log::info!("Data change hooks established for connection: {}", connection_id);
    }
}
