//! sqlite3x Error Types
//!
//! Error types for sqlite3x operations.

use thiserror::Error;

/// sqlite3x error type
#[derive(Debug, Error)]
pub enum Sqlite3xError {
    #[error("Connection error: {0}")]
    Connection(String),

    #[error("Query error: {0}")]
    Query(String),

    #[error("Transaction error: {0}")]
    Transaction(String),

    #[error("Schema error: {0}")]
    Schema(String),

    #[error("FFI error: {0}")]
    Ffi(String),

    #[error("Invalid handle: {0}")]
    InvalidHandle(String),

    #[error("Type conversion error: {0}")]
    TypeConversion(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("UTF-8 error: {0}")]
    Utf8(#[from] std::str::Utf8Error),

    #[error("Partition key not found: {0}")]
    PartitionKeyNotFound(String),

    #[error("Invalid SQL: {0}")]
    InvalidSql(String),

    #[error("Shard not found: {0}")]
    ShardNotFound(String),

    #[error("Sharding policy violation: {0}")]
    ShardingPolicyViolation(String),

    #[error("Global uniqueness violation: {0}")]
    GlobalUniquenessViolation(String),
}

impl From<Sqlite3xError> for String {
    fn from(err: Sqlite3xError) -> String {
        err.to_string()
    }
}

/// Result type for sqlite3x operations
pub type Sqlite3xResult<T> = Result<T, Sqlite3xError>;
