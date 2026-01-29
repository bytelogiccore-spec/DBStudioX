//! DBStudioX Library Root
//!
//! This module serves as the library root and configures the Tauri application.

pub mod commands;
pub mod events;
pub mod sqlite3x;
pub mod state;
pub mod utils;

use state::AppState;
use tauri::Manager;

/// Run the Tauri application
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            // Initialize application state as a shared Arc
            let app_state = std::sync::Arc::new(AppState::new());

            // Manage the state for Tauri commands
            // Tauri will automatically handle the Arc if we specify the type correctly,
            // but for simplicity and clarity with the background tasks, we manage the Arc itself.
            app.manage(app_state.clone());

            log::info!("Shared application state initialized and managed");

            // Setup event handlers with the same Arc instance
            events::setup_event_handlers(app.handle(), app_state);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Database commands
            commands::database::connect_database,
            commands::database::disconnect_database,
            commands::database::get_database_list,
            commands::database::backup_database,
            commands::database::restore_database,
            // Query commands
            commands::query::execute_query,
            commands::query::execute_query_with_connection,
            commands::query::explain_query,
            // Transaction commands
            commands::transaction::begin_transaction,
            commands::transaction::commit_transaction,
            commands::transaction::rollback_transaction,
            // Schema commands
            commands::schema::get_schema,
            commands::schema::get_table_info,
            // Stats commands
            commands::stats::get_stats,
            commands::stats::clear_cache,
            commands::stats::set_cache_enabled,
            // File commands
            commands::file::open_file_dialog,
            commands::file::save_file_dialog,
            commands::file::create_database_dialog,
            commands::file::export_query_result,
            // File system navigation commands
            commands::file::list_directory,
            commands::file::get_drives,
            commands::file::get_home_directory,
            commands::file::get_special_directories,
            commands::file::path_exists,
            commands::file::create_directory,
            commands::file::get_parent_directory,
            // UDF commands
            commands::udf::register_built_in_udfs,
            commands::udf::get_udf_list,
            commands::udf::create_user_function,
            commands::udf::delete_user_function,
            // Partition commands
            commands::partition::initialize_partitioning,
            commands::partition::get_partition_info,
            commands::partition::get_attached_shards,
            commands::partition::create_partition_policy,
            commands::partition::get_partition_policies,
            commands::partition::delete_partition_policy,
            commands::partition::run_partition_maintenance,
            // Migration commands
            commands::migration::import_data,
            commands::migration::export_data,
            commands::migration::copy_table,
            commands::schema_management::diff_schemas,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
