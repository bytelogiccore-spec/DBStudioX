use crate::sqlite3x::wrapper::{SchemaInfo, TableInfo};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SchemaDiffResult {
    pub tables_to_create: Vec<String>, // SQL statements
    pub tables_to_drop: Vec<String>,
    pub columns_to_add: Vec<String>,
    pub columns_to_drop: Vec<String>, // Note: SQLite doesn't support DROP COLUMN in older versions easily, but 3.35.0+ does.
    pub indexes_to_create: Vec<String>,
    pub indexes_to_drop: Vec<String>,
    pub summary: String,
}

pub fn compare_schemas(source: &SchemaInfo, target: &SchemaInfo) -> SchemaDiffResult {
    let mut diff = SchemaDiffResult {
        tables_to_create: Vec::new(),
        tables_to_drop: Vec::new(),
        columns_to_add: Vec::new(),
        columns_to_drop: Vec::new(),
        indexes_to_create: Vec::new(),
        indexes_to_drop: Vec::new(),
        summary: String::new(),
    };

    // 1. Tables
    let source_tables: std::collections::HashMap<_, _> =
        source.tables.iter().map(|t| (&t.name, t)).collect();
    let target_tables: std::collections::HashMap<_, _> =
        target.tables.iter().map(|t| (&t.name, t)).collect();

    // Tables in source but not in target -> Create in Target (or vice-versa depending on direction)
    // We assume "source" is what we WANT, and "target" is what we HAVE.
    // So we generate SQL to update "target" to match "source".

    for (name, table) in &source_tables {
        if !target_tables.contains_key(name) {
            if let Some(sql) = &table.sql {
                diff.tables_to_create.push(format!("{};", sql));
            }
        } else {
            // Table exists in both, compare columns
            let target_table = target_tables.get(name).unwrap();
            compare_columns(table, target_table, &mut diff);
        }
    }

    for name in target_tables.keys() {
        if !source_tables.contains_key(name) {
            diff.tables_to_drop
                .push(format!("DROP TABLE IF EXISTS {};", name));
        }
    }

    // 2. Indexes
    let source_indexes: std::collections::HashMap<_, _> =
        source.indexes.iter().map(|i| (&i.name, i)).collect();
    let target_indexes: std::collections::HashMap<_, _> =
        target.indexes.iter().map(|i| (&i.name, i)).collect();

    for (name, index) in &source_indexes {
        if !target_indexes.contains_key(name) {
            if let Some(sql) = &index.sql {
                diff.indexes_to_create.push(format!("{};", sql));
            }
        }
    }

    for name in target_indexes.keys() {
        if !source_indexes.contains_key(name) {
            diff.indexes_to_drop
                .push(format!("DROP INDEX IF EXISTS {};", name));
        }
    }

    diff.summary = format!(
        "Found {} tables to create, {} tables to drop, {} indexes to create.",
        diff.tables_to_create.len(),
        diff.tables_to_drop.len(),
        diff.indexes_to_create.len()
    );

    diff
}

fn compare_columns(source: &TableInfo, target: &TableInfo, diff: &mut SchemaDiffResult) {
    let source_cols: std::collections::HashMap<_, _> =
        source.columns.iter().map(|c| (&c.name, c)).collect();
    let target_cols: std::collections::HashMap<_, _> =
        target.columns.iter().map(|c| (&c.name, c)).collect();

    for (name, col) in &source_cols {
        if !target_cols.contains_key(name) {
            let mut sql = format!(
                "ALTER TABLE {} ADD COLUMN {} {}",
                source.name, col.name, col.data_type
            );
            if col.not_null {
                sql.push_str(" NOT NULL");
            }
            if let Some(def) = &col.default_value {
                sql.push_str(&format!(" DEFAULT {}", def));
            }
            diff.columns_to_add.push(format!("{};", sql));
        }
    }

    for name in target_cols.keys() {
        if !source_cols.contains_key(name) {
            diff.columns_to_drop.push(format!(
                "-- SQLite 3.35.0+ supports: ALTER TABLE {} DROP COLUMN {};",
                source.name, name
            ));
        }
    }
}
