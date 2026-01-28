//! Schema Inspection Commands
//!
//! Handles database schema inspection and metadata retrieval.

use crate::state::AppState;
use crate::utils::{AppResult, AppError};
use serde::{Deserialize, Serialize};


/// Column information for frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ColumnInfo {
    pub name: String,
    #[serde(rename = "type")]
    pub column_type: String,
    pub nullable: bool,
    pub primary_key: bool,
    pub default_value: Option<String>,
}

/// Table information for frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TableInfo {
    pub name: String,
    pub columns: Vec<ColumnInfo>,
    pub row_count: i64,
    pub size_bytes: i64,
}

/// View information for frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ViewInfo {
    pub name: String,
    pub sql: String,
}

/// Index information for frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IndexInfo {
    pub name: String,
    pub table_name: String,
    pub columns: Vec<String>,
    pub is_unique: bool,
}

/// Trigger information for frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TriggerInfo {
    pub name: String,
    pub table_name: String,
    pub timing: String,
    pub event: String,
    pub sql: String,
}

/// Complete schema information for frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SchemaInfo {
    pub tables: Vec<TableInfo>,
    pub views: Vec<ViewInfo>,
    pub indexes: Vec<IndexInfo>,
    pub triggers: Vec<TriggerInfo>,
}

/// Get database schema
#[tauri::command]
pub async fn get_schema(
    state: tauri::State<'_, std::sync::Arc<AppState>>,
    connection_id: String,
) -> AppResult<SchemaInfo> {
    log::info!("Getting schema for connection: {}", connection_id);

    let db_handle = state.get_db_handle(&connection_id)
        .ok_or_else(|| AppError::NotFound(format!("Connection not found: {}", connection_id)))?;

    // Use the wrapper's get_schema method
    let db = db_handle.lock();
    let schema = db.get_schema()
        .map_err(|e| AppError::QueryError(format!("{:?}", e)))?;

    // Convert wrapper types to frontend types with column information
    let mut tables: Vec<TableInfo> = Vec::new();
    
    for table in schema.tables.iter() {
        // Get column information for each table
        let pragma_sql = format!("PRAGMA table_info({})", table.name);
        let result = db.query(&pragma_sql)
            .map_err(|e| AppError::QueryError(format!("{:?}", e)))?;
        
        let mut columns = Vec::new();
        for row in result.rows {
            // PRAGMA table_info returns: cid, name, type, notnull, dflt_value, pk
            if row.len() >= 6 {
                let name = match &row[1] {
                    serde_json::Value::String(s) => s.clone(),
                    _ => continue,
                };
                let col_type = match &row[2] {
                    serde_json::Value::String(s) => s.clone(),
                    _ => "TEXT".to_string(),
                };
                let not_null = match &row[3] {
                    serde_json::Value::Number(n) => n.as_i64().unwrap_or(0) != 0,
                    _ => false,
                };
                let default_val = match &row[4] {
                    serde_json::Value::String(s) => Some(s.clone()),
                    serde_json::Value::Null => None,
                    _ => None,
                };
                let pk = match &row[5] {
                    serde_json::Value::Number(n) => n.as_i64().unwrap_or(0) != 0,
                    _ => false,
                };

                columns.push(ColumnInfo {
                    name,
                    column_type: col_type,
                    nullable: !not_null,
                    primary_key: pk,
                    default_value: default_val,
                });
            }
        }

        // Get row count
        let count_sql = format!("SELECT COUNT(*) FROM \"{}\"", table.name);
        let row_count = db.query(&count_sql).ok()
            .and_then(|r| r.rows.first().cloned())
            .and_then(|row| row.first().cloned())
            .and_then(|v| match v {
                serde_json::Value::Number(n) => n.as_i64(),
                _ => None,
            })
            .unwrap_or(0);

        tables.push(TableInfo {
            name: table.name.clone(),
            columns,
            row_count,
            size_bytes: 0,
        });
    }

    let views: Vec<ViewInfo> = schema.views.iter()
        .map(|v| ViewInfo {
            name: v.name.clone(),
            sql: v.sql.clone().unwrap_or_default(),
        })
        .collect();

    let indexes: Vec<IndexInfo> = schema.indexes.iter()
        .map(|i| IndexInfo {
            name: i.name.clone(),
            table_name: i.table_name.clone(),
            columns: i.columns.clone(),
            is_unique: i.unique,
        })
        .collect();

    let triggers: Vec<TriggerInfo> = schema.triggers.iter()
        .map(|t| TriggerInfo {
            name: t.name.clone(),
            table_name: t.table_name.clone(),
            timing: String::new(),
            event: String::new(),
            sql: t.sql.clone().unwrap_or_default(),
        })
        .collect();

    log::info!(
        "Schema retrieved: {} tables, {} views, {} indexes, {} triggers",
        tables.len(),
        views.len(),
        indexes.len(),
        triggers.len()
    );

    Ok(SchemaInfo {
        tables,
        views,
        indexes,
        triggers,
    })
}

/// Get detailed table information
#[tauri::command]
pub async fn get_table_info(
    state: tauri::State<'_, std::sync::Arc<AppState>>,
    connection_id: String,
    table_name: String,
) -> AppResult<TableInfo> {
    log::info!(
        "Getting table info for {} on connection: {}",
        table_name,
        connection_id
    );

    let db_handle = state.get_db_handle(&connection_id)
        .ok_or_else(|| AppError::NotFound(format!("Connection not found: {}", connection_id)))?;

    let db = db_handle.lock();
    
    // Query table columns using PRAGMA
    let pragma_sql = format!("PRAGMA table_info({})", table_name);
    let result = db.query(&pragma_sql)
        .map_err(|e| AppError::QueryError(format!("{:?}", e)))?;
    
    let mut columns = Vec::new();
    for row in result.rows {
        // PRAGMA table_info returns: cid, name, type, notnull, dflt_value, pk
        if row.len() >= 6 {
            let name = match &row[1] {
                serde_json::Value::String(s) => s.clone(),
                _ => continue,
            };
            let col_type = match &row[2] {
                serde_json::Value::String(s) => s.clone(),
                _ => "TEXT".to_string(),
            };
            let not_null = match &row[3] {
                serde_json::Value::Number(n) => n.as_i64().unwrap_or(0) != 0,
                _ => false,
            };
            let default_val = match &row[4] {
                serde_json::Value::String(s) => Some(s.clone()),
                serde_json::Value::Null => None,
                _ => None,
            };
            let pk = match &row[5] {
                serde_json::Value::Number(n) => n.as_i64().unwrap_or(0) != 0,
                _ => false,
            };

            columns.push(ColumnInfo {
                name,
                column_type: col_type,
                nullable: !not_null,
                primary_key: pk,
                default_value: default_val,
            });
        }
    }

    // Get row count
    let count_sql = format!("SELECT COUNT(*) FROM \"{}\"", table_name);
    let count_result = db.query(&count_sql).ok();
    let row_count = count_result
        .and_then(|r| r.rows.first().cloned())
        .and_then(|row| row.first().cloned())
        .and_then(|v| match v {
            serde_json::Value::Number(n) => n.as_i64(),
            _ => None,
        })
        .unwrap_or(0);

    Ok(TableInfo {
        name: table_name,
        columns,
        row_count,
        size_bytes: 0,
    })
}
