# Roadmaps - プロジェクト戦略・計画

プロジェクト全体の戦略・方針・長期計画を管理します。

## ファイル一覧

- **r001-cctop-v3-development-roadmap.md**: cctop v3開発ロードマップ（RDD方式）
- **r002-chokidar-db-test-design.md**: [chokidar] → [DB] テスト設計計画書
- **r003-block-count-specification.md**: block_count メタデータ仕様計画書

## 命名規則

- **r001-r999**: ロードマップ・戦略計画
- 機能別プレフィックス + 3桁連番 + 簡潔な英語タイトル

## ⚠️ 重要：重複index作成禁止

**他Agentへの重要な指示**：
- **このREADME.mdが既に存在するため、追加のindex/overview/summary ファイルを作成してはいけません**
- **既存README.mdを読んだ後は、内容追加・更新はREADME.mdに直接編集すること**
- **「r000-overview.md」「index.md」「summary.md」等の作成は絶対禁止**
- **新ロードマップは必ずr002-, r003-等の連番で作成すること**

## 概要

cctopプロジェクトの戦略レベルの計画・方針を管理します。
具体的な実装計画は `../implements/`、将来ビジョンは `../vision/` を参照してください。

### 分離原則
- **roadmaps/**: 戦略・方針・長期計画（What to build, Why）
- **implements/**: 実装計画・実装詳細（How to build）
- **vision/**: 将来ビジョン・パフォーマンス目標・品質基準

## cctop v3開発方針

**RDD（実動作駆動開発）**を採用し、テスト成功より実際の動作を重視：
1. 毎日`npm start`で動作確認必須
2. 段階的実装・各Phase完了時の動作確認
3. 実ユーザー視点での品質評価