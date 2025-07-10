# CLAUDE.md

このファイルは、Claude Code (claude.ai/code) がこのリポジトリで作業する際のガイダンスを提供します。

## プロジェクト構成

3つの主要コンポーネントから構成されるnpm workspacesモノレポです：

1. **Tauriデスクトップアプリ** (`app/`) - React + TypeScriptフロントエンド + Rustバックエンド、AI機能にMastraを使用予定
2. **Expressバックエンド** (`backend/`) - 独立したTypeScript/Express APIサーバー
3. **共有設定** - Biomeによるリント・フォーマット、共有TypeScript設定、ルートレベルワークスペーススクリプト

### Tauriアプリ構造 (`app/`)

- **フロントエンド**: `app/src/` 内のReactコンポーネント（TypeScript使用）
- **バックエンド**: `app/src-tauri/src/` 内のRustコード、Tauriコマンドを公開
- **設定**: `tauri.conf.json` でアプリ設定、ウィンドウプロパティ、ビルド設定を定義
- **開発サーバー**: Vite開発サーバーはポート1420で動作（vite.config.tsで設定）

### Expressバックエンド (`backend/`)

- ポート3000で動作する独立したExpressサーバー（Socket.IO WebSocketサーバー含む）
- Node.jsをランタイム、npmをパッケージマネージャーとして使用
- TauriアプリのRustバックエンドとは独立
- 画像アップロード・配信APIとWebSocketリアルタイム同期機能を提供

## 開発コマンド

### ワークスペースレベルコマンド（推奨）

モノレポ全体で作業する際は、ルートディレクトリから以下を実行：

```bash
# インストール
npm install                   # ワークスペース全体の依存関係をインストール

# 開発（統合環境）
npm run dev                   # Web + Android + バックエンドを並行起動
npm run dev:app               # デスクトップアプリのみ起動
npm run dev:app:web           # Web版のみ起動
npm run dev:app:android       # Android開発のみ起動
npm run dev:backend           # Expressバックエンドのみ起動

# ビルド
npm run build                 # アプリとバックエンド両方をビルド
npm run build:app             # Tauriアプリのみビルド
npm run build:backend         # Expressバックエンドのみビルド

# コード品質
npm run lint                  # 両プロジェクトのリント実行
npm run lint:fix              # 両プロジェクトのリント問題を修正
npm run format:fix            # 両プロジェクトのフォーマット修正
npm run check:fix             # 両プロジェクトの完全チェックと修正
```

### パッケージ固有コマンド

個別のパッケージで作業する際に使用：

```bash
# Tauriアプリ（app/ディレクトリから、または--workspace使用）
cd app
npm run dev                   # Vite開発サーバーのみ起動
npm run tauri dev             # 完全なTauri開発環境起動（Vite + Rust）
npm run build                 # フロントエンドをプロダクション用にビルド
npm run tauri build           # 完全なTauriアプリバンドルをビルド

# Expressバックエンド（backend/ディレクトリから、または--workspace使用）
cd backend
npm run dev                   # ホットリロード付きで起動
npm run start                 # ホットリロードなしで起動
npm run build                 # プロダクション用にビルド
```

## Tauri固有の開発

### フロントエンド・バックエンド間通信

- Tauriコマンドは `app/src-tauri/src/lib.rs` で `#[tauri::command]` を使って定義
- フロントエンドは `@tauri-apps/api/core` の `invoke()` でRust関数を呼び出し
- 例: `await invoke('greet', { name: 'World' })`

### 開発環境設定

- `tauri.conf.json` で指定:
  - `beforeDevCommand`: "npm run dev" （Vite開発サーバーの起動）
  - `devUrl`: "http://localhost:1420" （開発時のフロントエンドURL）
  - `beforeBuildCommand`: "npm run build" （プロダクション用フロントエンドビルド）
  - `frontendDist`: "../dist" （ビルドされたフロントエンドファイルの場所）

### Vite設定の注意点

- Tauri開発用にポート1420を固定（strictPort: true）
- HMRポート1421をホットモジュール置換に使用
- `src-tauri` ディレクトリはViteファイル監視から除外

## コードスタイル設定

Biomeの設定:

- 2スペースインデント
- JavaScript: シングルクォート、JSX: ダブルクォート
- 行幅: 80文字
- ES5スタイルの末尾カンマ
- 無効化されたルール: `noExplicitAny`, `noNonNullAssertion`

