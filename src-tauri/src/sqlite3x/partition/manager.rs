// 파티션 매니저 모듈 (manager.rs)
// ATTACH DATABASE를 활용한 다중 데이터베이스 파일 관리 및 샤딩 지원

use super::sql_parser::{ParsedStatement, SqlParser};
use crate::sqlite3x::errors::{Sqlite3xError as Sqlite3Error, Sqlite3xResult as Sqlite3Result};
use crate::sqlite3x::wrapper::{Database, QueryResult};
use lru::LruCache;
use parking_lot::{Mutex, RwLock};
use std::collections::HashMap;
use std::sync::Arc;

/// 파티셔닝 전략
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub enum PartitionStrategy {
    Hash,
    Range,
    RoundRobin,
}

/// 파티셔닝 정책
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PartitionPolicy {
    pub table_name: String,
    pub date_column: String,
    pub interval: String,
    pub retention: u32,
    pub auto_indexing: bool,
}

/// 파티셔닝 설정
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PartitionConfig {
    pub strategy: PartitionStrategy,
    pub shards: Vec<String>,
    pub key_column: Option<String>,
    pub policies: Vec<PartitionPolicy>,
}

impl PartitionConfig {
    pub fn new(strategy: PartitionStrategy, shards: Vec<String>) -> Self {
        Self {
            strategy,
            shards,
            key_column: None,
            policies: Vec::new(),
        }
    }

    pub fn validate(&self) -> Sqlite3Result<()> {
        if self.shards.is_empty() {
            return Err(Sqlite3Error::Query(
                "At least one shard is required".to_string(),
            ));
        }
        if (self.strategy == PartitionStrategy::Hash || self.strategy == PartitionStrategy::Range)
            && self.key_column.is_none()
        {
            return Err(Sqlite3Error::Query(
                "Key column is required for hash or range strategy".to_string(),
            ));
        }
        Ok(())
    }
}

pub struct PartitionManager {
    main_db: Arc<parking_lot::Mutex<Database>>,
    attached_dbs: Arc<Mutex<HashMap<String, Arc<parking_lot::Mutex<Database>>>>>,
    config: Arc<RwLock<PartitionConfig>>,
    round_robin_index: Arc<Mutex<usize>>,
    parse_cache: Arc<Mutex<LruCache<String, ParsedStatement>>>,
}

impl PartitionManager {
    pub fn new(
        main_db: Arc<parking_lot::Mutex<Database>>,
        config: PartitionConfig,
    ) -> Sqlite3Result<Self> {
        config.validate()?;
        let parse_cache = Arc::new(Mutex::new(LruCache::new(
            std::num::NonZeroUsize::new(1000).unwrap(),
        )));
        Ok(Self {
            main_db,
            attached_dbs: Arc::new(Mutex::new(HashMap::new())),
            config: Arc::new(RwLock::new(config)),
            round_robin_index: Arc::new(Mutex::new(0)),
            parse_cache,
        })
    }

    pub fn get_config(&self) -> Arc<RwLock<PartitionConfig>> {
        Arc::clone(&self.config)
    }

    pub fn initialize_shards(&self) -> Sqlite3Result<()> {
        let config = self.config.read();
        let mut attached = self.attached_dbs.lock();

        for (i, shard_path) in config.shards.iter().enumerate() {
            let alias = format!("shard_{}", i);
            self.main_db
                .lock()
                .attach_database_for_partition(&alias, shard_path)?;
            attached.insert(alias, Arc::clone(&self.main_db));
        }
        Ok(())
    }

