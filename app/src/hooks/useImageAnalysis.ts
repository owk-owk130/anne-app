import { invoke } from '@tauri-apps/api/core';
import { useCallback, useState } from 'react';
import { imageAnalysisAgent } from '~/lib/mastra/imageAnalysis';
import type { Post } from '~/types/posts';

interface AnalysisState {
  [imageId: string]: {
    isAnalyzing: boolean;
    error?: string;
  };
}

export function useImageAnalysis() {
  const [analysisState, setAnalysisState] = useState<AnalysisState>({});

  const analyzeImage = useCallback(
    async (imageId: string): Promise<string | null> => {
      try {
        // 分析開始状態に設定
        setAnalysisState((prev) => ({
          ...prev,
          [imageId]: { isAnalyzing: true },
        }));

        console.log(`AI分析開始: ${imageId}`);

        // Tauriコマンドで画像データを読み込み
        const imageBytes = await invoke<number[]>('load_image', { imageId });
        const uint8Array = new Uint8Array(imageBytes);

        // Base64エンコード
        const base64Image = btoa(String.fromCharCode(...uint8Array));

        // AI分析実行
        const analysisResult = await imageAnalysisAgent(base64Image);

        // 分析結果をメタデータに保存
        await invoke('update_image_analysis', {
          imageId,
          analysisResult,
        });

        console.log(`AI分析完了: ${imageId}`);

        // 分析完了状態に設定
        setAnalysisState((prev) => ({
          ...prev,
          [imageId]: { isAnalyzing: false },
        }));

        return analysisResult;
      } catch (error) {
        console.error(`AI分析エラー (${imageId}):`, error);

        // エラー状態に設定
        setAnalysisState((prev) => ({
          ...prev,
          [imageId]: {
            isAnalyzing: false,
            error:
              error instanceof Error ? error.message : '分析に失敗しました',
          },
        }));

        return null;
      }
    },
    []
  );

  const analyzeUnanalyzedImages = useCallback(
    async (posts: Post[]): Promise<void> => {
      // 未分析の画像を抽出
      const unanalyzedPosts = posts.filter((post) => !post.ai_analysis);

      if (unanalyzedPosts.length === 0) {
        console.log('未分析の画像はありません');
        return;
      }

      console.log(`${unanalyzedPosts.length}件の未分析画像を処理します`);

      // 並列処理で分析実行
      const analysisPromises = unanalyzedPosts.map((post) =>
        analyzeImage(post.id)
      );

      await Promise.allSettled(analysisPromises);
    },
    [analyzeImage]
  );

  const getAnalysisState = useCallback(
    (imageId: string) => {
      return analysisState[imageId] || { isAnalyzing: false };
    },
    [analysisState]
  );

  const clearAnalysisState = useCallback((imageId: string) => {
    setAnalysisState((prev) => {
      const newState = { ...prev };
      delete newState[imageId];
      return newState;
    });
  }, []);

  return {
    analyzeImage,
    analyzeUnanalyzedImages,
    getAnalysisState,
    clearAnalysisState,
  };
}
