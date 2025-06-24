# Implementation Specifications

実装戦略・統合計画関連の仕様書を管理します。

## ファイル一覧

- **imp002-feature-priority.md**: 機能優先度・実装計画
- **imp006-phase1-detailed.md**: Phase1詳細実装計画
- **imp007-phase2-data-separation.md**: Phase2データ分離計画
- **imp008-integration-planning.md**: 統合計画・アーキテクチャ
- **imp009-project-roadmap.md**: プロジェクト実装ロードマップ
- **imp010-phase1-basic-monitoring.md**: Phase1基本監視機能

## 命名規則

- **imp001-imp999**: 実装戦略関連仕様書
- 機能別プレフィックス + 3桁連番 + 簡潔な英語タイトル

## 概要

cctopプロジェクトの実装戦略・段階的開発計画を技術仕様として管理し、効率的で確実な実装の指針を提供します。

### 実装戦略管理ポリシー

- **imp002**: 全体的な機能優先度・実装順序
- **imp006-imp010**: 各フェーズの詳細実装計画・統合戦略

## ⚠️ 重要：重複index作成禁止

**他Agentへの重要な指示**：
- **このREADME.mdが既に存在するため、追加のindex/overview/summary ファイルを作成してはいけません**
- **既存README.mdを読んだ後は、内容追加・更新はREADME.mdに直接編集すること**
- **「imp000-overview.md」「index.md」「summary.md」等の作成は絶対禁止**
- **新仕様書は必ずimp011-, imp012-等の連番で作成すること**

### 正しい作業手順
1. README.md読了後、新規仕様書作成の場合は次の連番を使用
2. ディレクトリ概要更新の場合は、このREADME.mdを直接編集
3. 概要・索引的内容の重複作成は一切禁止