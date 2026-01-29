//! Performance Events
//!
//! Monitors and emits performance metrics to the frontend.

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

/// Performance metrics payload
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PerformanceMetrics {
    pub cache_hit_rate: f64,
    pub query_count: i64,
    pub avg_query_time_ms: f64,
    pub connection_count: i32,
    pub memory_usage_bytes: i64,
    pub wal_checkpoint_count: i32,
}

/// Performance event payload
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PerformanceEvent {
    pub timestamp: String,
    pub metrics: PerformanceMetrics,
}

/// Emit a performance event to all listeners
pub fn emit_performance_update(app: &AppHandle, metrics: PerformanceMetrics) {
    let event = PerformanceEvent {
        timestamp: chrono::Utc::now().to_rfc3339(),
        metrics,
    };

    if let Err(e) = app.emit("db:perf_update", &event) {
        log::error!("Failed to emit performance event: {}", e);
    }
}

/// Start background performance monitoring
pub async fn start_monitoring(
    app: tauri::AppHandle,
    state: std::sync::Arc<crate::state::AppState>,
    interval_ms: u64,
) {
    log::info!("Performance monitoring started");

    let mut interval = tokio::time::interval(std::time::Duration::from_millis(interval_ms));

    loop {
        interval.tick().await;

        let connections = state.get_connections();
        for conn in connections {
            let stats = state.get_query_stats(&conn.id);
            let metrics = PerformanceMetrics {
                cache_hit_rate: stats.cache_hit_rate,
                query_count: stats.total_queries,
                avg_query_time_ms: stats.avg_query_time_ms,
                connection_count: 1,
                memory_usage_bytes: 0,
                wal_checkpoint_count: 0,
            };
            emit_performance_update(&app, metrics);
        }
    }
}
