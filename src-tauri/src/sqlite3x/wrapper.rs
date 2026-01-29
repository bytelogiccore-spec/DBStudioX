//! sqlite3x Wrapper
//!
//! High-level Rust wrapper using rusqlite for SQLite operations.

use super::errors::{Sqlite3xError, Sqlite3xResult};
use rusqlite::Connection;
use rusqlite::hooks::Action;
use std::sync::{Mutex, Arc};
use parking_lot::RwLock;

/// Safe wrapper around a SQLite database connection
pub struct Database {
    connection: Mutex<Connection>,
    path: String,
    registered_udfs: Mutex<std::collections::HashSet<String>>,
    partition_manager: RwLock<Option<Arc<super::partition::PartitionManager>>>,
}

impl Database {
    /// Open a database connection (creates file if it doesn't exist)
    pub fn open(path: &str) -> Sqlite3xResult<Self> {
        log::info!("Opening database at: {}", path);
        
        let connection = Connection::open(path)
            .map_err(|e| Sqlite3xError::Connection(format!("Failed to open database: {}", e)))?;
        
        // Enable WAL mode for better concurrency
        connection.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")
            .map_err(|e| Sqlite3xError::Connection(format!("Failed to set pragmas: {}", e)))?;
        
        log::info!("Database opened successfully: {}", path);
        
        Ok(Self {
            connection: Mutex::new(connection),
            path: path.to_string(),
            registered_udfs: Mutex::new(std::collections::HashSet::new()),
            partition_manager: RwLock::new(None), // Initialize partition_manager to None
        })
    }

    /// Close the database connection
    pub fn close(&mut self) -> Sqlite3xResult<()> {
        log::info!("Closing database: {}", self.path);
        // Connection will be closed when dropped
        Ok(())
    }

    /// Execute a SQL statement that doesn't return rows
    pub fn execute(&self, sql: &str) -> Sqlite3xResult<usize> {
        log::debug!("Executing SQL: {}", sql);
        
        let conn = self.connection.lock()
            .map_err(|e| Sqlite3xError::Connection(format!("Lock error: {}", e)))?;
        
        let affected = conn.execute(sql, [])
            .map_err(|e| Sqlite3xError::Query(format!("Execute error: {}", e)))?;
        
        log::debug!("Affected rows: {}", affected);
        Ok(affected)
    }

    /// Execute a batch of SQL statements (e.g. valid dump)
    pub fn execute_batch(&self, sql: &str) -> Sqlite3xResult<()> {
        log::debug!("Executing Batch SQL");
        
        let conn = self.connection.lock()
            .map_err(|e| Sqlite3xError::Connection(format!("Lock error: {}", e)))?;
        
        conn.execute_batch(sql)
            .map_err(|e| Sqlite3xError::Query(format!("Execute batch error: {}", e)))?;
        
        Ok(())
    }

    /// Execute a SQL statement with parameters
    pub fn execute_with_params(&self, sql: &str, params: Vec<serde_json::Value>) -> Sqlite3xResult<usize> {
        log::debug!("Executing SQL with params: {}", sql);
        
        let conn = self.connection.lock()
            .map_err(|e| Sqlite3xError::Connection(format!("Lock error: {}", e)))?;
            
        let sqlite_params = json_params_to_sqlite(params);
        let params_refs: Vec<&dyn rusqlite::ToSql> = sqlite_params.iter().map(|p| p as &dyn rusqlite::ToSql).collect();
        
        let affected = conn.execute(sql, &params_refs[..])
            .map_err(|e| Sqlite3xError::Query(format!("Execute error: {}", e)))?;
        
        log::debug!("Affected rows: {}", affected);
        Ok(affected)
    }

