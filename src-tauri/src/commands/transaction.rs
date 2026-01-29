//! Transaction Management Commands
//!
//! Handles database transaction lifecycle.

use crate::state::AppState;
use crate::utils::{AppError, AppResult};
use uuid::Uuid;

/// Begin a new transaction
#[tauri::command]
pub async fn begin_transaction(
    state: tauri::State<'_, std::sync::Arc<AppState>>,
    connection_id: String,
) -> AppResult<String> {
    log::info!("Beginning transaction on connection: {}", connection_id);

    // Verify connection exists
    if !state.has_connection(&connection_id) {
        return Err(AppError::NotFound(format!(
            "Connection not found: {}",
            connection_id
        )));
    }

    // Generate transaction ID
    let transaction_id = Uuid::new_v4().to_string();

    // TODO: Actually begin transaction using sqlite3x

    state
        .add_transaction(&connection_id, &transaction_id)
        .map_err(AppError::InternalError)?;

    log::info!("Transaction started: {}", transaction_id);

    Ok(transaction_id)
}

/// Commit a transaction
#[tauri::command]
pub async fn commit_transaction(
    state: tauri::State<'_, std::sync::Arc<AppState>>,
    transaction_id: String,
) -> AppResult<()> {
    log::info!("Committing transaction: {}", transaction_id);

    // TODO: Actually commit transaction using sqlite3x

    state
        .remove_transaction(&transaction_id)
        .map_err(AppError::InternalError)?;

    log::info!("Transaction committed: {}", transaction_id);

    Ok(())
}

/// Rollback a transaction
#[tauri::command]
pub async fn rollback_transaction(
    state: tauri::State<'_, std::sync::Arc<AppState>>,
    transaction_id: String,
) -> AppResult<()> {
    log::info!("Rolling back transaction: {}", transaction_id);

    // TODO: Actually rollback transaction using sqlite3x

    state
        .remove_transaction(&transaction_id)
        .map_err(AppError::InternalError)?;

    log::info!("Transaction rolled back: {}", transaction_id);

    Ok(())
}
