# Shifuto — アルバイトシフト自動生成アプリ

アルバイトのシフト希望収集・自動生成・確定表示・人員不足管理を一体化した Web アプリです。

- **スタッフ**: カレンダーから希望時間枠を提出 → 確定シフトを確認 → 欠員が出た際に緊急出勤登録
- **管理者**: 提出状況の確認 → スキル・人数制約を考慮したシフト自動生成 → 手動調整・PNG 出力

## 技術スタック

| 区分 | 技術 |
|------|------|
| フレームワーク | Next.js（App Router） |
| UI | React / Tailwind CSS |
| 言語 | TypeScript |
| DB / Auth | Supabase（PostgreSQL + Row Level Security） |
| ホスティング | Vercel（推奨） |

## セットアップ

### 1. リポジトリをクローン

```bash
git clone https://github.com/krsn109/shifuto.git
cd shifuto
npm install
```

### 2. Supabase プロジェクトを作成

1. [Supabase](https://supabase.com) でアカウントを作成し、新しいプロジェクトを作成します
2. `supabase/schema.sql` の内容を **SQL Editor** で実行してテーブルを作成します
3. `supabase/seed.sql` の内容を実行してスキル・時間枠の初期データを投入します
4. 必要に応じて `supabase/migrations/` 内のファイルも順番に実行します

### 3. 環境変数を設定

`.env.local.example` をコピーして `.env.local` を作成し、Supabase の値を入力します。

```bash
cp .env.local.example .env.local
```

| 変数名 | 取得場所 |
|--------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard > Project Settings > API > Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard > Project Settings > API > anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard > Project Settings > API > service_role key |

### 4. 管理者ユーザーを作成

Supabase Dashboard の **Authentication > Users** から最初のユーザーを手動で作成し、`profiles` テーブルの `role` カラムを `admin` に更新します。

```sql
UPDATE profiles SET role = 'admin' WHERE id = 'your-user-id';
```

### 5. 開発サーバーを起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) にアクセスして動作確認します。

## Vercel へのデプロイ

1. [Vercel](https://vercel.com) にリポジトリを接続します
2. Environment Variables に上記 3 つの環境変数を設定します
3. デプロイします

## 主な機能

- **シフト希望提出** — 半月サイクルで提出期間を自動管理
- **シフト自動生成** — スキル制約・連続勤務制約・日別必要人数を考慮した最適化
- **人員不足管理** — 不足日・候補者の可視化、スタッフによる緊急出勤登録
- **スタッフ管理** — 登録・削除・スキル設定
- **シフト表 PNG 出力** — 生成結果を画像として保存

## 開発について

本リポジトリは、別アカウントで開発していたプロジェクトをポートフォリオ公開用にアカウント移行したものです。そのため、コミット履歴は移行時の1件のみとなっています。

- 開発期間：2024年11月〜2025年1月（約3ヶ月）
- 開発背景：アルバイト勤務先での紙ベースのシフト提出・経験則頼りのシフト作成・欠勤時の対応困難という課題を解決するために個人開発

## ライセンス

MIT
