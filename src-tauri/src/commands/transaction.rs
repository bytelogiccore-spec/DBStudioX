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

#[cfg(test)]
mod tests {
    use crate::state::AppState;
    use crate::sqlite3x::wrapper::Database;
    use crate::commands::database::DatabaseConnection;
    use std::sync::Arc;
    use uuid::Uuid;

    #[test]
    fn test_transaction_flow() {
        // Setup
        let state = Arc::new(AppState::new());
        let db_path = std::env::temp_dir().join(format!("test_db_{}.sqlite", Uuid::new_v4()));
        let conn_id = Uuid::new_v4().to_string();

        // Open DB
        let db = Database::open(db_path.to_str().unwrap()).unwrap();
        // Create table
        db.execute("CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)").unwrap();

        let connection = DatabaseConnection {
            id: conn_id.clone(),
            name: "Test DB".to_string(),
            path: db_path.to_str().unwrap().to_string(),
            is_connected: true,
            created_at: chrono::Utc::now().to_rfc3339(),
        };

        state.add_connection(connection, db).unwrap();

        // 1. Begin
        let db_handle = state.get_db_handle(&conn_id).unwrap();
        let db = db_handle.lock();
        db.execute("BEGIN TRANSACTION").unwrap();
        drop(db); // release lock

        let tx_id = Uuid::new_v4().to_string();
        state.add_transaction(&conn_id, &tx_id).unwrap();

        assert!(state.get_transaction(&tx_id).is_some());

        // 2. Insert Data
        let db_handle = state.get_db_handle(&conn_id).unwrap();
        let db = db_handle.lock();
        db.execute("INSERT INTO test (name) VALUES ('foo')").unwrap();
        drop(db);

        // 3. Commit
        let tx_info = state.get_transaction(&tx_id).unwrap();
        let conn_id_from_tx = tx_info.connection_id;

        let db_handle = state.get_db_handle(&conn_id_from_tx).unwrap();
        let db = db_handle.lock();
        db.execute("COMMIT").unwrap();
        drop(db);

        state.remove_transaction(&tx_id).unwrap();

        assert!(state.get_transaction(&tx_id).is_none());

        // Verify with new connection
        let conn2 = rusqlite::Connection::open(&db_path).unwrap();
        let count: i64 = conn2.query_row("SELECT count(*) FROM test", [], |row| row.get(0)).unwrap();
        assert_eq!(count, 1);

        // Cleanup
        let _ = std::fs::remove_file(db_path);
    }
}
