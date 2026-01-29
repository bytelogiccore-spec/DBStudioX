//! Statistics and Performance Commands
//!
//! Handles database statistics and cache management.

use crate::state::AppState;
use crate::utils::{AppResult, AppError};
use serde::{Deserialize, Serialize};


/// Database statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseStats {
    pub cache_hit_rate: f64,
    pub cache_hit_count: i64,
    pub cache_miss_count: i64,
    pub query_count: i64,
    pub avg_query_time_ms: f64,
    pub max_query_time_ms: f64,
    pub min_query_time_ms: f64,
    pub connection_pool_size: i32,
    pub active_connections: i32,
    pub memory_usage_bytes: i64,
    pub wal_size: i64,
    pub last_checkpoint: String,
}

/// Get database statistics
#[tauri::command]
pub async fn get_stats(
    state: tauri::State<'_, std::sync::Arc<AppState>>,
    connection_id: String,
) -> AppResult<DatabaseStats> {
    log::debug!("Getting stats for connection: {}", connection_id);

    // Verify connection exists
    if !state.has_connection(&connection_id) {
        return Err(AppError::NotFound(format!("Connection not found: {}", connection_id)));
    }

    // TODO: Implement actual stats retrieval using sqlite3x
    // Use sqlite3x_database_get_stats()

    // Get stats from app state
    let query_stats = state.get_query_stats(&connection_id);

    let stats = DatabaseStats {
        cache_hit_rate: query_stats.cache_hit_rate,
        cache_hit_count: query_stats.cache_hits,
        cache_miss_count: query_stats.cache_misses,
        query_count: query_stats.total_queries,
        avg_query_time_ms: query_stats.avg_query_time_ms,
        max_query_time_ms: query_stats.max_query_time_ms,
        min_query_time_ms: query_stats.min_query_time_ms,
        connection_pool_size: 1,
        active_connections: 1,
        memory_usage_bytes: 0,
        wal_size: 0,
        last_checkpoint: chrono::Utc::now().to_rfc3339(),
    };

    Ok(stats)
}

/// Clear statement cache
#[tauri::command]
pub async fn clear_cache(
    state: tauri::State<'_, std::sync::Arc<AppState>>,
    connection_id: String,
) -> AppResult<()> {
    log::info!("Clearing cache for connection: {}", connection_id);

    // Verify connection exists
    if !state.has_connection(&connection_id) {
        return Err(AppError::NotFound(format!("Connection not found: {}", connection_id)));
    }

    // Get the database handle and clear cache
    if let Some(db_handle) = state.get_db_handle(&connection_id) {
        let db = db_handle.lock();
        db.clear_cache()
            .map_err(|e| AppError::Database(format!("Failed to clear cache: {}", e)))?;
    } else {
        return Err(AppError::NotFound(format!("Database handle not found for connection: {}", connection_id)));
    }

    state.reset_query_stats(&connection_id);

    log::info!("Cache cleared for connection: {}", connection_id);

    Ok(())
}

/// Enable or disable statement caching
#[tauri::command]
pub async fn set_cache_enabled(
    state: tauri::State<'_, std::sync::Arc<AppState>>,
    connection_id: String,
    enabled: bool,
) -> AppResult<()> {
    log::info!(
        "Setting cache enabled={} for connection: {}",
        enabled,
        connection_id
    );

    // Verify connection exists
    if !state.has_connection(&connection_id) {
        return Err(AppError::NotFound(format!("Connection not found: {}", connection_id)));
    }

    // TODO: Implement using sqlite3x
    // sqlite3x_database_set_cache_enabled(handle, enabled)

    Ok(())
}
