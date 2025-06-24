/**
 * Database Validation Script
 * Database Schema Validationによる実DB検証
 */

const { ExpectedTablesSchema, EventRecordSchema, ObjectStatisticsSchema } = require('./test/schema/database-schema.js');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const os = require('os');

const dbPath = path.join(os.homedir(), '.cctop', 'activity.db');

console.log('🔍 Database Schema Validation実行中...');
console.log('📍 DB Path:', dbPath);
console.log();

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('❌ DB接続エラー:', err.message);
    return;
  }
  
  console.log('✅ DB接続成功');
  
  // 1. テーブル構造検証
  console.log('\n=== 🔍 テーブル構造検証 ===');
  
  const tables = ['event_types', 'object_fingerprint', 'events', 'object_statistics'];
  let completedChecks = 0;
  
  tables.forEach(tableName => {
    db.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
      if (err) {
        console.error(`❌ ${tableName} 構造取得エラー:`, err.message);
      } else {
        const columns = rows.map(row => row.name);
        console.log(`📋 ${tableName}:`, columns);
        
        // Schema Validation実行
        try {
          const validation = {};
          validation[tableName] = columns;
          ExpectedTablesSchema.parse(validation);
          console.log(`✅ ${tableName} schema: PASS`);
        } catch (error) {
          console.log(`❌ ${tableName} schema: FAIL`);
          if (error.errors) {
            error.errors.forEach(err => {
              console.log(`   - ${err.message}`);
            });
          }
        }
      }
      
      completedChecks++;
      if (completedChecks === tables.length) {
        validateData();
      }
    });
  });
});

function validateData() {
  console.log('\n=== 🔍 データ整合性検証 ===');
  
  // 2. 最新events検証
  db.all(`SELECT * FROM events ORDER BY id DESC LIMIT 5`, (err, rows) => {
    if (err) {
      console.error('❌ Events取得エラー:', err.message);
    } else {
      console.log(`📊 最新events数: ${rows.length}`);
      
      rows.forEach((row, i) => {
        try {
          EventRecordSchema.parse(row);
          console.log(`✅ Event ${row.id}: schema PASS`);
        } catch (error) {
          console.log(`❌ Event ${row.id}: schema FAIL`);
          if (error.errors) {
            error.errors.forEach(err => {
              console.log(`   - ${err.path.join('.')}: ${err.message}`);
            });
          }
        }
      });
    }
    
    // 3. object_statistics検証
    validateObjectStatistics();
  });
}

function validateObjectStatistics() {
  db.all(`SELECT * FROM object_statistics LIMIT 3`, (err, rows) => {
    if (err) {
      console.error('❌ ObjectStatistics取得エラー:', err.message);
    } else {
      console.log(`\n📊 ObjectStatistics数: ${rows.length}`);
      
      rows.forEach((row, i) => {
        try {
          ObjectStatisticsSchema.parse(row);
          console.log(`✅ ObjectStat ${row.object_id}: schema PASS`);
        } catch (error) {
          console.log(`❌ ObjectStat ${row.object_id}: schema FAIL`);
          if (error.errors) {
            error.errors.forEach(err => {
              console.log(`   - ${err.path.join('.')}: ${err.message}`);
            });
          }
        }
      });
    }
    
    // 4. データ量統計
    getDataStats();
  });
}

function getDataStats() {
  console.log('\n=== 📈 データ量統計 ===');
  
  const queries = [
    'SELECT COUNT(*) as count FROM events',
    'SELECT COUNT(*) as count FROM object_statistics', 
    'SELECT COUNT(*) as count FROM event_types',
    'SELECT COUNT(*) as count FROM object_fingerprint'
  ];
  
  const tableNames = ['events', 'object_statistics', 'event_types', 'object_fingerprint'];
  
  queries.forEach((query, i) => {
    db.get(query, (err, row) => {
      if (err) {
        console.error(`❌ ${tableNames[i]} COUNT エラー:`, err.message);
      } else {
        console.log(`📊 ${tableNames[i]}: ${row.count} レコード`);
      }
      
      if (i === queries.length - 1) {
        db.close();
        console.log('\n🏁 Database検証完了');
      }
    });
  });
}