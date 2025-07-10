import { appDataDir, join } from '@tauri-apps/api/path';
import { exists, readTextFile } from '@tauri-apps/plugin-fs';
import { useCallback, useEffect, useRef } from 'react';

interface FileWatcherOptions {
  onFileChange: () => void;
  interval?: number; // ポーリング間隔（ミリ秒）
}

export function useFileWatcher(options: FileWatcherOptions) {
  const { onFileChange, interval = 2000 } = options;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastModifiedRef = useRef<number | null>(null);
  const isWatchingRef = useRef(false);
  const isProcessingRef = useRef(false); // 処理中フラグを追加

  const getMetadataPath = useCallback(async () => {
    try {
      // Tauri環境チェック
      if (typeof window === 'undefined' || !(window as any).__TAURI__) {
        console.warn(
          'Tauri環境ではありません。ファイルウォッチャーは無効化されます。'
        );
        return null;
      }

      const appDataDirPath = await appDataDir();
      return await join(appDataDirPath, 'anne-app', 'metadata.json');
    } catch (error) {
      console.error('メタデータパス取得エラー:', error);
      return null;
    }
  }, []);

  const checkFileChange = useCallback(async () => {
    // 処理中の場合はスキップ
    if (isProcessingRef.current) {
      console.log('ファイルウォッチャー: 処理中のためスキップ');
      return;
    }

    try {
      const metadataPath = await getMetadataPath();
      if (!metadataPath) return;

      const fileExists = await exists(metadataPath);
      if (!fileExists) return;

      // ファイル内容を読み込み、JSONとして解析して信頼性の高いハッシュを作成
      const content = await readTextFile(metadataPath);

      let currentHash: number;
      try {
        const jsonData = JSON.parse(content);
        // 画像の数と最新のタイムスタンプを組み合わせてハッシュを作成
        const imageCount = jsonData.images?.length || 0;
        let latestTimestamp = 0;
        if (imageCount > 0 && jsonData.images) {
          const timestamps = jsonData.images.map((img: any) =>
            new Date(img.timestamp).getTime()
          );
          latestTimestamp = Math.max(...timestamps);
        }
        currentHash = imageCount * 1000000 + (latestTimestamp % 1000000);

        console.log(
          `ファイルウォッチャー: 画像数=${imageCount}, 最新タイムスタンプ=${latestTimestamp}, ハッシュ=${currentHash}`
        );
      } catch (parseError) {
        // JSON解析に失敗した場合はファイルサイズを使用
        console.warn('JSON解析に失敗、ファイルサイズを使用:', parseError);
        currentHash = content.length;
      }

      if (lastModifiedRef.current === null) {
        lastModifiedRef.current = currentHash;
        console.log('ファイルウォッチャー初期化: ハッシュ設定', currentHash);
        return;
      }

      if (lastModifiedRef.current !== currentHash) {
        console.log(
          `metadata.json の変更を検出: ${lastModifiedRef.current} → ${currentHash}`
        );
        lastModifiedRef.current = currentHash;

        // 処理中フラグを設定
        isProcessingRef.current = true;
        try {
          await onFileChange();
        } finally {
          // 処理完了後にフラグをリセット（少し遅延を入れる）
          setTimeout(() => {
            isProcessingRef.current = false;
            console.log('ファイルウォッチャー: 処理完了、監視再開');
          }, 3000); // 3秒間は監視を停止
        }
      }
    } catch (error) {
      console.error('ファイル変更チェックエラー:', error);
      isProcessingRef.current = false; // エラー時もフラグをリセット
    }
  }, [getMetadataPath, onFileChange]);

  const startWatching = useCallback(() => {
    if (isWatchingRef.current) return;

    console.log('ファイルウォッチャー開始');
    isWatchingRef.current = true;

    // 初回チェック
    checkFileChange();

    // 定期的なチェック
    intervalRef.current = setInterval(checkFileChange, interval);
  }, [checkFileChange, interval]);

  const stopWatching = useCallback(() => {
    if (!isWatchingRef.current) return;

    console.log('ファイルウォッチャー停止');
    isWatchingRef.current = false;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    startWatching();

    return () => {
      stopWatching();
    };
  }, [startWatching, stopWatching]);

  return {
    startWatching,
    stopWatching,
    isWatching: isWatchingRef.current,
  };
}
