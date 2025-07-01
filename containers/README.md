# Container Configurations Repository

**作成日**: 2025年6月30日  
**目的**: cctopプロジェクトのコンテナ設定管理  

## 📋 概要

このリポジトリは、cctopプロジェクトの開発・本番環境で使用するコンテナ設定を管理します。

## 🎯 管理対象

- Dockerfile
- docker-compose.yml
- コンテナ関連の設定ファイル
- 環境別の設定

## ⚠️ 注意事項

- このディレクトリは親git（06-cctop）から独立
- セキュリティに注意（シークレットは含めない）
- 環境変数は.env.exampleで管理
