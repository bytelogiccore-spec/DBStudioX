// 샤드 메타데이터 영속성 모듈
// 파티셔닝 설정을 JSON 파일로 저장/로드합니다.

use serde::{Deserialize, Serialize};
use crate::sqlite3x::errors::{Sqlite3xError as Sqlite3Error, Sqlite3xResult as Sqlite3Result};
use super::PartitionConfig;

/// 파티션 메타데이터
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PartitionMetadata {
    /// 메타데이터 버전 (호환성 관리)
    pub version: u32,
    /// 파티셔닝 설정
    pub config: PartitionConfig,
    /// 생성 시간 (Unix timestamp)
    pub created_at: u64,
    /// 수정 시간 (Unix timestamp)
    pub updated_at: u64,
}

impl PartitionMetadata {
    /// 새로운 메타데이터 생성
    pub fn new(config: PartitionConfig) -> Self {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or(std::time::Duration::from_secs(0))
            .as_secs();

        Self {
            version: 1,
            config,
            created_at: now,
            updated_at: now,
        }
    }

    /// 메타데이터 저장
    pub fn save(&self, path: &str) -> Sqlite3Result<()> {
        let json = serde_json::to_string_pretty(self)
            .map_err(|e| Sqlite3Error::Query(
                format!("Failed to serialize metadata: {}", e)
            ))?;

        std::fs::write(path, json)
            .map_err(|e| Sqlite3Error::Io(e))?;

        Ok(())
    }

    /// 메타데이터 로드
    pub fn load(path: &str) -> Sqlite3Result<Self> {
        let content = std::fs::read_to_string(path)
            .map_err(|e| Sqlite3Error::Io(e))?;

        let metadata: Self = serde_json::from_str(&content)
            .map_err(|e| Sqlite3Error::Query(
                format!("Failed to parse metadata: {}", e)
            ))?;

        if metadata.version > 1 {
            return Err(Sqlite3Error::Query(
                format!("Unsupported metadata version: {}", metadata.version)
            ));
        }

        Ok(metadata)
    }

    /// 메타데이터 파일 경로 자동 생성
    pub fn get_default_path(main_db_path: &str) -> String {
        format!("{}.partition_metadata.json", main_db_path)
    }
}
