//! sqlite3x Type Definitions
//!
//! Rust types that map to sqlite3x FFI types.

/// Database handle (maps to sqlite3x DatabaseHandle)
pub type DatabaseHandle = i64;

/// Statement handle (maps to sqlite3x StatementHandle)
pub type StatementHandle = i64;

/// Transaction handle
pub type TransactionHandle = i64;

/// SQLite result codes
#[repr(i32)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ResultCode {
    Ok = 0,
    Error = 1,
    Internal = 2,
    Perm = 3,
    Abort = 4,
    Busy = 5,
    Locked = 6,
    NoMem = 7,
    ReadOnly = 8,
    Interrupt = 9,
    IoErr = 10,
    Corrupt = 11,
    NotFound = 12,
    Full = 13,
    CantOpen = 14,
    Protocol = 15,
    Empty = 16,
    Schema = 17,
    TooBig = 18,
    Constraint = 19,
    Mismatch = 20,
    Misuse = 21,
    NoLfs = 22,
    Auth = 23,
    Format = 24,
    Range = 25,
    NotADb = 26,
    Notice = 27,
    Warning = 28,
    Row = 100,
    Done = 101,
}

impl ResultCode {
    pub fn is_ok(&self) -> bool {
        matches!(self, ResultCode::Ok | ResultCode::Row | ResultCode::Done)
    }

    pub fn is_error(&self) -> bool {
        !self.is_ok()
    }
}

impl From<i32> for ResultCode {
    fn from(code: i32) -> Self {
        match code {
            0 => ResultCode::Ok,
            1 => ResultCode::Error,
            100 => ResultCode::Row,
            101 => ResultCode::Done,
            _ => ResultCode::Error,
        }
    }
}

/// SQLite column types
#[repr(i32)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ColumnType {
    Integer = 1,
    Float = 2,
    Text = 3,
    Blob = 4,
    Null = 5,
}

impl From<i32> for ColumnType {
    fn from(type_code: i32) -> Self {
        match type_code {
            1 => ColumnType::Integer,
            2 => ColumnType::Float,
            3 => ColumnType::Text,
            4 => ColumnType::Blob,
            _ => ColumnType::Null,
        }
    }
}

/// Database open flags
#[derive(Debug, Clone, Copy)]
pub struct OpenFlags {
    pub read_only: bool,
    pub read_write: bool,
    pub create: bool,
    pub wal_mode: bool,
}

impl Default for OpenFlags {
    fn default() -> Self {
        Self {
            read_only: false,
            read_write: true,
            create: true,
            wal_mode: true,
        }
    }
}
