use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("Database connection error: {0}")]
    ConnectionError(String),

    #[error("Query execution error: {0}")]
    QueryError(String),

    #[error("Command execution error: {0}")]
    CommandError(String),

    #[error("Serialization error: {0}")]
    SerializationError(String),

    #[error("File system error: {0}")]
    FsError(String),

    #[error("I/O error: {0}")]
    IoError(String),

    #[error("Bad request: {0}")]
    BadRequest(String),

    #[error("Internal error: {0}")]
    InternalError(String),

    #[error("Not found: {0}")]
    NotFound(String),
}

// Implement Serialize so we can return this error from Tauri commands
impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

pub type AppResult<T> = Result<T, AppError>;
