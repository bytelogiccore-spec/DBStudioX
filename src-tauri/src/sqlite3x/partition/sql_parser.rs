// SQL 파서 모듈
// SQL 쿼리를 파싱하여 파티션 키를 추출합니다.

use crate::sqlite3x::errors::{Sqlite3xError as Sqlite3Error, Sqlite3xResult as Sqlite3Result};

/// 파싱된 SQL 문 정보
#[derive(Debug, Clone)]
pub struct ParsedStatement {
    /// SQL 문 타입
    pub statement_type: StatementType,
    /// 테이블 이름
    pub table_name: String,
    /// 컬럼 목록 (INSERT의 경우)
    pub columns: Vec<String>,
    /// VALUES 절의 값들 (INSERT의 경우)
    pub values: Vec<String>,
    /// WHERE 절 조건 (UPDATE/DELETE/SELECT의 경우)
    pub where_clause: Option<String>,
    /// SET 절 (UPDATE의 경우)
    pub set_clause: Option<String>,
}

/// SQL 문 타입
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum StatementType {
    Insert,
    Update,
    Delete,
    Select,
}

/// SQL 파서
pub struct SqlParser;

impl SqlParser {
    /// 새로운 SQL 파서 생성
    pub fn new() -> Self {
        Self
    }

    /// SQL 인젝션 패턴 감지
    fn detect_sql_injection_patterns(&self, sql: &str) -> Sqlite3Result<()> {
        let sql_upper = sql.trim().to_uppercase();
        
        let allowed_prefixes = ["INSERT", "UPDATE", "DELETE", "SELECT"];
        let starts_with_allowed = allowed_prefixes.iter()
            .any(|prefix| sql_upper.starts_with(prefix));
        
        if !starts_with_allowed {
            return Err(Sqlite3Error::InvalidSql(
                "Only INSERT, UPDATE, DELETE, SELECT statements are supported for partitioning".to_string()
            ));
        }
        
        let ddl_keywords = [" DROP ", " ALTER ", " CREATE ", " TRUNCATE "];
        for keyword in &ddl_keywords {
            if sql_upper.contains(keyword) {
                return Err(Sqlite3Error::InvalidSql(
                    format!("DDL statements are not supported for partitioning: '{}'", keyword.trim())
                ));
            }
        }
        
        if sql.contains("--") || sql.contains("/*") || sql.contains("*/") {
            return Err(Sqlite3Error::InvalidSql(
                "SQL comments are not allowed for security reasons".to_string()
            ));
        }
        
        if sql_upper.matches("SELECT").count() > 1 {
            return Err(Sqlite3Error::InvalidSql(
                "Nested SELECT statements (subqueries) are not supported for partitioning".to_string()
            ));
        }
        
        Ok(())
    }

    fn validate_identifier(&self, identifier: &str) -> Sqlite3Result<()> {
        if identifier.is_empty() {
            return Err(Sqlite3Error::InvalidSql(
                "Empty identifier not allowed".to_string()
            ));
        }
        
        let first_char = identifier.chars().next()
            .ok_or_else(|| Sqlite3Error::InvalidSql(
                "Invalid identifier: empty".to_string()
            ))?;
        
        if !first_char.is_alphabetic() && first_char != '_' {
            return Err(Sqlite3Error::InvalidSql(
                format!("Invalid identifier '{}': must start with letter or underscore", identifier)
            ));
        }
        
        for ch in identifier.chars().skip(1) {
            if !ch.is_alphanumeric() && ch != '_' {
                return Err(Sqlite3Error::InvalidSql(
                    format!("Invalid identifier '{}': contains invalid character '{}'", identifier, ch)
                ));
            }
        }
        
        Ok(())
    }

