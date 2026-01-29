//! Transaction Management Commands
//!
//! Handles database transaction lifecycle.

use crate::state::AppState;
use crate::utils::{AppResult, AppError};
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
        return Err(AppError::NotFound(format!("Connection not found: {}", connection_id)));
    }

    // Generate transaction ID
    let transaction_id = Uuid::new_v4().to_string();

    // Get DB handle
    let db_handle = state.get_db_handle(&connection_id)
        .ok_or_else(|| AppError::NotFound(format!("Connection not found: {}", connection_id)))?;

    // Actually begin transaction using sqlite3x
    {
        let db = db_handle.lock();
        db.execute("BEGIN TRANSACTION")
            .map_err(|e| AppError::QueryError(format!("Failed to begin transaction: {:?}", e)))?;
    }

    // Add to state
    if let Err(e) = state.add_transaction(&connection_id, &transaction_id) {
        // Attempt to rollback if adding to state fails
        let db = db_handle.lock();
        let _ = db.execute("ROLLBACK");
        return Err(AppError::InternalError(e));
    }

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

    // Get transaction info to find connection
    let transaction = state.get_transaction(&transaction_id)
        .ok_or_else(|| AppError::NotFound(format!("Transaction not found: {}", transaction_id)))?;

    let connection_id = transaction.connection_id;

    // Get DB handle
    let db_handle = state.get_db_handle(&connection_id)
        .ok_or_else(|| AppError::NotFound(format!("Connection not found: {}", connection_id)))?;

    // Actually commit transaction using sqlite3x
    {
        let db = db_handle.lock();
        db.execute("COMMIT")
            .map_err(|e| AppError::QueryError(format!("Failed to commit transaction: {:?}", e)))?;
    }

    state.remove_transaction(&transaction_id)
        .map_err(|e| AppError::InternalError(e))?;

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

    // Get transaction info to find connection
    let transaction = state.get_transaction(&transaction_id)
        .ok_or_else(|| AppError::NotFound(format!("Transaction not found: {}", transaction_id)))?;

    let connection_id = transaction.connection_id;

    // Get DB handle
    let db_handle = state.get_db_handle(&connection_id)
        .ok_or_else(|| AppError::NotFound(format!("Connection not found: {}", connection_id)))?;

    // Actually rollback transaction using sqlite3x
    {
        let db = db_handle.lock();
        db.execute("ROLLBACK")
            .map_err(|e| AppError::QueryError(format!("Failed to rollback transaction: {:?}", e)))?;
    }

    state.remove_transaction(&transaction_id)
        .map_err(|e| AppError::InternalError(e))?;

    log::info!("Transaction rolled back: {}", transaction_id);

    Ok(())
}