    /// Execute a query with parameters and return results
    pub fn query_with_params(&self, sql: &str, params: Vec<serde_json::Value>) -> Sqlite3xResult<QueryResult> {
        log::debug!("Querying with params: {}", sql);
        
        let conn = self.connection.lock()
            .map_err(|e| Sqlite3xError::Connection(format!("Lock error: {}", e)))?;
        
        let mut stmt = conn.prepare(sql)
            .map_err(|e| Sqlite3xError::Query(format!("Prepare error: {}", e)))?;
        
        // Get column names
        let column_count = stmt.column_count();
        let columns: Vec<String> = (0..column_count)
            .map(|i| stmt.column_name(i).unwrap_or("?").to_string())
            .collect();
        
        // Get column types (basic detection)
        let column_types: Vec<String> = columns.iter().map(|_| "TEXT".to_string()).collect();
        
        // Convert params
        let sqlite_params = json_params_to_sqlite(params);
        let params_refs: Vec<&dyn rusqlite::ToSql> = sqlite_params.iter().map(|p| p as &dyn rusqlite::ToSql).collect();

        // Execute and collect rows
        let mut rows: Vec<Vec<serde_json::Value>> = Vec::new();
        
        let mut query_rows = stmt.query(&params_refs[..])
            .map_err(|e| Sqlite3xError::Query(format!("Query error: {}", e)))?;
        
        while let Some(row) = query_rows.next()
            .map_err(|e| Sqlite3xError::Query(format!("Row error: {}", e)))? {
            let mut row_data: Vec<serde_json::Value> = Vec::new();
            
            for i in 0..column_count {
                let value = row.get_ref(i)
                    .map_err(|e| Sqlite3xError::Query(format!("Column error: {}", e)))?;
                
                let json_value = match value {
                    rusqlite::types::ValueRef::Null => serde_json::Value::Null,
                    rusqlite::types::ValueRef::Integer(i) => serde_json::Value::Number(i.into()),
                    rusqlite::types::ValueRef::Real(f) => {
                        serde_json::Number::from_f64(f)
                            .map(serde_json::Value::Number)
                            .unwrap_or(serde_json::Value::Null)
                    }
                    rusqlite::types::ValueRef::Text(s) => {
                        serde_json::Value::String(String::from_utf8_lossy(s).to_string())
                    }
                    rusqlite::types::ValueRef::Blob(b) => {
                        serde_json::Value::String(format!("<BLOB {} bytes>", b.len()))
                    }
                };
                
                row_data.push(json_value);
            }
            
            rows.push(row_data);
        }
        
        log::debug!("Query returned {} rows", rows.len());
        
        Ok(QueryResult {
            columns,
            column_types,
            rows,
        })
    }

    /// Execute a query (legacy wrapper)
    pub fn query(&self, sql: &str) -> Sqlite3xResult<QueryResult> {
        self.query_with_params(sql, Vec::new())
    }

    /// Backup the current database to a destination file
    pub fn backup_to_file(&self, dest_path: &str) -> Sqlite3xResult<()> {
        log::info!("Backing up database to: {}", dest_path);
        
        let mut dest_conn = Connection::open(dest_path)
            .map_err(|e| Sqlite3xError::Connection(format!("Failed to open destination database: {}", e)))?;
            
        let src_conn = self.connection.lock()
            .map_err(|e| Sqlite3xError::Connection(format!("Lock error: {}", e)))?;
            
        let backup = rusqlite::backup::Backup::new(&src_conn, &mut dest_conn)
            .map_err(|e| Sqlite3xError::Query(format!("Backup initialization error: {}", e)))?;
            
        backup.run_to_completion(5, std::time::Duration::from_millis(250), None)
            .map_err(|e| Sqlite3xError::Query(format!("Backup execution error: {}", e)))?;
            
        log::info!("Backup completed successfully: {}", dest_path);
        Ok(())
    }

    /// Restore the current database from a source file
    pub fn restore_from_file(&self, src_path: &str) -> Sqlite3xResult<()> {
        log::info!("Restoring database from: {}", src_path);
        
        let src_conn = Connection::open(src_path)
            .map_err(|e| Sqlite3xError::Connection(format!("Failed to open source database: {}", e)))?;
            
        let mut dest_conn = self.connection.lock()
            .map_err(|e| Sqlite3xError::Connection(format!("Lock error: {}", e)))?;
            
        let backup = rusqlite::backup::Backup::new(&src_conn, &mut dest_conn)
            .map_err(|e| Sqlite3xError::Query(format!("Restore initialization error: {}", e)))?;
            
        backup.run_to_completion(5, std::time::Duration::from_millis(250), None)
            .map_err(|e| Sqlite3xError::Query(format!("Restore execution error: {}", e)))?;
            
        log::info!("Restore completed successfully from: {}", src_path);
        Ok(())
    }

