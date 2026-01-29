//! Application State
//!
//! Thread-safe application state management using parking_lot.

use super::connection_pool::{QueryStats, TransactionInfo};
use crate::commands::database::DatabaseConnection;
use crate::sqlite3x::wrapper::Database;
use parking_lot::{Mutex, RwLock};
use std::collections::HashMap;
use std::sync::Arc;

/// Application state that is shared across all Tauri commands
pub struct AppState {
    /// Active database connections metadata
    connections: RwLock<HashMap<String, DatabaseConnection>>,
    /// Active sqlite3x database handles
    db_handles: RwLock<HashMap<String, Arc<Mutex<Database>>>>,
    /// Active transactions
    transactions: RwLock<HashMap<String, TransactionInfo>>,
    /// Query statistics per connection
    query_stats: RwLock<HashMap<String, QueryStats>>,
}

impl AppState {
    /// Create a new application state instance
    pub fn new() -> Self {
        Self {
            connections: RwLock::new(HashMap::new()),
            db_handles: RwLock::new(HashMap::new()),
            transactions: RwLock::new(HashMap::new()),
            query_stats: RwLock::new(HashMap::new()),
        }
    }

    // ==================== Connection Management ====================

    /// Add a new database connection
    pub fn add_connection(
        &self, 
        connection: DatabaseConnection, 
        db_handle: Database
    ) -> Result<(), String> {
        let mut connections = self.connections.write();
        let mut handles = self.db_handles.write();
        
        if connections.contains_key(&connection.id) {
            return Err(format!("Connection already exists: {}", connection.id));
        }
        
        let id = connection.id.clone();
        connections.insert(id.clone(), connection);
        handles.insert(id.clone(), Arc::new(Mutex::new(db_handle)));
        
        // Initialize query stats for this connection
        self.query_stats.write().insert(id, QueryStats::default());
        
        Ok(())
    }

    /// Remove a database connection
    pub fn remove_connection(&self, connection_id: &str) -> Result<(), String> {
        let mut connections = self.connections.write();
        let mut handles = self.db_handles.write();
        
        if connections.remove(connection_id).is_none() {
            return Err(format!("Connection not found: {}", connection_id));
        }
        
        // Explicitly remove and drop the handle to close the DB
        handles.remove(connection_id);
        
        // Clean up related data
        self.query_stats.write().remove(connection_id);
        
        // Remove any transactions for this connection
        let mut transactions = self.transactions.write();
        transactions.retain(|_, t| t.connection_id != connection_id);
        
        Ok(())
    }

    /// Get a specific database handle
    pub fn get_db_handle(&self, connection_id: &str) -> Option<Arc<Mutex<Database>>> {
        self.db_handles.read().get(connection_id).cloned()
    }

    /// Check if a connection exists
    pub fn has_connection(&self, connection_id: &str) -> bool {
        self.connections.read().contains_key(connection_id)
    }

    /// Get all connections
    pub fn get_connections(&self) -> Vec<DatabaseConnection> {
        self.connections.read().values().cloned().collect()
    }

    /// Get a specific connection
    pub fn get_connection(&self, connection_id: &str) -> Option<DatabaseConnection> {
        self.connections.read().get(connection_id).cloned()
    }

    // ==================== Transaction Management ====================

    /// Add a new transaction
    pub fn add_transaction(
        &self,
        connection_id: &str,
        transaction_id: &str,
    ) -> Result<(), String> {
        if !self.has_connection(connection_id) {
            return Err(format!("Connection not found: {}", connection_id));
        }

        let mut transactions = self.transactions.write();
        
        if transactions.contains_key(transaction_id) {
            return Err(format!("Transaction already exists: {}", transaction_id));
        }
        
        transactions.insert(
            transaction_id.to_string(),
            TransactionInfo {
                id: transaction_id.to_string(),
                connection_id: connection_id.to_string(),
                started_at: chrono::Utc::now(),
            },
        );
        
        Ok(())
    }

    /// Remove a transaction
    pub fn remove_transaction(&self, transaction_id: &str) -> Result<(), String> {
        let mut transactions = self.transactions.write();
        
        if transactions.remove(transaction_id).is_none() {
            return Err(format!("Transaction not found: {}", transaction_id));
        }
        
        Ok(())
    }

    /// Get a specific transaction
    pub fn get_transaction(&self, transaction_id: &str) -> Option<TransactionInfo> {
        self.transactions.read().get(transaction_id).cloned()
    }

    /// Get active transactions for a connection
    pub fn get_transactions(&self, connection_id: &str) -> Vec<TransactionInfo> {
        self.transactions
            .read()
            .values()
            .filter(|t| t.connection_id == connection_id)
            .cloned()
            .collect()
    }

    // ==================== Query Statistics ====================

    /// Get query statistics for a connection
    pub fn get_query_stats(&self, connection_id: &str) -> QueryStats {
        self.query_stats
            .read()
            .get(connection_id)
            .cloned()
            .unwrap_or_default()
    }

    /// Update query statistics
    pub fn record_query(
        &self,
        connection_id: &str,
        execution_time_ms: f64,
        cache_hit: bool,
    ) {
        let mut stats = self.query_stats.write();
        
        if let Some(s) = stats.get_mut(connection_id) {
            s.total_queries += 1;
            s.total_time_ms += execution_time_ms;
            
            if cache_hit {
                s.cache_hits += 1;
            } else {
                s.cache_misses += 1;
            }
            
            if execution_time_ms > s.max_query_time_ms {
                s.max_query_time_ms = execution_time_ms;
            }
            
            if s.min_query_time_ms == 0.0 || execution_time_ms < s.min_query_time_ms {
                s.min_query_time_ms = execution_time_ms;
            }
            
            s.avg_query_time_ms = s.total_time_ms / s.total_queries as f64;
            s.cache_hit_rate = if s.cache_hits + s.cache_misses > 0 {
                s.cache_hits as f64 / (s.cache_hits + s.cache_misses) as f64 * 100.0
            } else {
                0.0
            };
        }
    }

    /// Reset query statistics for a connection
    pub fn reset_query_stats(&self, connection_id: &str) {
        let mut stats = self.query_stats.write();
        
        if let Some(s) = stats.get_mut(connection_id) {
            *s = QueryStats::default();
        }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}
