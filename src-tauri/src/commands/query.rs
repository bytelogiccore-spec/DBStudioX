use crate::state::AppState;
use crate::utils::{AppResult, AppError};
use serde::{Deserialize, Serialize};

/// Query column info for frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ColumnInfo {
    pub name: String,
    pub data_type: String,
}

/// Query execution result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryResult {
    pub columns: Vec<ColumnInfo>,
    pub rows: Vec<Vec<serde_json::Value>>,
    pub affected_rows: i64,
    pub execution_time_ms: u64,
    pub query_plan: Option<String>,
}

/// Execute a SQL query with a specific connection
#[tauri::command]
pub async fn execute_query(
    state: tauri::State<'_, std::sync::Arc<AppState>>,
    connection_id: String,
    sql: String,
    _params: Option<Vec<serde_json::Value>>,
) -> AppResult<QueryResult> {
    log::info!("Executing query on {}: {}", connection_id, sql);

    // Get DB handle from state
    let db_handle = state.get_db_handle(&connection_id)
        .ok_or_else(|| AppError::NotFound(format!("Connection not found: {}", connection_id)))?;

    let start = std::time::Instant::now();

    // Determine if this is a SELECT query or a statement
    let sql_upper = sql.trim().to_uppercase();
    let is_select = sql_upper.starts_with("SELECT")
        || sql_upper.starts_with("PRAGMA")
        || sql_upper.starts_with("EXPLAIN");

    let result = if is_select {
        // Execute as query (returns rows)
        let db = db_handle.lock();
        let query_result = db.query(&sql)
            .map_err(|e| AppError::QueryError(format!("{:?}", e)))?;

        let columns: Vec<ColumnInfo> = query_result.columns.iter()
            .zip(query_result.column_types.iter())
            .map(|(name, dtype)| ColumnInfo {
                name: name.clone(),
                data_type: dtype.clone(),
            })
            .collect();

        let duration = start.elapsed();
        let execution_time_ms = duration.as_millis() as u64;

        // Record performance stats
        state.record_query(&connection_id, execution_time_ms as f64, false);

        QueryResult {
            columns,
            rows: query_result.rows,
            affected_rows: 0,
            execution_time_ms,
            query_plan: None,
        }
    } else {
        // Execute as statement (DDL, INSERT, UPDATE, DELETE, etc.)
        let db = db_handle.lock();
        let affected = db.execute(&sql)
            .map_err(|e| AppError::QueryError(format!("{:?}", e)))?;

        let duration = start.elapsed();
        let execution_time_ms = duration.as_millis() as u64;

        // Record performance stats
        state.record_query(&connection_id, execution_time_ms as f64, false);

        QueryResult {
            columns: Vec::new(),
            rows: Vec::new(),
            affected_rows: affected as i64,
            execution_time_ms,
            query_plan: None,
        }
    };

    log::info!(
        "Query executed in {}ms, returned {} rows, affected {} rows",
        result.execution_time_ms,
        result.rows.len(),
        result.affected_rows
    );

    Ok(result)
}

/// Legacy wrapper for execute_query (matches frontend calls if necessary)
#[tauri::command]
pub async fn execute_query_with_connection(
    state: tauri::State<'_, std::sync::Arc<AppState>>,
    connection_id: String,
    sql: String,
    params: Option<Vec<serde_json::Value>>,
) -> AppResult<QueryResult> {
    execute_query(state, connection_id, sql, params).await
}

/// Get query execution plan
#[tauri::command]
pub async fn explain_query(
    state: tauri::State<'_, std::sync::Arc<AppState>>,
    connection_id: String,
    sql: String,
) -> AppResult<String> {
    log::info!("Explaining query: {}", sql);

    let db_handle = state.get_db_handle(&connection_id)
        .ok_or_else(|| AppError::NotFound(format!("Connection not found: {}", connection_id)))?;

    let explain_sql = format!("EXPLAIN QUERY PLAN {}", sql);

    let db = db_handle.lock();
    let result = db.query(&explain_sql)
        .map_err(|e| AppError::QueryError(format!("{:?}", e)))?;

    // Format the result as text
    let plan = result.rows.iter()
        .map(|row| row.iter()
            .map(|v| v.to_string())
            .collect::<Vec<_>>()
            .join(" | "))
        .collect::<Vec<_>>()
        .join("\n");

    Ok(plan)
}
