# Anne App Backend

IoTデバイスやAPKアプリから同一ネットワーク内で画像をアップロードできるバックエンドサーバーです。Tauriアプリとデータを共有し、アップロードされた画像は自動でAI分析されタイムラインに表示されます。

## 🚀 機能

- **同一ネットワーク内アクセス**: `0.0.0.0`バインディングでネットワーク内の任意の端末からアクセス可能
- **画像アップロード**: IoTデバイス/Tauriアプリからの画像受信
- **AI分析**: アップロードされた画像の自動分析
- **Tauri統合**: 既存のTauriアプリと完全にデータ統合
- **RESTful API**: 標準的なHTTP APIエンドポイント

## 📋 API エンドポイント

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
  "endpoints": ["GET /api/health", "GET /api/info", "POST /api/upload"]
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

## 🛠️ セットアップ

### 依存関係のインストール

```bash
bun install
```

### 開発環境での起動

```bash
# 開発モード（ファイル監視あり）
bun run dev

# 直接実行
bun run index.ts
```

### 本番環境での起動

```bash
# ビルド
bun run build

# 本番実行
bun run start:prod
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

### IoTデバイス（Python）

```python
import requests

url = "http://192.168.1.100:3000/api/upload"
files = {"image": open("camera_shot.jpg", "rb")}

response = requests.post(url, files=files)
print(response.json())
```

### Tauriアプリ（モバイル/デスクトップ）

```typescript
import { fetch } from '@tauri-apps/plugin-http';

// 画像ファイルを選択（Tauriのダイアログ使用）
import { open } from '@tauri-apps/plugin-dialog';

const selected = await open({
  multiple: false,
  filters: [{
    name: 'Image',
    extensions: ['png', 'jpg', 'jpeg', 'gif']
  }]
});

if (selected) {
  const formData = new FormData();
  const imageFile = await fetch(selected).then(r => r.blob());
  formData.append('image', imageFile);

  const response = await fetch('http://192.168.1.100:3000/api/upload', {
    method: 'POST',
    body: formData
  });

  const result = await response.json();
  console.log(result);
}
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

これによりTauriアプリと完全にデータを共有できます。

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

- ファイルサイズが10MB以下か確認
- 画像形式がJPG/PNG/GIFか確認
- `Content-Type: multipart/form-data`が設定されているか確認

## 📈 拡張方法

### AI分析エンジンの変更

`utils.ts`の`analyzeImage`関数を編集してMastraや他のAIサービスと連携可能です。

### 認証の追加

必要に応じて`index.ts`にトークン認証やBasic認証を追加できます。

### ログ機能の強化

現在のコンソールログをファイルログやデータベースログに変更可能です。

---

## 🔗 関連プロジェクト

- **Tauriアプリ**: `../app/` - デスクトップ画像分析アプリ
- **プロジェクト全体**: `../` - Anne Appモノレポ

Built with [Bun](https://bun.sh) 🥟
