/**
 * データベーステスト用シナリオデータ
 * 仕様書（PLAN-20250624-001）のdb001準拠
 */

const fs = require('fs');
const path = require('path');

/**
 * データベーステストシナリオ
 */
const databaseScenarios = [
  {
    name: 'basic file operations',
    description: '基本的なファイル操作のDB記録',
    setup: async (testDir) => {
      // テスト用ファイルを作成
      const files = [
        {
          path: path.join(testDir, 'test-file-1.txt'),
          content: 'Hello World\n',
          expectedStats: {
            size: 12,
            line_count: 1,
            // inode, blocks は実行時に取得
          }
        },
        {
          path: path.join(testDir, 'test-file-2.js'),
          content: 'const x = 1;\nconst y = 2;\nconsole.log(x + y);\n',
          expectedStats: {
            size: 47,
            line_count: 3
          }
        },
        {
          path: path.join(testDir, 'subdir', 'test-file-3.md'),
          content: '# Test\n\nThis is a test file.\n',
          expectedStats: {
            size: 29,
            line_count: 3
          }
        }
      ];
      
      // サブディレクトリ作成
      fs.mkdirSync(path.join(testDir, 'subdir'), { recursive: true });
      
      // ファイル作成と実際のstats取得
      const createdFiles = [];
      for (const file of files) {
        fs.writeFileSync(file.path, file.content);
        const stats = fs.statSync(file.path);
        createdFiles.push({
          ...file,
          actualStats: {
            size: stats.size,
            inode: stats.ino,
            blocks: stats.blocks || 0,
            mtime: stats.mtime
          }
        });
      }
      
      return { files: createdFiles };
    },
    
    operations: [
      {
        type: 'insertEvent',
        description: 'create event',
        getData: (context) => ({
          event_type: 'create',
          file_path: context.files[0].path,
          file_name: path.basename(context.files[0].path),
          directory: path.dirname(context.files[0].path),
          file_size: context.files[0].actualStats.size,
          line_count: context.files[0].expectedStats.line_count,
          block_count: context.files[0].actualStats.blocks,
          inode: context.files[0].actualStats.inode
        }),
        validate: (result, data) => {
          expect(result.lastID).toBeGreaterThan(0);
          expect(result.changes).toBe(1);
        }
      },
      
      {
        type: 'insertEvent',
        description: 'modify event',
        getData: (context) => ({
          event_type: 'modify',
          file_path: context.files[0].path,
          file_name: path.basename(context.files[0].path),
          directory: path.dirname(context.files[0].path),
          file_size: context.files[0].actualStats.size + 10, // 変更後のサイズ
          line_count: context.files[0].expectedStats.line_count + 1,
          block_count: context.files[0].actualStats.blocks,
          inode: context.files[0].actualStats.inode
        }),
        validate: (result, data) => {
          expect(result.lastID).toBeGreaterThan(0);
        }
      },
      
      {
        type: 'query',
        description: 'get events for file',
        getData: (context) => ({
          file_path: context.files[0].path
        }),
        validate: (results, context) => {
          expect(results).toHaveLength(2); // create と modify
          expect(results[0].event_type).toBe('create');
          expect(results[1].event_type).toBe('modify');
          // 実際の値を検証（ハードコードではない）
          expect(results[0].inode).toBe(context.files[0].actualStats.inode);
        }
      }
    ]
  },
  
  {
    name: 'event type management',
    description: 'イベントタイプの管理（仕様書107-114行目）',
    setup: async () => {
      // イベントタイプは初期化時に設定される想定
      return {};
    },
    operations: [
      {
        type: 'query',
        description: 'verify event types exist',
        getData: () => ({
          table: 'event_types'
        }),
        validate: (results) => {
          const eventCodes = results.map(r => r.code);
          // 仕様書で定義されているイベントタイプ
          expect(eventCodes).toContain('create');
          expect(eventCodes).toContain('modify');
          expect(eventCodes).toContain('delete');
          expect(eventCodes).toContain('find'); // 初期スキャン用
          // move は将来実装予定
        }
      }
    ]
  },
  
  {
    name: 'metadata integrity',
    description: 'メタデータの完全性確認（仕様書122-138行目）',
    setup: async (testDir) => {
      const testFile = path.join(testDir, 'metadata-test.txt');
      const content = 'Line 1\nLine 2\nLine 3\n';
      fs.writeFileSync(testFile, content);
      const stats = fs.statSync(testFile);
      
      return {
        file: {
          path: testFile,
          stats: stats,
          content: content,
          lineCount: 3
        }
      };
    },
    operations: [
      {
        type: 'insertEvent',
        description: 'event with complete metadata',
        getData: (context) => ({
          event_type: 'create',
          file_path: context.file.path,
          file_name: path.basename(context.file.path),
          directory: path.dirname(context.file.path),
          // 仕様書で必須の6項目
          file_size: context.file.stats.size,
          line_count: context.file.lineCount,
          block_count: context.file.stats.blocks || 0,
          timestamp: Date.now(),
          inode: context.file.stats.ino
        }),
        validate: (result, data, context) => {
          expect(result.lastID).toBeGreaterThan(0);
        }
      },
      
      {
        type: 'query',
        description: 'verify all metadata stored',
        getData: (context) => ({
          id: context.lastInsertId
        }),
        validate: (result, context) => {
          // 6項目すべてが正しく保存されているか
          expect(result.file_size).toBe(context.file.stats.size);
          expect(result.line_count).toBe(context.file.lineCount);
          expect(result.block_count).toBeDefined();
          expect(result.timestamp).toBeDefined();
          expect(result.object_id).toBeDefined(); // inode経由でobject_idが設定
          expect(result.file_path).toBe(context.file.path);
        }
      }
    ]
  },
  
  {
    name: 'object fingerprint tracking',
    description: 'オブジェクトフィンガープリント管理（仕様書116-120行目）',
    setup: async (testDir) => {
      const file1 = path.join(testDir, 'same-inode-1.txt');
      const file2 = path.join(testDir, 'different-inode.txt');
      
      fs.writeFileSync(file1, 'content');
      fs.writeFileSync(file2, 'content');
      
      const stats1 = fs.statSync(file1);
      const stats2 = fs.statSync(file2);
      
      return {
        sameInodeFile: { path: file1, inode: stats1.ino },
        differentInodeFile: { path: file2, inode: stats2.ino }
      };
    },
    operations: [
      {
        type: 'insertFingerprint',
        description: 'track object by inode',
        getData: (context) => ({
          inode: context.sameInodeFile.inode
        }),
        validate: (result) => {
          expect(result.id).toBeGreaterThan(0);
        }
      },
      
      {
        type: 'insertFingerprint',
        description: 'same inode returns same object_id',
        getData: (context) => ({
          inode: context.sameInodeFile.inode
        }),
        validate: (result, data, context) => {
          // 同じinodeは同じobject_idを返す
          expect(result.id).toBe(context.firstObjectId);
        }
      }
    ]
  }
];

module.exports = {
  databaseScenarios
};