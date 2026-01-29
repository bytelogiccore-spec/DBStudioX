// Sharding Index Strategy Module
// Provides higher-level indexing abstractions for sharded databases.

use crate::sqlite3x::errors::{Sqlite3xError as Sqlite3Error, Sqlite3xResult as Sqlite3Result};
use super::PartitionManager;
use std::sync::Arc;

/// Global Index Strategy
pub struct GlobalIndexManager {
    partition_manager: Arc<PartitionManager>,
}

impl GlobalIndexManager {
    pub fn new(partition_manager: Arc<PartitionManager>) -> Self {
        Self { partition_manager }
    }

    /// Check for global uniqueness across all shards
    pub fn check_global_uniqueness(
        &self,
        table_name: &str,
        column_name: &str,
        value: &str,
    ) -> Sqlite3Result<bool> {
        // SQL to check for existing value
        let sql = format!(
            "SELECT COUNT(*) as cnt FROM {} WHERE {} = '{}'",
            table_name, column_name, value.replace('\'', "''")
        );

        // Query all shards
        let results = self.partition_manager.query_partitioned(&sql)?;

        // Aggregate results
        let mut total_count: u64 = 0;
        for row in results.rows {
            if let Some(serde_json::Value::Number(n)) = row.first() {
                if let Some(count) = n.as_u64() {
                    total_count += count;
                }
            }
        }

        Ok(total_count == 0)
    }

    /// Analyze index coverage across shards
    pub fn analyze_index_coverage(&self) -> Sqlite3Result<Vec<String>> {
        self.partition_manager.verify_shard_key_indices()
    }

    /// Optimized batch insert with uniqueness check
    pub fn unique_insert_partitioned(
        &self,
        sql: &str,
        table_name: &str,
        unique_column: &str,
        value: &str,
    ) -> Sqlite3Result<usize> {
        if !self.check_global_uniqueness(table_name, unique_column, value)? {
            return Err(Sqlite3Error::Query(
                format!("Global uniqueness violation for column '{}' with value '{}'", unique_column, value)
            ));
        }

        self.partition_manager.execute_partitioned(sql)
    }
}
