import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { ImageMetadata, ImagesData } from './types';

// Tauriアプリと同じディレクトリ構造を使用
function getAnneAppDir(): string {
  // Tauriアプリのapp_data_dirと同じパスを構築
  const homeDir = homedir();
  const appDataDir = join(homeDir, 'Library', 'Application Support'); // macOS
  return join(appDataDir, 'anne-app');
}

function getImagesDir(): string {
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

// 新しい画像メタデータを追加
export function addImageMetadata(
  originalName: string,
  imageBuffer: Buffer,
  analysisResult?: string
): string {
  const timestamp = new Date().toISOString();
  const imageId = `img_${Date.now()}`;
  const extension = originalName.split('.').pop() || 'jpg';
  const filename = `${imageId}.${extension}`;
  
  // 画像ファイルを保存
  saveImageFile(imageBuffer, filename);
  
  // メタデータを更新
  const metadata = loadMetadata();
  const newImage: ImageMetadata = {
    id: imageId,
    filename,
    original_name: originalName,
    timestamp,
    analysis_result: analysisResult,
    user_comments: []
  };
  
  metadata.images.push(newImage);
  saveMetadata(metadata);
  
  return imageId;
}

// AI分析の実行（Mastraエージェントを使用）
export async function analyzeImage(imageBuffer: Buffer): Promise<string | undefined> {
  try {
    // Base64エンコード
    const base64Image = imageBuffer.toString('base64');
    
    // TODO: Mastraの imageAnalysisAgent を使用
    // 現在は仮の実装
    console.log('AI分析実行中...');
    
    // 仮の分析結果を返す（実際の実装では Mastra を使用）
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒待機
    
    return `画像分析結果: ${new Date().toLocaleString('ja-JP')}に撮影された画像です。`;
  } catch (error) {
    console.error('AI分析エラー:', error);
    return undefined;
  }
}