    pub fn select_shard(&self, partition_key: &str) -> Sqlite3Result<String> {
        let config = self.config.read();
        let shard_index = match config.strategy {
            PartitionStrategy::Hash => {
                use std::collections::hash_map::DefaultHasher;
                use std::hash::{Hash, Hasher};
                let mut hasher = DefaultHasher::new();
                partition_key.hash(&mut hasher);
                (hasher.finish() as usize) % config.shards.len()
            }
            PartitionStrategy::Range => {
                if let Ok(num) = partition_key.parse::<i64>() {
                    (num.unsigned_abs() as usize) % config.shards.len()
                } else {
                    use std::collections::hash_map::DefaultHasher;
                    use std::hash::{Hash, Hasher};
                    let mut hasher = DefaultHasher::new();
                    partition_key.hash(&mut hasher);
                    (hasher.finish() as usize) % config.shards.len()
                }
            }
            PartitionStrategy::RoundRobin => {
                let mut index = self.round_robin_index.lock();
                let current = *index;
                *index = (*index + 1) % config.shards.len();
                current
            }
        };
        Ok(format!("shard_{}", shard_index))
    }

    pub fn get_shard(&self, alias: &str) -> Option<Arc<parking_lot::Mutex<Database>>> {
        self.attached_dbs.lock().get(alias).cloned()
    }

    fn modify_sql_for_shard(&self, sql: &str, alias: &str) -> String {
        let sql_upper = sql.to_uppercase();
        let mut result = sql.to_string();
        if let Some(pos) = sql_upper.find(" FROM ") {
            let rest = &sql[pos + 6..];
            let end = rest.find([' ', ',', ';', '\n', '\r']).unwrap_or(rest.len());
            let table = &rest[..end].trim();
            if !table.is_empty() && !table.contains('.') {
                result = format!("{} FROM {}.{}", &sql[..pos + 6], alias, &rest[end..]);
            }
        }
        // ... (Simpler version for insert/update can be added if needed)
        result
    }

    pub fn query_partitioned(&self, sql: &str) -> Sqlite3Result<QueryResult> {
        let parser = SqlParser::new();
        let sql_normalized = sql.trim().to_string();
        let parsed: ParsedStatement = {
            let mut cache = self.parse_cache.lock();
            if let Some(cached) = cache.get(&sql_normalized) {
                cached.clone()
            } else {
                let p = parser.parse_select(&sql_normalized)?;
                cache.put(sql_normalized.clone(), p.clone());
                p
            }
        };

        let key_column = self.config.read().key_column.clone();
        let target_shards: Vec<String> = if let Some(key_col) = &key_column {
            if let Some(where_c) = &parsed.where_clause {
                if where_c
                    .to_uppercase()
                    .contains(&format!("{} =", key_col).to_uppercase())
                {
                    match parser.extract_partition_key_value(&parsed, key_col) {
                        Ok(val) => vec![self.select_shard(&val)?],
                        Err(_) => self.get_attached_shard_names(),
                    }
                } else {
                    self.get_attached_shard_names()
                }
            } else {
                self.get_attached_shard_names()
            }
        } else {
            self.get_attached_shard_names()
        };

        let mut all_rows = Vec::new();
        let mut columns = Vec::new();
        let mut column_types = Vec::new();

        let attached_dbs = self.attached_dbs.lock();
        for alias in target_shards {
            if let Some(db) = attached_dbs.get(&alias) {
                let modified = self.modify_sql_for_shard(sql, &alias);
                let res = db.lock().query(&modified)?;
                if columns.is_empty() {
                    columns = res.columns;
                    column_types = res.column_types;
                }
                all_rows.extend(res.rows);
            }
        }

        Ok(QueryResult {
            columns,
            column_types,
            rows: all_rows,
        })
    }

    fn get_attached_shard_names(&self) -> Vec<String> {
        self.attached_dbs.lock().keys().cloned().collect()
    }

    pub fn execute_partitioned(&self, sql: &str) -> Sqlite3Result<usize> {
        let parser = SqlParser::new();
        let sql_upper = sql.trim().to_uppercase();
        let parsed = if sql_upper.starts_with("INSERT") {
            parser.parse_insert(sql)?
        } else if sql_upper.starts_with("UPDATE") {
            parser.parse_update(sql)?
        } else if sql_upper.starts_with("DELETE") {
            parser.parse_delete(sql)?
        } else {
            return Err(Sqlite3Error::Query(
                "Only INSERT/UPDATE/DELETE supported".into(),
            ));
        };

        let key_column = self
            .config
            .read()
            .key_column
            .clone()
            .ok_or_else(|| Sqlite3Error::Query("Key column not configured".into()))?;
        let val = parser.extract_partition_key_value(&parsed, &key_column)?;
        let alias = self.select_shard(&val)?;
        let shard = self
            .get_shard(&alias)
            .ok_or_else(|| Sqlite3Error::Query(format!("Shard {} not found", alias)))?;
        let modified = self.modify_sql_for_shard(sql, &alias);
        let n = shard.lock().execute(&modified)?;
        Ok(n)
    }