    pub fn parse_insert(&self, sql: &str) -> Sqlite3Result<ParsedStatement> {
        self.detect_sql_injection_patterns(sql)?;
        let sql_upper = sql.trim().to_uppercase();
        if !sql_upper.starts_with("INSERT INTO ") {
            return Err(Sqlite3Error::InvalidSql("Not an INSERT statement".to_string()));
        }
        let sql_lower = sql.trim();
        let after_into = &sql_lower[12..];
        let table_end = after_into.find([' ', '(', '\n', '\r']).ok_or_else(|| Sqlite3Error::InvalidSql("Table name not found".to_string()))?;
        let table_name = after_into[..table_end].trim().to_string();
        self.validate_identifier(&table_name)?;
        let rest = &after_into[table_end..].trim_start();
        let (columns, values) = if rest.starts_with('(') {
            let col_end = rest.find(')').ok_or_else(|| Sqlite3Error::InvalidSql("Column list not closed".to_string()))?;
            let col_list = &rest[1..col_end];
            let columns: Vec<String> = col_list.split(',').map(|s| s.trim().to_string()).filter(|s| !s.is_empty()).collect();
            for col in &columns { self.validate_identifier(col)?; }
            let after_cols = &rest[col_end + 1..].trim_start();
            if !after_cols.to_uppercase().starts_with("VALUES") {
                return Err(Sqlite3Error::InvalidSql("VALUES keyword not found".to_string()));
            }
            let after_values = &after_cols[6..].trim_start();
            if !after_values.starts_with('(') {
                return Err(Sqlite3Error::InvalidSql("VALUES clause not found".to_string()));
            }
            let val_end = after_values.find(')').ok_or_else(|| Sqlite3Error::InvalidSql("VALUES clause not closed".to_string()))?;
            let val_list = &after_values[1..val_end];
            let values: Vec<String> = val_list.split(',').map(|s| s.trim().to_string()).filter(|s| !s.is_empty()).collect();
            (columns, values)
        } else {
            if !rest.to_uppercase().starts_with("VALUES") {
                return Err(Sqlite3Error::InvalidSql("VALUES keyword not found".to_string()));
            }
            let after_values = &rest[6..].trim_start();
            if !after_values.starts_with('(') {
                return Err(Sqlite3Error::InvalidSql("VALUES clause not found".to_string()));
            }
            let val_end = after_values.find(')').ok_or_else(|| Sqlite3Error::InvalidSql("VALUES clause not closed".to_string()))?;
            let val_list = &after_values[1..val_end];
            let values: Vec<String> = val_list.split(',').map(|s| s.trim().to_string()).filter(|s| !s.is_empty()).collect();
            (Vec::new(), values)
        };
        Ok(ParsedStatement { statement_type: StatementType::Insert, table_name, columns, values, where_clause: None, set_clause: None })
    }

    pub fn parse_update(&self, sql: &str) -> Sqlite3Result<ParsedStatement> {
        self.detect_sql_injection_patterns(sql)?;
        let sql_upper = sql.trim().to_uppercase();
        if !sql_upper.starts_with("UPDATE ") { return Err(Sqlite3Error::InvalidSql("Not an UPDATE statement".to_string())); }
        let sql_lower = sql.trim();
        let after_update = &sql_lower[7..];
        let table_end = after_update.find([' ', '\n', '\r']).ok_or_else(|| Sqlite3Error::InvalidSql("Table name not found".to_string()))?;
        let table_name = after_update[..table_end].trim().to_string();
        self.validate_identifier(&table_name)?;
        let rest = &after_update[table_end..].trim_start();
        if !rest.to_uppercase().starts_with("SET") { return Err(Sqlite3Error::InvalidSql("SET keyword not found".to_string())); }
        let after_set = &rest[3..].trim_start();
        let (set_clause, where_clause) = if let Some(where_pos) = after_set.to_uppercase().find(" WHERE ") {
            let set = after_set[..where_pos].trim().to_string();
            let where_clause = after_set[where_pos + 7..].trim().to_string();
            (set, Some(where_clause))
        } else { (after_set.trim().to_string(), None) };
        Ok(ParsedStatement { statement_type: StatementType::Update, table_name, columns: Vec::new(), values: Vec::new(), where_clause, set_clause: Some(set_clause) })
    }

