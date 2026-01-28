//! Event System
//!
//! Handles event emission to the frontend.

pub mod data_change;
mod performance;

use tauri::AppHandle;

/// Setup all event handlers
pub fn setup_event_handlers(app: &AppHandle, state: std::sync::Arc<crate::state::AppState>) {
    log::info!("Setting up event handlers");
    
    // Start performance monitoring in a background task
    let app_clone = app.clone();
    let state_clone = state.clone();
    tauri::async_runtime::spawn(async move {
        performance::start_monitoring(app_clone, state_clone, 1000).await;
    });
}

pub use data_change::DataChangeEvent;
pub use performance::PerformanceEvent;
