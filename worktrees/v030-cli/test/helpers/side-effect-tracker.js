/**
 * 副作用トラッカー
 * ファイルシステムの変更を検出して、予期しない副作用を防ぐ
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const glob = require('glob');

class SideEffectTracker {
  constructor() {
    this.fsSnapshot = null;
    this.watchedDirs = [];
  }
  
  /**
   * 監視対象ディレクトリを追加
   * @param {string[]} dirs - 監視するディレクトリのリスト
   */
  addWatchDirs(dirs) {
    this.watchedDirs = [...new Set([...this.watchedDirs, ...dirs])];
  }
  
  /**
   * 現在の状態をキャプチャ
   */
  captureState() {
    this.fsSnapshot = this.captureFileSystem();
  }
  
  /**
   * ファイルシステムの状態をキャプチャ
   * @returns {Map<string, Object>} ファイルパスと情報のマップ
   */
  captureFileSystem() {
    const state = new Map();
    
    // デフォルトの監視ディレクトリ
    const defaultDirs = [
      process.cwd(), // 現在の作業ディレクトリ
      path.join(os.homedir(), '.cctop'), // ~/.cctop
      os.tmpdir() // テンポラリディレクトリ（テスト用）
    ];
    
    const dirs = [...new Set([...defaultDirs, ...this.watchedDirs])];
    
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) return;
      
      try {
        // ディレクトリ自体も記録
        const dirStat = fs.statSync(dir);
        state.set(dir, {
          type: 'directory',
          mtime: dirStat.mtime.getTime(),
          exists: true
        });
        
        // glob でファイルを取得（隠しファイルも含む）
        const pattern = path.join(dir, '**/*');
        const files = glob.sync(pattern, { 
          dot: true,
          nosort: true,
          ignore: [
            '**/node_modules/**',
            '**/.git/**',
            '**/coverage/**',
            '**/*.log'
          ]
        });
        
        files.forEach(file => {
          try {
            const stat = fs.statSync(file);
            state.set(file, {
              type: stat.isDirectory() ? 'directory' : 'file',
              mtime: stat.mtime.getTime(),
              size: stat.size,
              exists: true
            });
          } catch (e) {
            // ファイルが削除された場合など
          }
        });
      } catch (e) {
        console.error(`Failed to scan directory ${dir}:`, e.message);
      }
    });
    
    return state;
  }
  
  /**
   * 変更を検出
   * @returns {Object} 作成・変更・削除されたファイルのリスト
   */
  detectChanges() {
    if (!this.fsSnapshot) {
      throw new Error('No snapshot captured. Call captureState() first.');
    }
    
    const current = this.captureFileSystem();
    const changes = {
      created: [],
      modified: [],
      deleted: []
    };
    
    // 新規作成・変更を検出
    for (const [filePath, currentInfo] of current) {
      const previousInfo = this.fsSnapshot.get(filePath);
      
      if (!previousInfo) {
        // 新規作成
        changes.created.push(filePath);
      } else if (currentInfo.mtime !== previousInfo.mtime) {
        // 変更
        changes.modified.push(filePath);
      }
    }
    
    // 削除を検出
    for (const [filePath, previousInfo] of this.fsSnapshot) {
      if (!current.has(filePath)) {
        changes.deleted.push(filePath);
      }
    }
    
    return changes;
  }
  
  /**
   * 特定のパターンに一致するファイルが作成されたかチェック
   * @param {string[]} patterns - チェックするファイルパターン
   * @returns {Object} パターンごとの作成されたファイルリスト
   */
  checkCreatedFiles(patterns) {
    const changes = this.detectChanges();
    const result = {};
    
    patterns.forEach(pattern => {
      result[pattern] = changes.created.filter(file => {
        // 完全一致または glob パターンマッチ
        return file === pattern || 
               path.basename(file) === pattern ||
               file.includes(pattern);
      });
    });
    
    return result;
  }
  
  /**
   * 予期しないファイルが作成されていないかチェック
   * @param {string[]} expectedPatterns - 作成が予期されるファイルパターン
   * @returns {string[]} 予期しないファイルのリスト
   */
  getUnexpectedFiles(expectedPatterns) {
    const changes = this.detectChanges();
    
    return changes.created.filter(file => {
      // 予期されるパターンに一致しないファイル
      return !expectedPatterns.some(pattern => {
        return file === pattern || 
               path.basename(file) === pattern ||
               file.includes(pattern) ||
               file.match(new RegExp(pattern.replace(/\*/g, '.*')));
      });
    });
  }
}

module.exports = SideEffectTracker;