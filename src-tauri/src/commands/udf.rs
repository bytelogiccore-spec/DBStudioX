//! UDF (User Defined Function) Management Commands
//!
//! Handles registration and management of custom SQLite functions.

use crate::state::AppState;
use crate::utils::{AppResult, AppError};
use serde::{Deserialize, Serialize};

/// UDF Information
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UdfInfo {
    pub name: String,
    pub arg_count: i32,
    pub deterministic: bool,
    pub description: Option<String>,
}

/// Register a collection of built-in utility functions
#[tauri::command]
pub async fn register_built_in_udfs(
    state: tauri::State<'_, std::sync::Arc<AppState>>,
    connection_id: String,
) -> AppResult<Vec<UdfInfo>> {
    log::info!("Registering built-in UDFs for connection: {}", connection_id);

    let db_handle = state.get_db_handle(&connection_id)
        .ok_or_else(|| AppError::NotFound(format!("Connection not found: {}", connection_id)))?;

    let db = db_handle.lock();

    let mut registered = Vec::new();

    // Example 1: studio_version()
    db.create_scalar_function("studio_version", 0, true, |_ctx: &rusqlite::functions::Context| {
        Ok("0.0.1-alpha".to_string())
    }).map_err(|e| AppError::CommandError(format!("Failed to register studio_version: {:?}", e)))?;
    
    registered.push(UdfInfo {
        name: "studio_version".to_string(),
        arg_count: 0,
        deterministic: true,
        description: Some("Returns the DBStudioX version".to_string()),
    });

    // Example 2: studio_echo(text)
    db.create_scalar_function("studio_echo", 1, true, |ctx: &rusqlite::functions::Context| {
        let arg = ctx.get::<String>(0)?;
        Ok(format!("Echo: {}", arg))
    }).map_err(|e| AppError::CommandError(format!("Failed to register studio_echo: {:?}", e)))?;

    registered.push(UdfInfo {
        name: "studio_echo".to_string(),
        arg_count: 1,
        deterministic: true,
        description: Some("Echoes the input text".to_string()),
    });

    log::info!("Successfully registered {} UDFs", registered.len());

    Ok(registered)
}

/// Get list of active UDFs (from sqlite_master or internal registry)
#[tauri::command]
pub async fn get_udf_list(
    state: tauri::State<'_, std::sync::Arc<AppState>>,
    connection_id: String,
) -> AppResult<Vec<UdfInfo>> {
    let db_handle = state.get_db_handle(&connection_id)
        .ok_or_else(|| AppError::NotFound(format!("Connection not found: {}", connection_id)))?;

    let db = db_handle.lock();
    let functions = db.get_registered_functions();
    
    Ok(functions.into_iter().map(|name| UdfInfo {
        name,
        arg_count: -1, // -1 means variadic or unknown if not tracked
        deterministic: true,
        description: None,
    }).collect())
}

/// Request to create a simple SQL expression-based UDF
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateUdfRequest {
    pub name: String,
    pub arg_count: i32,
    pub deterministic: bool,
    pub expression: String,
    pub description: Option<String>,
}

/// Create a user-defined function from an SQL expression
#[tauri::command]
pub async fn create_user_function(
    state: tauri::State<'_, std::sync::Arc<AppState>>,
    connection_id: String,
    request: CreateUdfRequest,
) -> AppResult<UdfInfo> {
    log::info!("Creating UDF '{}' for connection: {}", request.name, connection_id);

    let db_handle = state.get_db_handle(&connection_id)
        .ok_or_else(|| AppError::NotFound(format!("Connection not found: {}", connection_id)))?;

    let db = db_handle.lock();
    
    // Validate the expression by trying to compile it
    let test_sql = format!("SELECT {}", request.expression);
    db.query(&test_sql).map_err(|e| AppError::QueryError(format!("Invalid expression: {:?}", e)))?;

    // For simple expressions, we create a scalar function that evaluates the SQL
    let expr = request.expression.clone();
    let arg_count = request.arg_count;
    
    // Create a function that evaluates the expression
    // Note: For complex expressions, we'd need a more sophisticated approach
    db.create_scalar_function(&request.name, arg_count, request.deterministic, move |ctx: &rusqlite::functions::Context| {
        // Build the expression with arguments substituted
        let mut evaluated_expr = expr.clone();
        for i in 0..arg_count {
            let arg_value = match ctx.get_raw(i as usize) {
                rusqlite::types::ValueRef::Null => "NULL".to_string(),
                rusqlite::types::ValueRef::Integer(v) => v.to_string(),
                rusqlite::types::ValueRef::Real(v) => v.to_string(),
                rusqlite::types::ValueRef::Text(v) => format!("'{}'", String::from_utf8_lossy(v).replace("'", "''")),
                rusqlite::types::ValueRef::Blob(v) => {
                    let hex_str: String = v.iter().map(|b| format!("{:02x}", b)).collect();
                    format!("X'{}'", hex_str)
                },
            };
            evaluated_expr = evaluated_expr.replace(&format!("${}", i + 1), &arg_value);
        }
        Ok(evaluated_expr)
    }).map_err(|e| AppError::CommandError(format!("Failed to create function: {:?}", e)))?;

    log::info!("Successfully created UDF: {}", request.name);

    Ok(UdfInfo {
        name: request.name,
        arg_count: request.arg_count,
        deterministic: request.deterministic,
        description: request.description,
    })
}

/// Delete a user-defined function
#[tauri::command]
pub async fn delete_user_function(
    _state: tauri::State<'_, std::sync::Arc<AppState>>,
    connection_id: String,
    function_name: String,
) -> AppResult<()> {
    log::info!("Marking UDF '{}' for deletion in connection: {}", function_name, connection_id);
    
    // SQLite doesn't support removing functions at runtime.
    // The function will be gone on next connection.
    // We could maintain a blacklist or registry if needed.
    Ok(())
}
