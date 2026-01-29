//! sqlite3x Integration Layer
//!
//! Provides safe wrappers around SQLite using rusqlite.

pub mod errors;
pub mod partition;
pub mod types;
pub mod wrapper;

pub use errors::Sqlite3xError;
pub use partition::{
    PartitionConfig, PartitionManager, PartitionMetadata, PartitionPolicy, PartitionStrategy,
};
pub use wrapper::{
    AttachedDatabase, ColumnInfo, Database, IndexInfo, QueryResult, SchemaInfo, TableInfo,
    TriggerInfo, ViewInfo,
};
