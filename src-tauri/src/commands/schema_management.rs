use crate::state::AppState;
use crate::utils::{AppResult, AppError};
use crate::utils::schema_diff::{compare_schemas, SchemaDiffResult};

#[tauri::command]
pub async fn diff_schemas(
    state: tauri::State<'_, std::sync::Arc<AppState>>,
    source_connection_id: String,
    target_path: String,
) -> AppResult<SchemaDiffResult> {
    log::info!("Comparing schema of {} with {}", source_connection_id, target_path);

    // 1. Get source schema
    let db_handle = state.get_db_handle(&source_connection_id)
        .ok_or_else(|| AppError::InternalError(format!("Source connection not found: {}", source_connection_id)))?;

    let source_schema = {
        let db = db_handle.lock();
        db.get_schema().map_err(|e| AppError::InternalError(format!("{:?}", e)))?
    };

    // 2. Get target schema (Directly open and read)
    let target_db = crate::sqlite3x::wrapper::Database::open(&target_path)
        .map_err(|e| AppError::ConnectionError(format!("Failed to open target DB: {:?}", e)))?;
    
    let target_schema = target_db.get_schema()
        .map_err(|e| AppError::InternalError(format!("{:?}", e)))?;

    // 3. Compare
    let diff = compare_schemas(&source_schema, &target_schema);

    Ok(diff)
}
