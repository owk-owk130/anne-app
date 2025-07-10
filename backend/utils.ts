import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { join } from 'node:path';
import type { ImageMetadata, ImagesData } from './types';

// Tauriアプリのapp_data_dirと同じディレクトリ構造を使用
function getAppDataDir(): string {
  const homeDir = homedir();
  const currentPlatform = platform();

  switch (currentPlatform) {
    case 'win32':
      return process.env.APPDATA || join(homeDir, 'AppData', 'Roaming');
    case 'darwin':
      return join(homeDir, 'Library', 'Application Support');
    case 'linux':
      return process.env.XDG_DATA_HOME || join(homeDir, '.local', 'share');
    default:
      // その他のOS（FreeBSD等）はLinuxと同じ構造を使用
      return process.env.XDG_DATA_HOME || join(homeDir, '.local', 'share');
  }
}

function getAnneAppDir(): string {
  // Tauriアプリのapp_data_dirと同じパスを構築
  const appDataDir = getAppDataDir();
  // Tauriのバンドル識別子を使用してディレクトリを作成
  const tauriAppDir = join(appDataDir, 'com.anne-app.app');
  const anneAppDir = join(tauriAppDir, 'anne-app');
  console.log(`バックエンド [${platform()}]: anneAppDir =`, anneAppDir);
  return anneAppDir;
}

export function getImagesDir(): string {
  return join(getAnneAppDir(), 'images');
}

function getMetadataPath(): string {
  return join(getAnneAppDir(), 'metadata.json');
}

// メタデータファイルの読み込み
export function loadMetadata(): ImagesData {
  const metadataPath = getMetadataPath();

  if (!existsSync(metadataPath)) {
    return { images: [] };
  }

  try {
    const content = readFileSync(metadataPath, 'utf-8');
    return JSON.parse(content) as ImagesData;
  } catch (error) {
    console.error('メタデータ読み込みエラー:', error);
    return { images: [] };
  }
}

// メタデータファイルの保存
export function saveMetadata(data: ImagesData): void {
  const metadataPath = getMetadataPath();
  const anneAppDir = getAnneAppDir();

  // ディレクトリが存在しない場合は作成
  if (!existsSync(anneAppDir)) {
    mkdirSync(anneAppDir, { recursive: true });
  }

  try {
    const content = JSON.stringify(data, null, 2);
    writeFileSync(metadataPath, content, 'utf-8');
  } catch (error) {
    console.error('メタデータ保存エラー:', error);
    throw error;
  }
}

// 画像ファイルの保存
export function saveImageFile(imageBuffer: Buffer, filename: string): void {
  const imagesDir = getImagesDir();

  // 画像ディレクトリが存在しない場合は作成
  if (!existsSync(imagesDir)) {
    mkdirSync(imagesDir, { recursive: true });
  }

  const imagePath = join(imagesDir, filename);

  try {
    writeFileSync(imagePath, imageBuffer);
  } catch (error) {
    console.error('画像ファイル保存エラー:', error);
    throw error;
  }
}

// 新しい画像メタデータを追加（未分析状態で保存）
export function addImageMetadata(
  originalName: string,
  imageBuffer: Buffer
): string {
  const timestamp = new Date().toISOString();
  const imageId = `img_${Date.now()}`;
  const extension = originalName.split('.').pop() || 'jpg';
  const filename = `${imageId}.${extension}`;

  console.log('画像保存処理開始:');
  console.log(`  - 画像ID: ${imageId}`);
  console.log(`  - ファイル名: ${filename}`);
  console.log(`  - 元ファイル名: ${originalName}`);
  console.log(`  - バッファサイズ: ${imageBuffer.length} bytes`);
  console.log(`  - anne-appディレクトリ: ${getAnneAppDir()}`);
  console.log(`  - 画像ディレクトリ: ${getImagesDir()}`);
  console.log(`  - メタデータパス: ${getMetadataPath()}`);

  // 画像ファイルを保存
  saveImageFile(imageBuffer, filename);
  console.log(`✓ 画像ファイル保存完了: ${filename}`);

  // メタデータを更新（AI分析結果はnullで保存）
  const metadata = loadMetadata();
  console.log(`メタデータ読み込み完了: 既存画像数 = ${metadata.images.length}`);

  const newImage: ImageMetadata = {
    id: imageId,
    filename,
    original_name: originalName,
    timestamp,
    analysis_result: null, // 未分析状態
    user_comments: [],
  };

  metadata.images.push(newImage);
  saveMetadata(metadata);
  console.log(`✓ メタデータ保存完了: 現在画像数 = ${metadata.images.length}`);

  return imageId;
}

// AI分析はTauri側で実行するため、バックエンドでは画像保存のみ実行
