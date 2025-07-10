# Anne App PoC - AI 画像分析アプリ

猫の画像分析に特化した AI 機能付きデスクトップ・モバイルアプリケーションの PoC（Proof of Concept）です。

## 🌟 主要機能

- **🤖 AI 画像分析**: Google Gemini API を使用した猫の画像分析（自動実行）
- **🎙️ 音声入力**: Web Speech APIによるリアルタイム音声認識（APIキー不要）
- **🔊 音声読み上げ**: Google Cloud Text-to-Speech APIによるAI分析結果の読み上げ
- **📱 マルチプラットフォーム**: デスクトップ、Web、Android 対応
- **🌐 WebSocketリアルタイム同期**: Socket.IOによる即座な画像・分析結果の共有
- **⏰ タイムライン表示**: 投稿・コメント機能付きの SNS 風インターフェース
- **🔄 自動分析**: 新規投稿時の AI 分析自動実行
- **📳 環境対応**: Android エミュレーターでの動作サポート

## 📁 プロジェクト構成

```text
aiss-pet-poc/
├── app/              # Tauriアプリ (React + TypeScript + Rust)
├── backend/          # Express APIサーバー (TypeScript + Node.js)
├── package.json      # ワークスペース設定
├── biome.json        # 共有リント・フォーマット設定
├── tsconfig.json     # 共有TypeScript設定
└── CLAUDE.md         # プロジェクト詳細ドキュメント
```

## 🚀 セットアップ

### 必要環境

