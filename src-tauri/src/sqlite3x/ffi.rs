use libloading::{Library, Symbol};
use std::sync::OnceLock;
use std::ffi::c_void;
use crate::sqlite3x::errors::{Sqlite3xError, Sqlite3xResult};

// Global instance of the library
static LIBRARY: OnceLock<Library> = OnceLock::new();

/// Load the sqlite3x library
fn get_library() -> Sqlite3xResult<&'static Library> {
    if let Some(lib) = LIBRARY.get() {
        return Ok(lib);
    }

    // Determine library name based on OS, but fallback to sqlite3x.dll as it is the only one present in repo
    let library_names = if cfg!(target_os = "windows") {
        vec!["sqlite3x.dll"]
    } else if cfg!(target_os = "macos") {
        vec!["libsqlite3x.dylib", "sqlite3x.dll"]
    } else {
        vec!["libsqlite3x.so", "sqlite3x.dll"]
    };

    // Paths to search
    let mut paths = Vec::new();
    for name in library_names {
        paths.push(name.to_string());
        paths.push(format!("src-tauri/{}", name));
        paths.push(format!("../{}", name));
        paths.push(format!("./{}", name));
    }

    for path in paths {
        // unsafe because loading a library can execute arbitrary code
        // We use catch_unwind? No, Library::new returns Result.
        let lib = unsafe { Library::new(&path) };
        if let Ok(lib) = lib {
            log::info!("Loaded sqlite3x library from: {}", path);
            return Ok(LIBRARY.get_or_init(|| lib));
        }
    }

    Err(Sqlite3xError::Connection("Failed to load sqlite3x library".to_string()))
}

/// Set cache enabled for a specific database connection
///
/// Corresponds to: void sqlite3x_database_set_cache_enabled(sqlite3* db, int enabled);
pub fn set_cache_enabled(handle: *mut c_void, enabled: bool) -> Sqlite3xResult<()> {
    let lib = get_library()?;

    unsafe {
        // Signature: fn(handle: *mut c_void, enabled: i32)
        // We assume the symbol name matches the TODO in the codebase
        let func: Symbol<unsafe extern "C" fn(*mut c_void, i32)> = lib.get(b"sqlite3x_database_set_cache_enabled")
            .map_err(|e| Sqlite3xError::Connection(format!("Failed to load symbol 'sqlite3x_database_set_cache_enabled': {}", e)))?;

        func(handle, if enabled { 1 } else { 0 });
    }

    Ok(())
}