## ワークスペースとAIフレームワークの詳細

### npm ワークスペース構造

- ルート `package.json` で並行スクリプト実行を含むワークスペース設定を定義
- 各パッケージは独自の依存関係とスクリプトを維持
- 依存関係ロック用の共有 `package-lock.json` をルートレベルに配置
- ルートから `npm run --workspace=<package>` でパッケージ固有コマンドを実行

### Mastra AI Framework

- **現在の状況**: 依存関係に含まれているが実際は未使用状態
- 設定ファイルは `app/src/lib/mastra/` にあるがコメントアウト
- 実際のAI機能は `@ai-sdk/google` を直接使用してGoogle Gemini APIを呼び出し
- 将来的にMastraを活用した高度なAIエージェント機能の実装が可能

## アプリケーション機能詳細

### Timeline コンポーネント (`app/src/components/Timeline.tsx`)

#### 主要機能

1. **投稿管理**
   - 画像投稿の作成・表示・削除
   - 新しい順での並び替え表示
   - 投稿に対するコメント機能

2. **AI画像分析（自動実行）**
   - Google Gemini 1.5 Flash APIを使用
   - 新規投稿時に自動的に分析を実行
   - 猫の画像に特化した詳細分析プロンプト
   - Base64エンコードで画像を送信
   - 分析結果を投稿に自動保存

3. **音声機能**
   - **音声入力**: Web Speech APIによるリアルタイム音声認識（APIキー不要）
   - **音声読み上げ**: Google Cloud Text-to-Speech APIによるAI分析結果の読み上げ
   - タップで録音開始、自動発話終了検知（2-3秒の無音で自動終了）
   - リアルタイム音声認識結果の表示（中間結果も表示）

4. **WebSocketリアルタイム同期**
   - 複数デバイス間での即座な画像同期
   - 新着画像の自動受信と表示
   - 接続状態の視覚的インジケーター

5. **環境対応**
   - Android エミュレーターでの動作対応
   - 柔軟なTauri環境検出
   - 環境変数による API URL 設定

### NewPostComposer コンポーネント (`app/src/components/NewPostComposer.tsx`)

#### 主要機能

1. **画像アップロード**
   - ドラッグ&ドロップ対応のファイル選択UI
   - JPG、PNG、GIF形式をサポート
   - 画像プレビュー表示
   - 画像削除機能

2. **投稿作成**
   - 画像のTauriバックエンドへの保存
   - オプショナルなAI分析の事前実行
   - 投稿後のタイムライン自動更新

#### 実装詳細

```typescript
// 主要な状態管理
interface Comment {
  id: string;
  text: string;
  timestamp: Date;
  isAI: boolean;
}

// 画像分析エージェント (app/src/lib/mastra/imageAnalysis.ts)
export const imageAnalysisAgent = async (
  imageBase64: string
): Promise<string> => {
  // Google Gemini 1.5 Flash APIを直接呼び出し
  // 猫の表情分析に特化したプロンプト設計
};
```

#### UIライブラリとスタイリング

- **Lucide React**: アイコン（Upload, MessageSquare, X, Loader2等）
- **TailwindCSS**: レスポンシブデザイン、ダークモード対応
- **TypeScript**: 厳密な型安全性

## WebSocket リアルタイム同期機能

### 概要

アプリケーションにはWebSocketを使用したリアルタイム同期機能が実装されており、複数のデバイス間で画像の追加・更新を即座に同期できます。

### 技術仕様

- **プロトコル**: Socket.IO (WebSocket based)
- **バックエンド**: Socket.IO サーバー (backend/index.ts)
- **フロントエンド**: socket.io-client (app/src/hooks/useNetworkSync.ts)
- **同期方式**: イベント駆動型リアルタイム通信

### 実装詳細

#### バックエンド (backend/index.ts)

```typescript
// Socket.IO サーバー設定
const io = new Server(server, {
  cors: {
    origin: true,
    methods: ["GET", "POST"]
  }
});

// 画像アップロード時の通知
io.emit("new_image", newImage);
```

#### フロントエンド (app/src/hooks/useNetworkSync.ts)

```typescript
// WebSocket接続
const socket = io(serverUrl, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000
});

// 新しい画像の受信
socket.on("new_image", handleNewImage);
```