    pub fn parse_delete(&self, sql: &str) -> Sqlite3Result<ParsedStatement> {
        self.detect_sql_injection_patterns(sql)?;
        let sql_upper = sql.trim().to_uppercase();
        if !sql_upper.starts_with("DELETE FROM ") { return Err(Sqlite3Error::InvalidSql("Not a DELETE statement".to_string())); }
        let sql_lower = sql.trim();
        let after_from = &sql_lower[12..];
        let table_end = after_from.find([' ', ';', '\n', '\r']).ok_or_else(|| Sqlite3Error::InvalidSql("Table name not found".to_string()))?;
        let table_name = after_from[..table_end].trim().to_string();
        self.validate_identifier(&table_name)?;
        let rest = &after_from[table_end..].trim_start();
        let where_clause = if rest.to_uppercase().starts_with("WHERE") { Some(rest[5..].trim().to_string()) } else { None };
        Ok(ParsedStatement { statement_type: StatementType::Delete, table_name, columns: Vec::new(), values: Vec::new(), where_clause, set_clause: None })
    }

    pub fn parse_select(&self, sql: &str) -> Sqlite3Result<ParsedStatement> {
        self.detect_sql_injection_patterns(sql)?;
        let sql_upper = sql.trim().to_uppercase();
        if !sql_upper.starts_with("SELECT ") { return Err(Sqlite3Error::InvalidSql("Not a SELECT statement".to_string())); }
        let sql_lower = sql.trim();
        let from_pos = sql_upper.find(" FROM ").ok_or_else(|| Sqlite3Error::InvalidSql("FROM keyword not found".to_string()))?;
        let after_from = &sql_lower[from_pos + 6..];
        let table_end = after_from.find([' ', ';', '\n', '\r']).ok_or_else(|| Sqlite3Error::InvalidSql("Table name not found".to_string()))?;
        let table_name = after_from[..table_end].trim().to_string();
        self.validate_identifier(&table_name)?;
        let rest = &after_from[table_end..];
        let where_clause = if let Some(where_pos) = rest.to_uppercase().find(" WHERE ") {
            let after_where = &rest[where_pos + 7..];
            let where_end = after_where.to_uppercase().find(" GROUP BY ").or_else(|| after_where.to_uppercase().find(" ORDER BY ")).or_else(|| after_where.to_uppercase().find(" LIMIT ")).unwrap_or(after_where.len());
            Some(after_where[..where_end].trim().to_string())
        } else { None };
        Ok(ParsedStatement { statement_type: StatementType::Select, table_name, columns: Vec::new(), values: Vec::new(), where_clause, set_clause: None })
    }

    pub fn extract_partition_key_value(&self, statement: &ParsedStatement, key_column: &str) -> Sqlite3Result<String> {
        match statement.statement_type {
            StatementType::Insert => {
                let key_index = statement.columns.iter().position(|col| col.eq_ignore_ascii_case(key_column)).ok_or_else(|| Sqlite3Error::PartitionKeyNotFound(format!("Key '{}' not found in INSERT", key_column)))?;
                statement.values.get(key_index).cloned().ok_or_else(|| Sqlite3Error::PartitionKeyNotFound("Value not found".to_string()))
            }
            StatementType::Update | StatementType::Delete | StatementType::Select => {
                let where_clause = statement.where_clause.as_ref().ok_or_else(|| Sqlite3Error::PartitionKeyNotFound("WHERE clause required".to_string()))?;
                let pattern = format!("{} =", key_column);
                let pattern_upper = pattern.to_uppercase();
                let where_upper = where_clause.to_uppercase();
                if let Some(pos) = where_upper.find(&pattern_upper) {
                    let after_eq = &where_clause[pos + pattern.len()..].trim_start();
                    let value_end = after_eq.find([' ', ';', '\n', '\r']).unwrap_or(after_eq.len());
                    Ok(after_eq[..value_end].trim().trim_matches(['\'', '"', '`']).to_string())
                } else { Err(Sqlite3Error::PartitionKeyNotFound(format!("Key '{}' not found in WHERE", key_column))) }
            }
        }
    }
}

impl Default for SqlParser { fn default() -> Self { Self::new() } }
