# Anne App - AI画像分析Tauriアプリ

猫の画像分析に特化したマルチプラットフォーム対応のTauriアプリケーションです。Google Gemini APIを使用したAI画像分析とSNS風のタイムライン機能を提供します。

## 🌟 主要機能

### 🤖 AI画像分析

- **Google Gemini 1.5 Flash**: 高精度な画像分析エンジン
- **猫特化分析**: 表情、行動、状況の詳細分析
- **リアルタイム処理**: ドラッグ&ドロップで即座に分析開始

### 📱 マルチプラットフォーム対応

- **デスクトップ**: macOS, Windows, Linux
- **Web**: モダンブラウザ対応（開発・テスト用）
- **Android**: エミュレーター・実機APK対応

### ⏰ タイムライン機能

- **投稿管理**: 画像付き投稿の作成・表示
- **コメントシステム**: AIコメントと人間コメントの区別表示
- **リアルタイム更新**: ファイルシステム監視による自動更新

### 🌐 ネットワーク同期

- **APIサーバー連携**: バックエンドとの自動データ同期
- **ローカルファースト**: オフライン動作とオンライン同期の両立
- **プラットフォーム自動検出**: 環境に応じたAPI URL自動切り替え

## 🚀 セットアップ

### 必要環境

- [Node.js](https://nodejs.org/) (>= 18.0.0)
- [Rust](https://rustup.rs/) (Tauriツールチェーン)
- [Android Studio](https://developer.android.com/studio) (Android開発時)

### インストール

```bash
# 依存関係のインストール
npm install

# Android開発環境のセットアップ（初回のみ）
npm run setup:android
```

### 環境変数設定

`.env.local`ファイルを作成：

```bash
# APIサーバーURL（同一ネットワーク用）
VITE_API_URL=http://192.168.1.100:3000

# Google AI API Key
VITE_GOOGLE_AI_API_KEY=your_google_ai_api_key_here
```

## 🛠️ 開発

### Web開発（推奨）

```bash
# Vite開発サーバー起動
npm run dev

# ブラウザで http://localhost:1420 にアクセス
```

### デスクトップ開発

```bash
# Tauri開発環境起動（Vite + Rust）
npm run tauri dev
```

### Android開発

**ステップ1**: Viteサーバーを起動

```bash
npm run dev
```

**ステップ2**: 別ターミナルでAndroid開発開始

```bash
npm run tauri android dev
```

## 📦 ビルド

### デスクトップアプリ

```bash
# プロダクションビルド
npm run build

# Tauriアプリバンドル生成
npm run tauri build
```

### Androidアプリ

```bash
# APKビルド
npm run tauri android build
```

## 🎯 アプリケーション構造

### 主要コンポーネント

#### `ImageAnalysisChat.tsx`

- ドラッグ&ドロップ画像アップロード
- Google Gemini API画像分析
- コメントシステム

#### `Timeline.tsx`

- 投稿一覧表示
- 新規投稿作成
- ネットワーク同期制御
- リアルタイム更新

#### `NewPostComposer.tsx`

- 新規投稿作成UI
- 画像選択・プレビュー
- AI分析トリガー

### データ管理

#### ローカルストレージ

```
~/Library/Application Support/anne-app/
├── images/           # 画像ファイル
└── metadata.json     # 投稿・分析メタデータ
```

#### API通信

- `useNetworkSync`: バックエンドとの自動同期
- `useFileWatcher`: ローカルファイル変更監視
- プラットフォーム別URL自動切り替え

## ⚙️ 設定・カスタマイズ

### API URL設定

```typescript
// プラットフォーム自動検出
const apiUrl = getApiUrl();

// デスクトップ・Web: env変数 または 192.168.1.100:3000
// Androidエミュレーター: 10.0.2.2:3000
// Android実機: 環境変数設定値
```

### AI分析のカスタマイズ

`src/lib/mastra/imageAnalysis.ts`でプロンプトを編集：

```typescript
const ANALYSIS_PROMPT = `
あなたの分析プロンプトをここに記述
`;
```

### UI テーマ

TailwindCSS設定で外観をカスタマイズ：

- `tailwind.config.js`: カラーパレット・レスポンシブ設定
- `src/index.css`: グローバルスタイル

## 🔧 技術スタック

### フロントエンド

- **React 18.3.1**: UIフレームワーク
- **TypeScript**: 型安全な開発
- **Vite 6.0.3**: 高速ビルドツール
- **TailwindCSS 4.1.10**: ユーティリティファーストCSS

### Tauriバックエンド（Rust）

- **ファイルシステム**: 画像・メタデータ管理
- **プラットフォームAPI**: OS固有機能アクセス
- **セキュリティ**: sandboxed実行環境

### AI・外部API

- **Google Gemini 1.5 Flash**: 画像分析エンジン
- **@ai-sdk/google**: Google AI SDK
- **Fetch API**: HTTP通信（Tauri HTTPプラグイン不使用）

### 開発ツール

- **Biome**: 高速リンター・フォーマッター
- **TypeScript strict mode**: 厳密な型チェック
- **Vite HMR**: ホットモジュール置換

## 🐛 トラブルシューティング

### Android開発

**クラッシュする場合**:

```bash
# Tauri HTTPプラグインを無効化済み
# 通常のfetch APIを使用
```

**エミュレーターでAPI接続できない**:

```bash
# 10.0.2.2 で自動的にホストマシンにアクセス
# VITE_API_URL の設定確認
```

### 画像分析エラー

**API キーエラー**:

```bash
# .env.local の VITE_GOOGLE_AI_API_KEY を確認
# Google AI Studio でキーを再生成
```

**画像フォーマットエラー**:

- 対応形式: JPG, PNG, GIF
- 最大サイズ制限確認

### ビルドエラー

**Rust コンパイルエラー**:

```bash
# Rust toolchain更新
rustup update

# キャッシュクリア
cargo clean
```

## 📚 参考資料

### 公式ドキュメント

- [Tauri](https://tauri.app/)
- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [Google AI SDK](https://sdk.vercel.ai/docs)

### プロジェクト固有

- [`../CLAUDE.md`](../CLAUDE.md): 詳細技術仕様
- [`../backend/README.md`](../backend/README.md): APIサーバー仕様

## 推奨IDE設定

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer) + [TypeScript](https://marketplace.visualstudio.com/items?itemName=ms-vscode.vscode-typescript-next)