    /// Enable or disable statement caching via sqlite3x
    pub fn set_cache_enabled(&self, enabled: bool) -> Sqlite3xResult<()> {
        log::debug!("Setting cache enabled: {}", enabled);

        let conn = self.connection.lock()
            .map_err(|e| Sqlite3xError::Connection(format!("Lock error: {}", e)))?;

        // Get raw handle and call FFI
        unsafe {
            let handle = conn.handle();
            super::ffi::set_cache_enabled(handle as *mut std::ffi::c_void, enabled)?;
        }

        Ok(())
    }
}

/// Helper to convert JSON params to Rusqlite values
fn json_params_to_sqlite(params: Vec<serde_json::Value>) -> Vec<rusqlite::types::Value> {
    params.into_iter().map(|p| match p {
        serde_json::Value::Null => rusqlite::types::Value::Null,
        serde_json::Value::Bool(b) => rusqlite::types::Value::Integer(if b { 1 } else { 0 }),
        serde_json::Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                rusqlite::types::Value::Integer(i)
            } else if let Some(f) = n.as_f64() {
                rusqlite::types::Value::Real(f)
            } else {
                rusqlite::types::Value::Null
            }
        },
        serde_json::Value::String(s) => rusqlite::types::Value::Text(s),
        serde_json::Value::Array(a) => rusqlite::types::Value::Text(serde_json::to_string(&a).unwrap_or_default()),
        serde_json::Value::Object(o) => rusqlite::types::Value::Text(serde_json::to_string(&o).unwrap_or_default()),
    }).collect()
}