- [Node.js](https://nodejs.org/) (>= 18.0.0)
- [npm](https://www.npmjs.com/) (>= 8.0.0)
- [Rust](https://rustup.rs/) (Tauri 用)

### インストール

全パッケージの依存関係をインストール：

```bash
npm install
```

### 開発環境起動

**基本開発環境**（Web + Android + バックエンドAPI）：

```bash
npm run dev
```

上記コマンドで以下が並行して起動します：
- Vite開発サーバー（Web版、ポート1420）
- Android開発環境（Android Studio連携）
- ExpressバックエンドAPI（ポート3000）

**個別起動する場合**：

```bash
# デスクトップアプリのみ（Vite + Rust）
npm run dev:app

# Web版のみ（Viteサーバー）
npm run dev:app:web

# Android開発のみ
npm run dev:app:android

# バックエンドAPIのみ
npm run dev:backend
```

### ビルド

全体をビルド：

```bash
npm run build
```

個別ビルド：

```bash
# Tauriアプリのみ
npm run build:app

# バックエンドのみ
npm run build:backend
```

## 🎯 アプリケーション概要

### Tauri アプリ (`@anne-app/frontend`)

**場所**: `app/`  
**技術スタック**: React, TypeScript, Vite, Tauri, TailwindCSS, Lucide React

**主要機能**:

- 画像ドラッグ&ドロップアップロード
- Google Gemini API による画像分析（自動実行）
- タイムライン表示（投稿・コメント機能）
- 音声入力機能（Web Speech API - リアルタイム認識）
- AI分析結果の音声読み上げ（Google Cloud Text-to-Speech）
- WebSocketリアルタイム同期（Socket.IO）
- Android エミュレーター対応
- マルチプラットフォーム対応（デスクトップ・Android）

**開発コマンド**:

```bash
# 統合開発環境（推奨）- Web + Android + バックエンド
npm run dev

# 個別開発
npm run dev:app:web      # Web版のみ
npm run dev:app          # デスクトップ版のみ  
npm run dev:app:android  # Android版のみ
```

### Express API サーバー (`@anne-app/backend`)

**場所**: `backend/`  
**技術スタック**: Express, TypeScript, Node.js, Socket.IO, CORS, Multer

**主要機能**:

- 画像アップロード API
- WebSocketリアルタイム通信（Socket.IO）
- メタデータ管理・配信
- ネットワーク内アクセス対応
- ヘルスチェック・情報取得 API

**開発コマンド**:

```bash
npm run dev:backend
```

## ⚙️ 環境設定

### API 設定

`app/.env.local`ファイルを作成：

```bash
# WebSocket/APIサーバーURL（オプション）
VITE_API_URL=http://192.168.1.100:3000  # ネットワーク経由でのAPI接続時

# Google AI API キー（必須）
VITE_GOOGLE_AI_API_KEY=your_google_ai_api_key_here

# Google Cloud Text-to-Speech API キー（オプション）
VITE_GOOGLE_CLOUD_TTS_API_KEY=your_tts_api_key  # 音声読み上げ用

# 注意: 音声入力はWeb Speech APIを使用するため、STT APIキーは不要です
```

**URL設定の詳細**:
- **未設定時**: `http://localhost:3000` (デフォルト)
- **Android エミュレーター**: 自動的に `http://10.0.2.2:3000` を使用
- **ネットワーク経由**: 実際のマシンIP (例: `http://192.168.1.100:3000`)

### ネットワーク設定

同一ネットワーク内での通信を有効にするため：

1. **IP 固定ルーター使用推奨**
2. **開発マシンの IP アドレス**: `192.168.1.100`（例）
3. **API サーバーポート**: `3000`
4. **Android・デスクトップ**: 固定 IP でアクセス
5. **Android エミュレーター**: `10.0.2.2`で自動切り替え

## 🎙️ Android音声機能の設定

### マイク権限の設定（Android APK用）

音声入力機能を使用するには、Android APKビルド後に以下の設定が必要です：

1. **AndroidManifest.xmlの編集**

APKビルド後、以下のファイルを編集：
```
app/src-tauri/gen/android/app/src/main/AndroidManifest.xml
```

`<uses-permission android:name="android.permission.INTERNET" />` の下に追加：
```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
```

2. **APKの再ビルド**

権限を追加した後、APKを再ビルドしてください：
```bash
npm run build:app:android
```

3. **実行時権限**

アプリ初回起動時に、ユーザーがマイク権限を許可する必要があります。

### 注意事項
- AndroidManifest.xmlは自動生成されるため、ビルドごとに手動編集が必要
- 音声機能を使わない場合は、この設定は不要
- デスクトップ版では追加設定は不要

## 🔊 Android エミュレーターでの音声機能テスト手順

### 音声再生（Text-to-Speech）のトラブルシューティング

Androidエミュレーターで音声が聞こえない場合は、以下の手順で確認してください：

#### 1. エミュレーター側の設定確認
- **音量設定**: エミュレーター内の音量が上がっているか確認
- **Extended Controls**: エミュレーターの Extended Controls > Settings で音声出力が有効か確認
- **ホストマシンの音量**: Mac/PCの音量設定を確認

#### 2. Chrome DevToolsでのデバッグ
Androidエミュレーターで実行中のアプリをデバッグする場合：

```bash
# 1. Android エミュレーターでアプリを起動
npm run dev:app:android

# 2. Chrome で以下のURLを開く
chrome://inspect/#devices

# 3. アプリのWebViewを見つけて "inspect" をクリック
```

#### 3. コンソールログの確認
音声再生時に以下のようなログが表示されるはずです：

```
[TTS] 音声合成開始: {text: "...", platform: "...", audioEnabled: true}
[TTS] Google Cloud TTS APIを呼び出し中...
[TTS] API応答を受信: {hasAudioContent: true, audioLength: ...}
[TTS] 音声データをデコード中...
[TTS] 音声Blob URLを生成: {blobSize: ..., blobType: "audio/mp3", url: ...}
[TTS] Audioオブジェクトを作成中...
[TTS] 音声の準備が完了しました
[TTS] 音声再生を開始します...
[TTS] 音声再生が開始されました
```

#### 4. よくあるエラーと対処法

**NotAllowedError**: 
- ユーザー操作なしでの音声再生が制限されている
- 対処法: 画面を一度タップしてから再生ボタンを押す

**NotSupportedError**:
- 音声形式がサポートされていない
- 対処法: エミュレーターのAPIレベルを確認（API 24以上推奨）

**ネットワークエラー**:
- APIへのアクセスが制限されている
- 対処法: エミュレーターのネットワーク設定を確認

#### 5. 実機でのテスト推奨
エミュレーターで音声が再生されない場合は、実機でのテストを推奨します：

```bash
# APKをビルド
cd app
npm run tauri android build

# 生成されたAPKを実機にインストール
```

## 🛠️ 開発・品質管理

### リント・フォーマット

全パッケージでリント・フォーマットを実行：

```bash
# リント実行
npm run lint

# リント問題を修正
npm run lint:fix

# フォーマット実行
npm run format:fix

# 完全チェック（リント + フォーマット）
npm run check:fix
```

### パッケージ個別操作

```bash
# Tauriアプリでスクリプト実行
npm run --workspace=app <script-name>

# バックエンドでスクリプト実行
npm run --workspace=backend <script-name>
```

## 🔧 技術詳細

### AI 機能

- **分析エンジン**: Google Gemini 1.5 Flash
- **対象**: 猫の画像に特化した分析
- **出力**: 表情・行動・状況の詳細分析

### データ管理

- **画像保存**: Tauriバックエンド（Rustベース）でのローカルファイルシステム
- **メタデータ**: JSON 形式でのローカル保存
- **リアルタイム同期**: WebSocket（Socket.IO）による即座な同期
- **自動分析**: 新規投稿時の AI 分析自動実行

### プラットフォーム対応

- **デスクトップ**: macOS, Windows, Linux
- **Web**: モダンブラウザ対応
- **Android**: APK 生成・配布対応

## 📚 詳細ドキュメント

プロジェクトの詳細な技術情報は [`CLAUDE.md`](./CLAUDE.md) を参照してください。

## ワークスペース構成

このモノレポは npm workspaces を使用して依存関係管理とスクリプト統合を行っています。各パッケージは独自の`package.json`で依存関係とスクリプトを管理し、ルートの`package.json`でワークスペースレベルのコマンドを提供します。