### WebSocketイベント一覧

- **`new_image`**: 新しい画像が追加された時の通知
- **`connect`**: クライアント接続確立
- **`disconnect`**: クライアント接続切断

### 使用方法

```typescript
// Timeline.tsx での使用例
useNetworkSync({
  serverUrl: "http://192.168.1.100:3000",
  onNewImages: handleNewNetworkImages,
  enabled: networkSyncEnabled
});
```

### デバッグ方法

1. **接続状態確認**: ブラウザのコンソールで接続ログを確認
2. **ネットワークタブ**: WebSocket接続状況をDevToolsで監視
3. **サーバーログ**: バックエンドコンソールで接続・メッセージログを確認

### 従来のポーリング方式からの変更点

- **ポーリング間隔**: 3秒間隔 → リアルタイム（即座）
- **ネットワーク効率**: 定期的なHTTPリクエスト → イベント駆動
- **レスポンス性**: 最大3秒の遅延 → 即座に同期
- **サーバー負荷**: 一定間隔の負荷 → 変更時のみ通信

### 技術スタック詳細

#### フロントエンド依存関係

- **React 18.3.1**: メインUIフレームワーク
- **TypeScript**: 型安全性の確保
- **Vite 6.0.3**: 高速ビルドツール・開発サーバー
- **TailwindCSS 4.1.10**: ユーティリティファーストCSS
- **lucide-react 0.515.0**: モダンアイコンライブラリ
- **socket.io-client 4.8.1**: WebSocketクライアント（リアルタイム同期）

#### AI・機械学習関連

- **@ai-sdk/google 1.2.19**: Google Gemini API SDK（実際に使用）
- **@ai-sdk/anthropic 1.2.12**: Anthropic Claude API SDK
- **ai 4.3.16**: AI SDK コア
- **@mastra/core, @mastra/engine, @mastra/memory**: Mastraフレームワーク（未使用）
- **@libsql/client 0.15.9**: SQLiteクライアント（未使用）

#### Tauri関連

- **@tauri-apps/api 2.x**: Tauriフロントエンド API
- **@tauri-apps/plugin-opener 2.x**: ファイル・URLオープナー
- **@tauri-apps/cli 2.x**: Tauri CLI

#### 開発・品質管理

- **@biomejs/biome 1.9.4**: 高速リンター・フォーマッター
- **PostCSS 8.5.5**: CSS後処理ツール
- **autoprefixer 10.4.21**: CSS自動ベンダープレフィックス

## 開発時の重要事項

### 環境変数設定

```bash
# app/.env.local に設定が必要
VITE_GOOGLE_AI_API_KEY=your_google_ai_api_key_here

# 音声機能用Google Cloud API キー（オプション）
VITE_GOOGLE_CLOUD_TTS_API_KEY=your_google_cloud_tts_api_key  # 音声合成用

# 注意: 音声認識はWeb Speech APIを使用するため、STT APIキーは不要になりました

# WebSocket/API サーバー設定（オプション）
VITE_API_URL=http://192.168.1.100:3000  # ネットワーク経由でのAPI接続時
```

### API URL設定と環境変数

- **デフォルト**: `http://localhost:3000` (ローカル開発)
- **Android エミュレーター**: `http://10.0.2.2:3000`
- **ネットワーク経由**: 実際のマシンIP（例: `http://192.168.1.100:3000`）
- **設定方法**: `VITE_API_URL` 環境変数で指定

### パス設定

- **エイリアス**: `~` → `./src` （vite.config.ts で設定）
- **TypeScript**: `"~/*": ["./src/*"]` でパスマッピング設定

### 開発ワークフロー

1. **推奨開発コマンド**:

   ```bash
   # ルートディレクトリから実行
   npm run dev          # 統合開発（Web + Android + backend 並行）
   npm run dev:app      # デスクトップアプリのみ
   npm run dev:app:web  # Web版のみ
   npm run dev:app:android  # Android開発のみ
   ```

2. **完全なTauri開発**:

   ```bash
   cd app
   npm run tauri dev    # Vite + Rust バックエンド
   ```

3. **コード品質チェック**:
   ```bash
   npm run check:fix    # リント + フォーマット自動修正
   ```

### Tauri開発の注意点