impl Database {
    /// Get schema information
    pub fn get_schema(&self) -> Sqlite3xResult<SchemaInfo> {
        let conn = self.connection.lock()
            .map_err(|e| Sqlite3xError::Connection(format!("Lock error: {}", e)))?;
        
        // Get tables
        let mut tables = Vec::new();
        {
            let mut stmt = conn.prepare(
                "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
            ).map_err(|e| Sqlite3xError::Query(format!("Schema query error: {}", e)))?;
            
            let mut rows = stmt.query([])
                .map_err(|e| Sqlite3xError::Query(format!("Schema query error: {}", e)))?;
            
            while let Some(row) = rows.next().map_err(|e| Sqlite3xError::Query(e.to_string()))? {
                let name: String = row.get(0).unwrap_or_default();
                let sql: Option<String> = row.get(1).ok();
                
                // Get columns for this table
                let mut columns = Vec::new();
                {
                    let pragma_sql = format!("PRAGMA table_info({})", name);
                    let mut col_stmt = conn.prepare(&pragma_sql).map_err(|e| Sqlite3xError::Query(e.to_string()))?;
                    let mut col_rows = col_stmt.query([]).map_err(|e| Sqlite3xError::Query(e.to_string()))?;
                    
                    while let Some(col_row) = col_rows.next().map_err(|e| Sqlite3xError::Query(e.to_string()))? {
                        let col_name: String = col_row.get(1).unwrap_or_default();
                        
                        // Check if this column is a foreign key
                        let mut foreign_key = None;
                        {
                            let fk_sql = format!("PRAGMA foreign_key_list({})", name);
                            let mut fk_stmt = conn.prepare(&fk_sql).map_err(|e| Sqlite3xError::Query(e.to_string()))?;
                            let mut fk_rows = fk_stmt.query([]).map_err(|e| Sqlite3xError::Query(e.to_string()))?;
                            while let Some(fk_row) = fk_rows.next().map_err(|e| Sqlite3xError::Query(e.to_string()))? {
                                let from_col: String = fk_row.get(3).unwrap_or_default();
                                if from_col == col_name {
                                    foreign_key = Some(ForeignKeyInfo {
                                        table: fk_row.get(2).unwrap_or_default(),
                                        column: fk_row.get(4).unwrap_or_default(),
                                    });
                                    break;
                                }
                            }
                        }

                        columns.push(ColumnInfo {
                            name: col_name,
                            data_type: col_row.get(2).unwrap_or_default(),
                            not_null: col_row.get(3).unwrap_or(0) != 0,
                            primary_key: col_row.get(5).unwrap_or(0) != 0,
                            default_value: col_row.get(4).ok(),
                            foreign_key,
                        });
                    }
                }

                tables.push(TableInfo {
                    name,
                    sql,
                    columns,
                });
            }
        }
        
        // Get views
        let mut views = Vec::new();
        {
            let mut stmt = conn.prepare(
                "SELECT name, sql FROM sqlite_master WHERE type='view' ORDER BY name"
            ).map_err(|e| Sqlite3xError::Query(format!("View query error: {}", e)))?;
            
            let mut rows = stmt.query([])
                .map_err(|e| Sqlite3xError::Query(format!("View query error: {}", e)))?;
            
            while let Some(row) = rows.next().map_err(|e| Sqlite3xError::Query(e.to_string()))? {
                let name: String = row.get(0).unwrap_or_default();
                let sql: Option<String> = row.get(1).ok();
                views.push(ViewInfo { name, sql });
            }
        }
        
        // Get indexes
        let mut indexes = Vec::new();
        {
            let mut stmt = conn.prepare(
                "SELECT name, tbl_name, sql FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' ORDER BY name"
            ).map_err(|e| Sqlite3xError::Query(format!("Index query error: {}", e)))?;
            
            let mut rows = stmt.query([])
                .map_err(|e| Sqlite3xError::Query(format!("Index query error: {}", e)))?;
            
            while let Some(row) = rows.next().map_err(|e| Sqlite3xError::Query(e.to_string()))? {
                let name: String = row.get(0).unwrap_or_default();
                let table_name: String = row.get(1).unwrap_or_default();
                let sql: Option<String> = row.get(2).ok();
                let unique = sql.as_ref().map(|s| s.contains("UNIQUE")).unwrap_or(false);
                indexes.push(IndexInfo {
                    name,
                    table_name,
                    sql,
                    unique,
                    columns: Vec::new(),
                });
            }
        }
        
        // Get triggers
        let mut triggers = Vec::new();
        {
            let mut stmt = conn.prepare(
                "SELECT name, tbl_name, sql FROM sqlite_master WHERE type='trigger' ORDER BY name"
            ).map_err(|e| Sqlite3xError::Query(format!("Trigger query error: {}", e)))?;
            
            let mut rows = stmt.query([])
                .map_err(|e| Sqlite3xError::Query(format!("Trigger query error: {}", e)))?;
            
            while let Some(row) = rows.next().map_err(|e| Sqlite3xError::Query(e.to_string()))? {
                let name: String = row.get(0).unwrap_or_default();
                let table_name: String = row.get(1).unwrap_or_default();
                let sql: Option<String> = row.get(2).ok();
                triggers.push(TriggerInfo {
                    name,
                    table_name,
                    sql,
                });
            }
        }
        
        Ok(SchemaInfo {
            tables,
            views,
            indexes,
            triggers,
        })
    }

    /// Get database path
    pub fn get_path(&self) -> &str {
        &self.path
    }

    pub fn set_partition_manager(&self, manager: Arc<super::partition::PartitionManager>) {
        let mut field = self.partition_manager.write();
        *field = Some(manager);
    }

    pub fn get_partition_manager(&self) -> Option<Arc<super::partition::PartitionManager>> {
        self.partition_manager.read().clone()
    }

    pub fn attach_database_for_partition(&self, alias: &str, path: &str) -> crate::sqlite3x::errors::Sqlite3xResult<()> {
        let conn = self.connection.lock().map_err(|e| crate::sqlite3x::errors::Sqlite3xError::Connection(format!("Lock error: {}", e)))?;
        let sql = format!("ATTACH DATABASE '{}' AS {}", path, alias);
        conn.execute(&sql, []).map_err(|e| crate::sqlite3x::errors::Sqlite3xError::Query(format!("Attach error: {}", e)))?;
        Ok(())
    }

    /// Register an update hook
    /// 
    /// The callback is invoked whenever a row is updated, inserted or deleted in a rowid table.
    pub fn on_update<F>(&self, callback: F) -> Sqlite3xResult<()>
    where
        F: FnMut(Action, &str, &str, i64) + Send + std::panic::UnwindSafe + 'static,
    {
        let conn = self.connection.lock()
            .map_err(|e| Sqlite3xError::Connection(format!("Lock error: {}", e)))?;
        
        conn.update_hook(Some(callback));
        Ok(())
    }