    pub fn create_partition_policy(&self, policy: PartitionPolicy) -> Sqlite3Result<()> {
        let mut config = self.config.write();
        if config
            .policies
            .iter()
            .any(|p| p.table_name == policy.table_name)
        {
            return Err(Sqlite3Error::Query(format!(
                "Policy for {} already exists",
                policy.table_name
            )));
        }
        config.policies.push(policy);
        Ok(())
    }

    pub fn verify_shard_key_indices(&self) -> Sqlite3Result<Vec<String>> {
        let config = self.config.read();
        let key_column = match &config.key_column {
            Some(c) => c,
            None => return Ok(vec![]),
        };
        let mut missing = Vec::new();
        let dbs = self.attached_dbs.lock();
        for (alias, db) in dbs.iter() {
            for policy in &config.policies {
                let check_sql = format!("PRAGMA {}.index_list({})", alias, policy.table_name);
                let res = db.lock().query(&check_sql)?;
                let mut found = false;
                for row in res.rows {
                    if let Some(serde_json::Value::String(idx_name)) = row.get(1) {
                        let info_sql = format!("PRAGMA {}.index_info('{}')", alias, idx_name);
                        let info_res = db.lock().query(&info_sql)?;
                        for info_row in info_res.rows {
                            if let Some(serde_json::Value::String(col)) = info_row.get(2) {
                                if col == key_column {
                                    found = true;
                                    break;
                                }
                            }
                        }
                    }
                    if found {
                        break;
                    }
                }
                if !found {
                    missing.push(format!("{}.{}", alias, policy.table_name));
                }
            }
        }
        Ok(missing)
    }

    pub fn ensure_shard_key_indices(&self) -> Sqlite3Result<()> {
        let config = self.config.read();
        let key_column = match &config.key_column {
            Some(c) => c,
            None => return Ok(()),
        };
        let dbs = self.attached_dbs.lock();
        for (alias, db) in dbs.iter() {
            for policy in &config.policies {
                let sql = format!(
                    "CREATE INDEX IF NOT EXISTS {}.idx_{}_{}_shardkey ON {}({})",
                    alias, policy.table_name, key_column, policy.table_name, key_column
                );
                db.lock().execute(&sql)?;
            }
        }
        Ok(())
    }

    pub fn delete_partition_policy(&self, table_name: &str) -> Sqlite3Result<()> {
        let mut config = self.config.write();
        let initial_len = config.policies.len();
        config.policies.retain(|p| p.table_name != table_name);
        if config.policies.len() == initial_len {
            return Err(Sqlite3Error::Query(format!(
                "Policy for {} not found",
                table_name
            )));
        }
        Ok(())
    }

    pub fn run_partition_maintenance(&self) -> Sqlite3Result<usize> {
        let config = self.config.read();
        let dbs = self.attached_dbs.lock();
        let mut total_rows_deleted = 0;

        for policy in &config.policies {
            let sql_template = format!(
                "DELETE FROM {{}} WHERE {} < date('now', '-{} {}')",
                policy.date_column, policy.retention, policy.interval
            );
            for (alias, db) in dbs.iter() {
                let sql = sql_template.replace("{{}}", &format!("{}.{}", alias, policy.table_name));
                if let Ok(affected) = db.lock().execute(&sql) {
                    total_rows_deleted += affected;
                }
            }
            if policy.auto_indexing {
                let _ = self.ensure_shard_key_indices();
            }
        }
        Ok(total_rows_deleted)
    }
}
