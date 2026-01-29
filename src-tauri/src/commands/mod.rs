//! Tauri Command Handlers
//!
//! This module contains all Tauri IPC command handlers organized by domain.

pub mod database;
pub mod file;
pub mod migration;
pub mod partition;
pub mod query;
pub mod schema;
pub mod schema_management;
pub mod stats;
pub mod transaction;
pub mod udf;