    /// Register a scalar UDF
    pub fn create_scalar_function<F, V>(
        &self,
        function_name: &str,
        n_arg: i32,
        deterministic: bool,
        x_func: F,
    ) -> Sqlite3xResult<()>
    where
        F: FnMut(&rusqlite::functions::Context<'_>) -> rusqlite::Result<V> + Send + std::panic::UnwindSafe + 'static,
        V: rusqlite::types::ToSql,
    {
        let conn = self.connection.lock()
            .map_err(|e| Sqlite3xError::Connection(format!("Lock error: {}", e)))?;
        
        let flags = if deterministic {
            rusqlite::functions::FunctionFlags::SQLITE_DETERMINISTIC | rusqlite::functions::FunctionFlags::SQLITE_UTF8
        } else {
            rusqlite::functions::FunctionFlags::SQLITE_UTF8
        };

        conn.create_scalar_function(function_name, n_arg, flags, x_func)
            .map_err(|e| Sqlite3xError::Query(format!("Failed to create scalar function: {}", e)))?;
        
        // Track the function name
        let mut udfs = self.registered_udfs.lock().unwrap();
        udfs.insert(function_name.to_string());
        
        Ok(())
    }

    /// Get list of registered UDF names
    pub fn get_registered_functions(&self) -> Vec<String> {
        let udfs = self.registered_udfs.lock().unwrap();
        udfs.iter().cloned().collect()
    }

    /// Get list of attached databases (shards)
    pub fn get_attached_databases(&self) -> Sqlite3xResult<Vec<AttachedDatabase>> {
        let conn = self.connection.lock()
            .map_err(|e| Sqlite3xError::Connection(format!("Lock error: {}", e)))?;
        
        let mut stmt = conn.prepare("PRAGMA database_list")
            .map_err(|e| Sqlite3xError::Query(format!("Pragma error: {}", e)))?;
        
        let mut dbs = Vec::new();
        let mut rows = stmt.query([])
            .map_err(|e| Sqlite3xError::Query(format!("Query error: {}", e)))?;
        
        while let Some(row) = rows.next().map_err(|e| Sqlite3xError::Query(e.to_string()))? {
            let seq: i32 = row.get(0).unwrap_or(0);
            let name: String = row.get(1).unwrap_or_default();
            let file: Option<String> = row.get(2).ok();
            dbs.push(AttachedDatabase { seq, name, file });
        }
        
        Ok(dbs)
    }
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct AttachedDatabase {
    pub seq: i32,
    pub name: String,
    pub file: Option<String>,
}

// =============================================================================
// Result Types
// =============================================================================

#[derive(Debug, Clone)]
pub struct QueryResult {
    pub columns: Vec<String>,
    pub column_types: Vec<String>,
    pub rows: Vec<Vec<serde_json::Value>>,
}

#[derive(Debug, Clone)]
pub struct SchemaInfo {
    pub tables: Vec<TableInfo>,
    pub views: Vec<ViewInfo>,
    pub indexes: Vec<IndexInfo>,
    pub triggers: Vec<TriggerInfo>,
}

#[derive(Debug, Clone)]
pub struct TableInfo {
    pub name: String,
    pub sql: Option<String>,
    pub columns: Vec<ColumnInfo>,
}

#[derive(Debug, Clone)]
pub struct ColumnInfo {
    pub name: String,
    pub data_type: String,
    pub not_null: bool,
    pub primary_key: bool,
    pub default_value: Option<String>,
    pub foreign_key: Option<ForeignKeyInfo>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ForeignKeyInfo {
    pub table: String,
    pub column: String,
}

#[derive(Debug, Clone)]
pub struct ViewInfo {
    pub name: String,
    pub sql: Option<String>,
}

#[derive(Debug, Clone)]
pub struct IndexInfo {
    pub name: String,
    pub table_name: String,
    pub sql: Option<String>,
    pub unique: bool,
    pub columns: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct TriggerInfo {
    pub name: String,
    pub table_name: String,
    pub sql: Option<String>,
}
