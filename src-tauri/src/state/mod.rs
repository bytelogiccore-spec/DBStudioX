//! Application State Management
//!
//! Provides thread-safe state management for the application.

mod app_state;
mod connection_pool;

pub use app_state::AppState;
pub use connection_pool::{QueryStats, TransactionInfo};