- **固定ポート**: Vite開発サーバーは必ずポート1420を使用
- **HMR**: ホットモジュール置換はポート1421で動作
- **ファイル監視除外**: `src-tauri`ディレクトリはViteの監視対象外
- **セキュリティ**: CSP（Content Security Policy）は無効化されている
- **環境検出**: Androidエミュレーターでも動作するよう、Tauri環境チェックは最小限

### Android音声機能の設定

#### 1. Capabilities設定

```json
// app/src-tauri/capabilities/android.json
{
  "identifier": "android",
  "description": "Android-specific permissions including microphone access",
  "platforms": ["android"],
  "windows": ["main"],
  "permissions": ["core:default", "webview:allow-internal-apis"]
}
```

#### 2. tauri.conf.json設定

```json
{
  "app": {
    "security": {
      "capabilities": ["default", "android"]
    }
  }
}
```

#### 3. AndroidManifest.xml権限設定（手動編集必要）

```xml
<!-- app/src-tauri/gen/android/app/src/main/AndroidManifest.xml -->
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
```

**重要**: AndroidManifest.xmlは自動生成されるため、Android APKビルド後に毎回手動で権限を追加する必要があります。

#### 4. 音声機能の実装詳細

- **Speech-to-Text**: Google Cloud Speech-to-Text API使用
- **Text-to-Speech**: Google Cloud Text-to-Speech API使用
- **音声録音**: MediaRecorder API（WebView対応）
- **権限要求**: navigator.mediaDevices.getUserMedia()で自動要求

### TypeScript設定

- **プロジェクト参照**: ルートレベルでapp/とbackend/のプロジェクト参照を使用
- **Composite設定**: 各サブプロジェクトで`"composite": true`を設定
- **noEmit設定**: アプリでは`"noEmit": true`でViteにビルドを委任

### エラーハンドリングパターン

```typescript
// 画像分析時のエラーハンドリング例
try {
  const text = await imageAnalysisAgent(base64);
  // 成功時の処理
} catch (error) {
  console.error("画像分析エラー:", error);
  // ユーザーに分かりやすいエラーメッセージを表示
}
```

## アーキテクチャ上の特徴と今後の拡張ポイント

### 現在のアーキテクチャ特徴

1. **フロントエンド中心設計**
   - AI処理をフロントエンドで完結
   - APIキーをクライアントサイドで管理
   - Tauriバックエンドでデータ永続化とネイティブ機能

2. **リアルタイム同期**
   - WebSocket（Socket.IO）による即座な画像同期
   - 複数デバイス間でのシームレスな連携
   - イベント駆動型のデータ更新

3. **型安全性重視**
   - TypeScript strict mode有効
   - インターフェースによる構造化データ管理
   - Biomeによる厳密なコード品質管理

4. **クロスプラットフォーム対応**
   - Android エミュレーターでの動作サポート
   - 柔軟な環境変数設定
   - 環境に依存しないAPI URL設定

5. **モジュラー設計**
   - コンポーネント分離（Timeline, NewPostComposer）
   - カスタムフック（useNetworkSync, useFileWatcher）
   - ライブラリ分離（lib/mastra/）
   - 設定の外部化（環境変数、設定ファイル）

### 今後の拡張ポイント

#### 1. Mastraフレームワーク活用

```typescript
// 将来的な実装例
import { Mastra } from "@mastra/core";
import { AnthropicProvider } from "@mastra/anthropic";

const mastra = new Mastra({
  agents: [imageAnalysisAgent],
  providers: [new AnthropicProvider()]
});
```

#### 2. Tauriコマンド拡張

```rust
// セキュアなファイル操作、システム連携
#[tauri::command]
async fn save_analysis_result(data: String) -> Result<String, String> {
    // ファイル保存、データベース連携等
}
```

#### 3. 機能拡張

- 複数AI プロバイダー対応
- 分析履歴の永続化
- バッチ処理機能
- エクスポート機能

#### 4. パフォーマンス最適化

- 画像処理の最適化
- レスポンス時間の改善
- メモリ使用量の最適化

### ベストプラクティス

- **エラーハンドリング**: ユーザーフレンドリーなメッセージ
- **型安全性**: TypeScriptの厳密な型チェック活用
- **コード品質**: Biomeによる自動的な品質管理
- **開発効率**: ワークスペースレベルコマンドの活用
