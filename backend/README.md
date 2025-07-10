# Anne App Backend

IoT デバイスや APK アプリから同一ネットワーク内で画像をアップロードできるバックエンドサーバーです。Tauri アプリとデータを共有し、アップロードされた画像は自動で AI 分析されタイムラインに表示されます。

## 🚀 機能

- **同一ネットワーク内アクセス**: `0.0.0.0`バインディングでネットワーク内の任意の端末からアクセス可能
- **画像アップロード**: IoT デバイス/Tauri アプリからの画像受信
- **AI 分析**: アップロードされた画像の自動分析
- **Tauri 統合**: 既存の Tauri アプリと完全にデータ統合
- **RESTful API**: 標準的な HTTP API エンドポイント

## 📋 API エンドポイント

### 基本エンドポイント

### `GET /api/health`

サーバーのヘルスチェック

**レスポンス例:**

```json
{
  "status": "ok",
  "uptime": 123.456,
  "timestamp": "2025-06-16T07:55:33.043Z"
}
```

### `GET /api/info`

サーバーとネットワーク情報

**レスポンス例:**

```json
{
  "server": "Anne App Backend",
  "network": {
    "interfaces": [
      {
        "name": "en0",
        "address": "192.168.1.100"
      }
    ]
  },
  "endpoints": [
    "GET /api/health",
    "GET /api/info",
    "POST /api/upload",
    "GET /api/metadata",
    "GET /api/images/:filename"
  ]
}
```

### `POST /api/upload`

画像ファイルのアップロード

**リクエスト:**

- Content-Type: `multipart/form-data`
- Field: `image` (画像ファイル)
- 対応形式: JPG, PNG, GIF
- 最大サイズ: 10MB

**レスポンス例:**

```json
{
  "status": "success",
  "id": "img_1750060744126",
  "analysis": "画像分析結果: 2025/6/16 16:59:04に撮影された画像です。"
}
```

**エラーレスポンス例:**

```json
{
  "status": "error",
  "message": "画像ファイルが提供されていません"
}
```

### データ同期エンドポイント

### `GET /api/metadata`

全画像メタデータの取得（Tauri アプリとの同期用）

**レスポンス例:**

```json
{
  "images": [
    {
      "id": "img_1750060744126",
      "filename": "img_1750060744126.jpg",
      "original_name": "cat_photo.jpg",
      "timestamp": "2025-06-25T12:00:00.000Z",
      "analysis_result": "分析結果テキスト",
      "user_comments": []
    }
  ]
}
```

### `GET /api/metadata/since/:timestamp`

指定タイムスタンプ以降の新着画像取得

**レスポンス例:**

```json
{
  "status": "success",
  "since": "2025-06-25T12:00:00.000Z",
  "new_images": [...],
  "count": 3
}
```

### `GET /api/images/:filename`

画像ファイルの配信

**パラメータ:**

- `filename`: 画像ファイル名

**レスポンス:**

- Content-Type: `image/jpeg`, `image/png`, etc.
- 画像バイナリデータ

## 🛠️ セットアップ

### 依存関係のインストール

```bash
npm install
```

### 開発環境での起動

```bash
# 開発モード（ファイル監視あり）
npm run dev

# 直接実行（TypeScript）
npm run start
```

### 本番環境での起動

```bash
# ビルド
npm run build

# 本番実行
npm run start:prod
```

### 環境変数

```bash
# ポート番号（デフォルト: 3000）
PORT=3000

# バインドホスト（デフォルト: 0.0.0.0）
HOST=0.0.0.0
```

## 📱 使用例

### ヘルスチェック

```bash
curl http://192.168.1.100:3000/api/health
```

### ネットワーク情報取得

```bash
curl http://192.168.1.100:3000/api/info
```

### 画像アップロード

```bash
# ローカルファイルから
curl -X POST http://192.168.1.100:3000/api/upload \\
  -F "image=@photo.jpg"

# IoTデバイスから（例）
curl -X POST http://192.168.1.100:3000/api/upload \\
  -F "image=@sensor_capture.png"
```

### レスポンス確認

```bash
curl -X POST http://192.168.1.100:3000/api/upload \\
  -F "image=@test.jpg" | jq .
```

## 🎯 実用例

### IoT デバイス（Python）

```python
import requests

url = "http://192.168.1.100:3000/api/upload"
files = {"image": open("camera_shot.jpg", "rb")}

response = requests.post(url, files=files)
print(response.json())
```

### Tauri アプリ（モバイル/デスクトップ）

```typescript
// 標準 fetch API を使用（Tauri HTTPプラグインは未使用）
// 画像ファイルを選択（Tauriのダイアログ使用）
import { open } from "@tauri-apps/plugin-opener";

// プラットフォーム別のAPI URL取得
import { getApiUrl } from "../utils/api";

const apiUrl = getApiUrl(); // 環境に応じて自動切り替え

// ファイル選択とアップロード
const formData = new FormData();
formData.append("image", imageFile);

const response = await fetch(`${apiUrl}/api/upload`, {
  method: "POST",
  body: formData
});

const result = await response.json();
console.log(result);
```

### Node.js/JavaScript

```javascript
const formData = new FormData();
formData.append("image", imageFile);

const response = await fetch("http://192.168.1.100:3000/api/upload", {
  method: "POST",
  body: formData
});

const result = await response.json();
console.log(result);
```

## 🔧 開発情報

### ディレクトリ構造

```
backend/
├── index.ts          # メインサーバーファイル
├── types.ts          # TypeScript型定義
├── utils.ts          # ユーティリティ関数
├── package.json      # 依存関係
└── README.md         # このファイル
```

### 型定義

主要な型は `types.ts` で定義されています：

- `UploadRequest` / `UploadResponse`
- `HealthResponse` / `InfoResponse`
- `ImageMetadata` / `ImagesData`

### データ統合

アップロードされた画像は以下の場所に保存されます：

- **画像ファイル**: `~/Library/Application Support/anne-app/images/`
- **メタデータ**: `~/Library/Application Support/anne-app/metadata.json`

これにより Tauri アプリと完全にデータを共有できます。

## 🚨 トラブルシューティング

### サーバーが起動しない

```bash
# ポートが使用中の場合
lsof -ti:3000
kill -9 [PID]

# 別のポートで起動
PORT=3001 bun run index.ts
```

### ネットワークアクセスできない

```bash
# ファイアウォール確認（macOS）
sudo pfctl -sr | grep 3000

# IPアドレス確認
ifconfig | grep "inet "
```

### 画像アップロードが失敗する

- ファイルサイズが 10MB 以下か確認
- 画像形式が JPG/PNG/GIF か確認
- `Content-Type: multipart/form-data`が設定されているか確認

## 📈 拡張方法

### AI 分析エンジンの変更

`utils.ts`の`analyzeImage`関数を編集して Mastra や他の AI サービスと連携可能です。

### 認証の追加

必要に応じて`index.ts`にトークン認証や Basic 認証を追加できます。

### ログ機能の強化

現在のコンソールログをファイルログやデータベースログに変更可能です。

---

## 🔗 関連プロジェクト

- **Tauri アプリ**: `../app/` - デスクトップ画像分析アプリ
- **プロジェクト全体**: `../` - Anne App モノレポ

Built with [Node.js](https://nodejs.org) and [TypeScript](https://typescriptlang.org) 🚀
