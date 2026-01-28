use crate::sqlite3x::partition::{PartitionPolicy as InternalPolicy, PartitionStrategy, PartitionManager, PartitionConfig};
use crate::state::AppState;
use crate::utils::{AppResult, AppError};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

/// Partition Information
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TablePartitionInfo {
    pub base_table: String,
    pub partitions: Vec<String>,
    pub total_rows: i64,
}

/// Analyze schema for logically partitioned tables
#[tauri::command]
pub async fn get_partition_info(
    state: tauri::State<'_, std::sync::Arc<AppState>>,
    connection_id: String,
) -> AppResult<Vec<TablePartitionInfo>> {
    log::info!("Analyzing partitions for connection: {}", connection_id);

    let db_handle = state.get_db_handle(&connection_id)
        .ok_or_else(|| AppError::NotFound(format!("Connection not found: {}", connection_id)))?;

    let db = db_handle.lock();
    
    // Query all tables
    let result = db.query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
        .map_err(|e| AppError::QueryError(format!("{:?}", e)))?;
    
    let table_names: Vec<String> = result.rows.iter()
        .filter_map(|row| row.get(0).and_then(|v| v.as_str()).map(|s| s.to_string()))
        .collect();

    let mut partitions_map: std::collections::HashMap<String, Vec<String>> = std::collections::HashMap::new();

    // Simple heuristic: find base names (e.g., users from users_p0)
    for name in &table_names {
        if let Some(pos) = name.rfind("_p") {
            let base = &name[..pos];
            let suffix = &name[pos+2..];
            if suffix.chars().all(|c| c.is_digit(10)) {
                partitions_map.entry(base.to_string()).or_default().push(name.clone());
            }
        }
    }

    let mut infos = Vec::new();
    for (base, partitions) in partitions_map {
        let mut total_rows = 0;
        for p in &partitions {
            let count_query = format!("SELECT COUNT(*) FROM \"{}\"", p);
            if let Ok(count_res) = db.query(&count_query) {
                if let Some(row) = count_res.rows.first() {
                    total_rows += row.get(0).and_then(|v| v.as_i64()).unwrap_or(0);
                }
            }
        }

        infos.push(TablePartitionInfo {
            base_table: base,
            partitions,
            total_rows,
        });
    }

    Ok(infos)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShardInfo {
    pub name: String,
    pub file: Option<String>,
}

/// List all attached databases (shards)
#[tauri::command]
pub async fn get_attached_shards(
    state: tauri::State<'_, std::sync::Arc<AppState>>,
    connection_id: String,
) -> AppResult<Vec<ShardInfo>> {
    let db_handle = state.get_db_handle(&connection_id)
        .ok_or_else(|| AppError::NotFound(format!("Connection not found: {}", connection_id)))?;

    let db = db_handle.lock();
    let dbs = db.get_attached_databases().map_err(|e| AppError::QueryError(e.to_string()))?;
    
    Ok(dbs.into_iter().map(|d| ShardInfo {
        name: d.name,
        file: d.file,
    }).collect())
}

/// Partition Policy for automatic date-based partitioning
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PartitionPolicy {
    pub id: String,
    pub table_name: String,
    pub date_column: String,
    pub partition_interval: String, // "daily", "weekly", "monthly"
    pub retention_days: i32,        // Days to keep data, 0 = forever
    pub created_at: String,
}

/// Request to create a partition policy
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatePartitionPolicyRequest {
    pub table_name: String,
    pub date_column: String,
    pub partition_interval: String,
    pub retention_days: i32,
}

/// Request to initialize partitioning for a connection
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InitializePartitioningRequest {
    pub strategy: String,
    pub shards: Vec<String>,
    pub key_column: Option<String>,
}

/// Initialize partitioning for a connection
#[tauri::command]
pub async fn initialize_partitioning(
    state: tauri::State<'_, std::sync::Arc<AppState>>,
    connection_id: String,
    request: InitializePartitioningRequest,
) -> AppResult<()> {
    log::info!("Initializing partitioning for connection: {}", connection_id);

    let db_handle = state.get_db_handle(&connection_id)
        .ok_or_else(|| AppError::NotFound(format!("Connection not found: {}", connection_id)))?;

    let strategy = match request.strategy.as_str() {
        "hash" => PartitionStrategy::Hash,
        "range" => PartitionStrategy::Range,
        "round_robin" => PartitionStrategy::RoundRobin,
        _ => return Err(AppError::CommandError("Invalid strategy".to_string())),
    };

    let mut config = PartitionConfig::new(strategy, request.shards);
    if let Some(key) = request.key_column {
        config.key_column = Some(key);
    }

    let manager = PartitionManager::new(Arc::clone(&db_handle), config)
        .map_err(|e| AppError::CommandError(format!("Failed to create PartitionManager: {:?}", e)))?;

    manager.initialize_shards()
        .map_err(|e| AppError::CommandError(format!("Failed to initialize shards: {:?}", e)))?;

    let db = db_handle.lock();
    db.set_partition_manager(Arc::new(manager));

    Ok(())
}

/// Create partition policy
#[tauri::command]
pub async fn create_partition_policy(
    state: tauri::State<'_, std::sync::Arc<AppState>>,
    connection_id: String,
    request: CreatePartitionPolicyRequest,
) -> AppResult<PartitionPolicy> {
    log::info!("Creating partition policy for table '{}' in connection: {}", request.table_name, connection_id);

    let db_handle = state.get_db_handle(&connection_id)
        .ok_or_else(|| AppError::NotFound(format!("Connection not found: {}", connection_id)))?;

    // Auto-initialize PartitionManager if not already initialized
    {
        let db = db_handle.lock();
        if db.get_partition_manager().is_none() {
            drop(db); // Release lock before initializing
            log::info!("Auto-initializing PartitionManager with default settings for connection: {}", connection_id);
            
            // Use RoundRobin strategy with main database only (no external shards)
            let config = PartitionConfig::new(PartitionStrategy::RoundRobin, vec!["main".to_string()]);
            let manager = PartitionManager::new(Arc::clone(&db_handle), config)
                .map_err(|e| AppError::CommandError(format!("Failed to create PartitionManager: {:?}", e)))?;
            
            let db = db_handle.lock();
            db.set_partition_manager(Arc::new(manager));
        }
    }

    let db = db_handle.lock();
    let manager = db.get_partition_manager()
        .expect("PartitionManager should be initialized at this point");

    let internal_policy = InternalPolicy {
        table_name: request.table_name.clone(),
        date_column: request.date_column.clone(),
        interval: request.partition_interval.clone(),
        retention: request.retention_days as u32,
        auto_indexing: true,
    };

    manager.create_partition_policy(internal_policy)
        .map_err(|e| AppError::CommandError(format!("Failed to create policy: {:?}", e)))?;

    Ok(PartitionPolicy {
        id: uuid::Uuid::new_v4().to_string(), // In DLL version, we don't use IDs for policies yet, but keep for UI
        table_name: request.table_name,
        date_column: request.date_column,
        partition_interval: request.partition_interval,
        retention_days: request.retention_days,
        created_at: chrono::Utc::now().to_rfc3339(),
    })
}

/// Get all partition policies
#[tauri::command]
pub async fn get_partition_policies(
    state: tauri::State<'_, std::sync::Arc<AppState>>,
    connection_id: String,
) -> AppResult<Vec<PartitionPolicy>> {
    let db_handle = state.get_db_handle(&connection_id)
        .ok_or_else(|| AppError::NotFound(format!("Connection not found: {}", connection_id)))?;

    let db = db_handle.lock();
    
    // Return empty list if partitioning is not initialized
    let manager = match db.get_partition_manager() {
        Some(m) => m,
        None => return Ok(Vec::new()),
    };

    let config = manager.get_config().read().clone();
    
    Ok(config.policies.into_iter().map(|p| PartitionPolicy {
        id: p.table_name.clone(),
        table_name: p.table_name,
        date_column: p.date_column,
        partition_interval: p.interval,
        retention_days: p.retention as i32,
        created_at: "".to_string(), // Metadata doesn't store this yet
    }).collect())
}

/// Delete a partition policy
#[tauri::command]
pub async fn delete_partition_policy(
    state: tauri::State<'_, std::sync::Arc<AppState>>,
    connection_id: String,
    policy_id: String,
) -> AppResult<()> {
    log::info!("Deleting partition policy for table: {}", policy_id);

    let db_handle = state.get_db_handle(&connection_id)
        .ok_or_else(|| AppError::NotFound(format!("Connection not found: {}", connection_id)))?;

    let db = db_handle.lock();
    
    // If partitioning is not initialized, there are no policies to delete
    let manager = match db.get_partition_manager() {
        Some(m) => m,
        None => return Err(AppError::CommandError("No partition policies exist".to_string())),
    };

    manager.delete_partition_policy(&policy_id)
        .map_err(|e| AppError::CommandError(format!("Failed to delete policy: {:?}", e)))?;

    Ok(())
}

/// Result of partition maintenance operation
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MaintenanceResult {
    pub policies_processed: i32,
    pub partitions_deleted: i32,
    pub rows_deleted: i64,
    pub details: Vec<String>,
}

/// Run partition maintenance
#[tauri::command]
pub async fn run_partition_maintenance(
    state: tauri::State<'_, std::sync::Arc<AppState>>,
    connection_id: String,
) -> AppResult<MaintenanceResult> {
    log::info!("Running partition maintenance for connection: {}", connection_id);

    let db_handle = state.get_db_handle(&connection_id)
        .ok_or_else(|| AppError::NotFound(format!("Connection not found: {}", connection_id)))?;

    let db = db_handle.lock();
    
    // If partitioning is not initialized, there's nothing to maintain
    let manager = match db.get_partition_manager() {
        Some(m) => m,
        None => {
            return Ok(MaintenanceResult {
                policies_processed: 0,
                partitions_deleted: 0,
                rows_deleted: 0,
                details: vec!["No partition policies configured".to_string()],
            });
        }
    };

    let policies_processed = manager.get_config().read().policies.len() as i32;
    
    let rows_deleted = manager.run_partition_maintenance()
        .map_err(|e| AppError::CommandError(format!("Maintenance failed: {:?}", e)))? as i64;

    log::info!("Maintenance complete: {} policies processed, {} rows deleted", 
               policies_processed, rows_deleted);

    Ok(MaintenanceResult {
        policies_processed,
        partitions_deleted: 0, // Managed by DLL internally
        rows_deleted,
        details: vec![format!("Successfully processed {} policies", policies_processed)],
    })
}
