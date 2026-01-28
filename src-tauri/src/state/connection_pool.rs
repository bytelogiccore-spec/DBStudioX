//! Connection Pool and Statistics Types
//!
//! Data structures for managing connections and query statistics.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Transaction information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransactionInfo {
    pub id: String,
    pub connection_id: String,
    pub started_at: DateTime<Utc>,
}

/// Query statistics for a connection
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct QueryStats {
    pub total_queries: i64,
    pub total_time_ms: f64,
    pub avg_query_time_ms: f64,
    pub max_query_time_ms: f64,
    pub min_query_time_ms: f64,
    pub cache_hits: i64,
    pub cache_misses: i64,
    pub cache_hit_rate: f64,
}

/// Connection pool configuration
#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PoolConfig {
    pub min_connections: u32,
    pub max_connections: u32,
    pub connection_timeout_ms: u64,
    pub idle_timeout_ms: u64,
}

impl Default for PoolConfig {
    fn default() -> Self {
        Self {
            min_connections: 1,
            max_connections: 10,
            connection_timeout_ms: 5000,
            idle_timeout_ms: 60000,
        }
    }
}
