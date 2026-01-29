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

    // TODO: Actually begin transaction using sqlite3x

    state.add_transaction(&connection_id, &transaction_id)
        .map_err(|e| AppError::InternalError(e))?;

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

    state.remove_transaction(&transaction_id)
        .map_err(|e| AppError::InternalError(e))?;

    log::info!("Transaction committed: {}", transaction_id);

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::sqlite3x::wrapper::Database;
    use crate::commands::database::DatabaseConnection;
    use std::sync::Arc;

    #[tokio::test]
    async fn test_rollback_transaction() {
        // 1. Initialize AppState
        let state = Arc::new(AppState::new());

        // 2. Open in-memory database
        let db = Database::open(":memory:").expect("Failed to open memory db");

        // 3. Add connection to state
        let connection_id = "test-conn".to_string();
        let connection = DatabaseConnection {
            id: connection_id.clone(),
            path: ":memory:".to_string(),
            name: "Memory DB".to_string(),
            is_connected: true,
            created_at: chrono::Utc::now().to_rfc3339(),
        };
        state.add_connection(connection, db).expect("Failed to add connection");

        // 4. Manually start transaction in DB
        let db_handle = state.get_db_handle(&connection_id).unwrap();
        {
            let db = db_handle.lock();
            db.execute("BEGIN").expect("Failed to begin transaction");

            // Create a table and insert data
            db.execute("CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)").expect("Failed to create table");
            db.execute("INSERT INTO test (name) VALUES ('test_val')").expect("Failed to insert");
        }

        // 5. Add transaction to state
        let transaction_id = "test-tx".to_string();
        state.add_transaction(&connection_id, &transaction_id).expect("Failed to add transaction");

        // 6. Rollback transaction
        rollback_transaction_impl(&state, transaction_id.clone()).await.expect("Rollback failed");

        // 7. Verify transaction removed from state
        assert!(state.get_transaction(&transaction_id).is_none());

        // 8. Verify data is gone (table should be gone if created in transaction)
        {
            let db = db_handle.lock();
            let result = db.execute("SELECT * FROM test");
            // Expect error because table does not exist
            assert!(result.is_err(), "Table 'test' should not exist after rollback");
        }
    }
}

/// Rollback a transaction
#[tauri::command]
pub async fn rollback_transaction(
    state: tauri::State<'_, std::sync::Arc<AppState>>,
    transaction_id: String,
) -> AppResult<()> {
    rollback_transaction_impl(&state, transaction_id).await
}

/// Implementation of rollback transaction logic
pub async fn rollback_transaction_impl(
    state: &std::sync::Arc<AppState>,
    transaction_id: String,
) -> AppResult<()> {
    log::info!("Rolling back transaction: {}", transaction_id);

    // Get connection ID associated with the transaction
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
            .map_err(|e| AppError::QueryError(format!("Failed to rollback transaction: {}", e)))?;
    }

    state.remove_transaction(&transaction_id)
        .map_err(|e| AppError::InternalError(e))?;

    log::info!("Transaction rolled back: {}", transaction_id);

    Ok(())
}
