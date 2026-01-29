#[cfg(test)]
mod tests {
    use crate::sqlite3x::partition::{PartitionManager, PartitionConfig, PartitionStrategy};
    use crate::sqlite3x::wrapper::Database;
    use std::sync::Arc;
    use parking_lot::Mutex;
    use std::fs;

    #[test]
    fn test_query_partitioned_performance() {
        // Setup temp directory
        let temp_dir = std::env::temp_dir().join("dbstudiox_test_partition");
        if temp_dir.exists() {
            fs::remove_dir_all(&temp_dir).unwrap();
        }
        fs::create_dir_all(&temp_dir).unwrap();

        let main_db_path = temp_dir.join("main.db");
        let main_db = Arc::new(Mutex::new(Database::open(main_db_path.to_str().unwrap()).unwrap()));

        let mut shards = Vec::new();
        for i in 0..10 {
            let shard_path = temp_dir.join(format!("shard_{}.db", i));
            shards.push(shard_path.to_str().unwrap().to_string());

            // Initialize shard DB with data
            let db = Database::open(shard_path.to_str().unwrap()).unwrap();
            db.execute("CREATE TABLE test_table (id INTEGER PRIMARY KEY, name TEXT)").unwrap();

            db.execute("BEGIN TRANSACTION").unwrap();
            for j in 0..1000 {
                db.execute(&format!("INSERT INTO test_table (id, name) VALUES ({}, 'name_{}_{}')", j + (i * 1000), i, j)).unwrap();
            }
            db.execute("COMMIT").unwrap();
        }

        let config = PartitionConfig::new(PartitionStrategy::RoundRobin, shards.clone());
        let manager = PartitionManager::new(main_db, config).unwrap();
        manager.initialize_shards().unwrap();

        let start = std::time::Instant::now();
        let res = manager.query_partitioned("SELECT * FROM test_table;").unwrap();
        let duration = start.elapsed();

        println!("Query partitioned took: {:?}", duration);
        assert_eq!(res.rows.len(), 10000);

        // Clean up
        fs::remove_dir_all(&temp_dir).unwrap();
    }
}
