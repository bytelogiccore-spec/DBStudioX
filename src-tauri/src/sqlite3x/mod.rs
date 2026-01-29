//! sqlite3x Integration Layer
//!
//! Provides safe wrappers around SQLite using rusqlite.

pub mod errors;
pub mod types;
pub mod wrapper;
pub mod partition;
pub mod ffi;

pub use errors::Sqlite3xError;
pub use wrapper::{Database, QueryResult, SchemaInfo, TableInfo, ViewInfo, IndexInfo, TriggerInfo, ColumnInfo, AttachedDatabase};
pub use partition::{PartitionManager, PartitionConfig, PartitionStrategy, PartitionPolicy, PartitionMetadata};
