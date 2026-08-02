# L'Mere Studio - マルチテナント ケーキ注文シミュレーター & CMS

[![バージョン](https://img.shields.io/badge/%E3%83%90%E3%83%BC%E3%82%B8%E3%83%A7%E3%83%B3-1.2.0-purple.svg)](CHANGELOG.md)
[![Next.js](https://img.shields.io/badge/Next.js-16.2.12-black.svg)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7.3.0-darkblue.svg)](https://www.prisma.io/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.0-38bdf8.svg)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)

[English](README.md) | [Português](README.pt-BR.md) | [日本語](README.ja.md) | [Español](README.es.md)

L'Mere Studioは、洋菓子店やオーダーメイドケーキデザイナー向けに開発されたホワイトレーベル型マルチテナントWebアプリケーションです。顧客向けの直感的な5ステップ注文シミュレーターと、店舗オーナー向けのセルフサービスCMS管理画面を提供します。

---

## デモンストレーション

### 顧客向け注文シミュレーター (モバイル版)
<video src="./assets/lmere-studio-mobile-demo.mp4" controls="controls" muted="muted" width="100%"></video>

### 店舗向けCMS管理画面 (デスクトップ版)
<video src="./assets/lmere-studio-desktop-demo.mp4" controls="controls" muted="muted" width="100%"></video>

## スクリーンショット

<details>
<summary>ギャラリーを見る（クリックで展開）</summary>
<br>

**顧客フロー (モバイル)**
| カレンダー & 店舗 | サイズ & 人数 | カスタマイズ詳細 |
| :---: | :---: | :---: |
| <img src="assets/01-mobile-storefront.png" width="250"> | <img src="assets/03-mobile-size-selected.png" width="250"> | <img src="assets/04-mobile-flavors-selected.png" width="250"> |

**管理画面 (デスクトップ)**
| 注文カンバン | メニュー管理 | ブランドカラー設定 |
| :---: | :---: | :---: |
| <img src="assets/08-desktop-admin-orders-kanban.png" width="250"> | <img src="assets/09-desktop-admin-menu.png" width="250"> | <img src="assets/11-desktop-admin-branding.png" width="250"> |

</details>

---

## 主な機能

### 顧客向け注文シミュレーター (`/[slug]`)
- **ステップ 1: イベントカレンダー**: 定休日・予約不可日の自動検証機能を備えたインタラクティブな日付選択。
- **ステップ 2: サイズ & 人数選択**: 人数に応じた最適サイズ（ミニ、S、M、L）と基本料金の自動計算。
- **ステップ 3: スポンジ・フィリング・トッピング**: スポンジ生地、クリーム・フィリング、特別料金トッピングの自由な組み合わせ。
- **ステップ 4: カスタマイズ詳細**: メッセージプレート入力、特別リクエスト、参考画像のURLアップロード。
- **ステップ 5: 注文確認 & 決済受付**: リアルタイムの見積もり計算、内金計算（50% / 100% / 見積りのみ）、PIXキーコピー機能、WhatsApp連携メッセージ生成。

### 店舗向けCMS管理画面 (`/admin`)
- **注文管理**: カンバン形式でのステータス管理（保留中、確認済み、完了、キャンセル）。
- **メニュー管理**: ケーキサイズ、生地、クリーム、追加オプションのCRUD操作。
- **スケジュール管理**: カレンダーの日付ブロック/解除設定。
- **ブランド & デザインカスタマイズ**: ロゴ、バナー、プライマリ・セカンダリカラー、背景テーマのリアルタイム設定。
- **機能設定 (Feature Flags)**: 画像アップロード、配送オプション、内金モードの切り替え。

---

## システム構成図

```mermaid
flowchart TD
    Customer(["顧客"])
    Owner(["店舗管理者"])

    subgraph Frontend["フロントエンド層 (Next.js 16 App Router)"]
        direction TD
        Simulator["注文シミュレーター"]
        CMS["CMS管理画面"]
        
        S1["1. カレンダー"]
        S2["2. サイズ・分量"]
        S3["3. 味・トッピング"]
        S4["4. 詳細設定"]
        S5["5. 確認 & WhatsApp"]

        M1["注文カンバン"]
        M2["メニュー管理"]
        M3["スケジュール管理"]
        M4["ブランド・カラー設定"]
        M5["機能フラグ"]

        Simulator --> S1
        Simulator --> S2
        Simulator --> S3
        Simulator --> S4
        Simulator --> S5

        CMS --> M1
        CMS --> M2
        CMS --> M3
        CMS --> M4
        CMS --> M5
    end

    subgraph Backend["バックエンド & データ層"]
        direction TD
        APIPub["公開APIルート"]
        APIAdm["管理APIルート"]
        ORM["Prisma 7 ORM"]
        DB[("SQLite データベース")]

        APIPub ~~~ APIAdm
        APIPub --> ORM
        APIAdm --> ORM
        ORM --> DB
    end

    Customer -->|"アクセス /[slug]"| Simulator
    Owner -->|"アクセス /admin"| CMS

    Simulator --> APIPub
    CMS --> APIAdm

    classDef actor fill:#1e293b,stroke:#475569,color:#ffffff;
    classDef fe fill:#4f46e5,stroke:#3730a3,color:#ffffff;
    classDef be fill:#0f766e,stroke:#115e59,color:#ffffff;
    classDef db fill:#0369a1,stroke:#075985,color:#ffffff;

    class Customer,Owner actor;
    class Simulator,CMS,S1,S2,S3,S4,S5,M1,M2,M3,M4,M5 fe;
    class APIPub,APIAdm,ORM be;
    class DB db;
```

---

## 技術スタック

| 領域 | 技術 |
| --- | --- |
| フレームワーク | Next.js 16 (App Router, Turbopack) |
| UI & スタイル | React 19, Tailwind CSS v4, グラスモフィズムデザイン |
| アイコン | Lucide React (絵文字完全非使用) |
| データベース | Prisma 7 ORM (`@prisma/adapter-better-sqlite3`) |
| セキュリティ | Bcrypt パスワードハッシュ化 |
| 言語 | TypeScript 5 (Strict Mode) |

---

## セットアップ手順

### 前提条件
- Node.js 20.x 以上
- npm 10.x 以上

### インストール

1. リポジトリのクローン:
   ```bash
   git clone https://github.com/user/lmere-studio.git
   cd lmere-studio
   ```

2. 依存関係のインストール:
   ```bash
   npm install
   ```

3. 環境変数の設定:
   ```bash
   cp .env.example .env
   ```

4. データベースのセットアップとシードデータの投入:
   ```bash
   npx prisma db push --config=prisma.config.ts
   npm run db:seed
   ```

5. 開発サーバーの起動:
   ```bash
   npm run dev
   ```

6. ブラウザでアクセス:
   - **注文シミュレーター**: `http://localhost:3000/doce-arte`
   - **管理画面**: `http://localhost:3000/admin` (ログイン情報: 店舗ID: `doce-arte`, パスワード: `admin123`)

---

## ライセンス

本ソフトウェアは**商用・商標権所有ライセンス (All Rights Reserved)** の下で提供されています。無断での商用利用、再配布、SaaS形式での提供、およびコードの複製は禁止されています。詳細は [LICENSE](LICENSE) を参照してください。
