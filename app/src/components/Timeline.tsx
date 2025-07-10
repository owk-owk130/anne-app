import { invoke } from '@tauri-apps/api/core';
import { RefreshCw, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useFileWatcher } from '~/hooks/useFileWatcher';
import { useNetworkSync } from '~/hooks/useNetworkSync';
import { imageAnalysisAgent } from '~/lib/mastra/imageAnalysis';
import type { Post } from '~/types/posts';
import { getApiUrlAsync, checkApiConnection } from '~/utils/api';
import ConfirmDialog from './ConfirmDialog';
import NewPostComposer from './NewPostComposer';
import TimelinePost from './TimelinePost';

export default function Timeline() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyzingPosts, setAnalyzingPosts] = useState<Set<string>>(new Set());
  const [serverUrl, setServerUrl] = useState<string>('');
  const [apiConnected, setApiConnected] = useState<boolean>(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    postId: string | null;
    title: string;
    message: string;
  }>({
    isOpen: false,
    postId: null,
    title: '',
    message: '',
  });

  const loadPosts = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);

    setError(null);

    try {
      // Tauri環境チェック
      if (typeof invoke === 'undefined') {
        console.warn('Tauri invoke関数が利用できません。');
        setPosts([]);
        return;
      }

      // 既存の画像メタデータを取得してPostsに変換
      const savedImages = await invoke<any[]>('get_saved_images');

      const convertedPosts: Post[] = savedImages.map((image) => ({
        id: image.id,
        timestamp: image.timestamp,
        original_name: image.original_name,
        filename: image.filename,
        ai_analysis: image.analysis_result,
        comments: image.user_comments || [],
        likes: 0, // 今回は簡単のため0で初期化
        author_name: 'ユーザー',
        image_url: undefined, // 後で画像を読み込み
      }));

      // 画像データを読み込んでURLを設定
      const postsWithImages = await Promise.all(
        convertedPosts.map(async (post) => {
          try {
            const imageBytes = await invoke<number[]>('load_image', {
              imageId: post.id,
            });
            const uint8Array = new Uint8Array(imageBytes);
            const blob = new Blob([uint8Array]);
            const imageUrl = URL.createObjectURL(blob);
            return { ...post, image_url: imageUrl };
          } catch (error) {
            console.error(`画像読み込みエラー (${post.id}):`, error);
            return post;
          }
        })
      );

      // 新しい順に並び替え
      postsWithImages.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setPosts(postsWithImages);
    } catch (err) {
      console.error('投稿読み込みエラー:', err);
      setError('投稿の読み込みに失敗しました');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // APIサーバーの検出と接続
  useEffect(() => {
    const initializeApi = async () => {
      console.log('APIサーバーを検出中...');
      const url = await getApiUrlAsync();
      console.log('検出されたAPIサーバーURL:', url);
      setServerUrl(url);

      const connected = await checkApiConnection();
      console.log('APIサーバー接続状態:', connected);
      setApiConnected(connected);

      if (connected) {
        console.log(`APIサーバーに接続しました: ${url}`);
      } else {
        console.warn(`APIサーバーに接続できません: ${url}`);
      }
    };

    initializeApi();
  }, []);

  // 初期化時に常に投稿を読み込み
  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // serverUrlが設定された時の追加読み込み
  useEffect(() => {
    if (serverUrl) {
      loadPosts(true);
    }
  }, [serverUrl, loadPosts]);

  // 新しい画像の自動分析
  const autoAnalyzeNewImages = useCallback(async () => {
    console.log('未分析画像の自動分析を開始');
    console.log('現在の投稿数:', posts.length);

    const unanalyzedPosts = posts.filter((post) => !post.ai_analysis);
    console.log('未分析の投稿数:', unanalyzedPosts.length);

    if (unanalyzedPosts.length === 0) {
      console.log('未分析の投稿がありません');
      return;
    }

    // 分析中の投稿IDsを記録
    const analyzingIds = new Set(unanalyzedPosts.map((post) => post.id));
    setAnalyzingPosts(analyzingIds);

    for (const post of unanalyzedPosts) {
      try {
        console.log(`画像 ${post.id} (${post.original_name}) の自動分析を開始`);

        // 画像データを取得
        const imageBytes = await invoke<number[]>('load_image', {
          imageId: post.id,
        });
        console.log(`画像データ取得完了: ${imageBytes.length} bytes`);

        // Uint8ArrayからBase64に変換
        const uint8Array = new Uint8Array(imageBytes);
        const blob = new Blob([uint8Array]);
        const reader = new FileReader();

        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => {
            const result = reader.result as string;
            const base64Data = result.split(',')[1]; // "data:image/...;base64," を除去
            resolve(base64Data);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        console.log('Base64変換完了');

        // AI分析実行
        console.log('AI分析を実行中...');
        const analysisResult = await imageAnalysisAgent(base64);
        console.log(`AI分析完了: ${analysisResult.substring(0, 100)}...`);

        // 分析結果をTauriに保存
        await invoke('update_image_analysis', {
          imageId: post.id,
          analysisResult,
        });
        console.log(`画像 ${post.id} の分析結果を保存完了`);

        // この投稿の分析が完了したので分析中状態から削除
        setAnalyzingPosts((prev) => {
          const newSet = new Set(prev);
          newSet.delete(post.id);
          return newSet;
        });

        // 少し待機（API制限を避けるため）
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`画像 ${post.id} の自動分析エラー:`, error);

        // エラーの場合もこの投稿を分析中状態から削除
        setAnalyzingPosts((prev) => {
          const newSet = new Set(prev);
          newSet.delete(post.id);
          return newSet;
        });

        // エラーの場合は次の画像に進む
      }
    }

    // すべての分析が完了したらタイムラインを更新し、分析中状態をクリア
    if (unanalyzedPosts.length > 0) {
      console.log('自動分析完了、タイムラインを更新');
      setAnalyzingPosts(new Set()); // 分析中状態をクリア
      await loadPosts(true);
    }
  }, [posts, loadPosts]);

  // 投稿が読み込まれた後に自動分析を実行
  useEffect(() => {
    if (posts.length > 0) {
      const unanalyzedPosts = posts.filter((post) => !post.ai_analysis);
      if (unanalyzedPosts.length > 0) {
        console.log('未分析の投稿が見つかりました。自動分析を開始します。');
        setTimeout(() => {
          autoAnalyzeNewImages();
        }, 1000);
      }
    }
  }, [posts, autoAnalyzeNewImages]); // 必要な依存関係を追加

  // ネットワーク同期機能
  const handleNewNetworkImages = useCallback(
    async (newImages: any[]) => {
      console.log(`ネットワークから新着画像 ${newImages.length} 件を受信`);

      // 強制的に投稿リストをリフレッシュ
      setRefreshing(true);
      try {
        await loadPosts(true);
        // 少し待機してから自動分析
        setTimeout(() => {
          autoAnalyzeNewImages();
        }, 2000);
      } finally {
        setRefreshing(false);
      }
    },
    [loadPosts, autoAnalyzeNewImages]
  );

  // WebSocket同期の有効化条件
  const networkSyncEnabled = !!serverUrl;

  const networkSyncResult = useNetworkSync({
    serverUrl,
    onNewImages: handleNewNetworkImages,
    enabled: networkSyncEnabled,
  });

  // WebSocket接続状態をログ出力
  useEffect(() => {
    console.log('📡 WebSocket状態更新:', {
      serverUrl,
      enabled: networkSyncEnabled,
      isConnected: networkSyncResult?.isConnected,
    });
  }, [serverUrl, networkSyncEnabled, networkSyncResult?.isConnected]);

  // ファイルウォッチャーでバックエンドからのアップロードを検出
  useFileWatcher({
    onFileChange: async () => {
      console.log('ファイル変更を検出、投稿を再読み込みと自動分析');
      await loadPosts(true);

      // 未分析の画像があれば自動分析を実行
      setTimeout(() => {
        autoAnalyzeNewImages();
      }, 500); // 投稿読み込み後に少し遅らせて実行
    },
    interval: 2000, // 2秒間隔でチェック
  });

  // Object URLsのクリーンアップ用
  useEffect(() => {
    return () => {
      posts.forEach((post) => {
        if (post.image_url) {
          URL.revokeObjectURL(post.image_url);
        }
      });
    };
  }, [posts]);

  const handlePostCreate = async (
    imageData: number[],
    originalName: string,
    aiAnalysis?: string
  ) => {
    try {
      // Tauri環境チェック
      if (typeof invoke === 'undefined') {
        console.error('Tauri invoke関数が利用できません。');
        setError('投稿作成機能が利用できません。');
        return;
      }

      const postId = await invoke<string>('save_image', {
        imageData,
        originalName,
        analysisResult: aiAnalysis,
      });

      console.log('新しい投稿が作成されました:', postId);

      // タイムラインを更新
      await loadPosts();
    } catch (error) {
      console.error('投稿作成エラー:', error);
      setError(`投稿の作成に失敗しました: ${error}`);
    }
  };

  const handleComment = async (postId: string, commentText: string) => {
    try {
      // 既存のコメントを取得
      const post = posts.find((p) => p.id === postId);
      if (!post) return;

      const newComment = {
        id: `comment_${Date.now()}`,
        text: commentText,
        timestamp: new Date().toISOString(),
        is_ai: false,
        author_name: 'ユーザー',
      };

      const updatedComments = [...post.comments, newComment];

      // Rustコマンドでコメントを更新
      await invoke('update_image_comments', {
        imageId: postId,
        comments: updatedComments,
      });

      // ローカル状態を更新
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, comments: updatedComments } : p
        )
      );
    } catch (error) {
      console.error('コメント追加エラー:', error);
      setError('コメントの追加に失敗しました');
    }
  };

  const handleDeletePost = (postId: string) => {
    setDeleteConfirm({
      isOpen: true,
      postId,
      title: '投稿を削除',
      message: 'この投稿を削除しますか？この操作は取り消せません。',
    });
  };

  const handleDeleteComment = (postId: string, commentId: string) => {
    setDeleteConfirm({
      isOpen: true,
      postId: `${postId}:${commentId}`,
      title: 'コメントを削除',
      message: 'このコメントを削除しますか？この操作は取り消せません。',
    });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.postId) return;

    try {
      if (deleteConfirm.postId.includes(':')) {
        // コメント削除
        const [postId, commentId] = deleteConfirm.postId.split(':');
        await invoke('delete_comment', { postId, commentId });

        // ローカル状態を更新
        setPosts((prev) =>
          prev.map((post) => {
            if (post.id === postId) {
              return {
                ...post,
                comments: post.comments.filter(
                  (comment) => comment.id !== commentId
                ),
              };
            }
            return post;
          })
        );
      } else {
        // 投稿削除
        await invoke('delete_post', { postId: deleteConfirm.postId });

        // Object URLを解放
        const deletedPost = posts.find((p) => p.id === deleteConfirm.postId);
        if (deletedPost?.image_url) {
          URL.revokeObjectURL(deletedPost.image_url);
        }

        // ローカル状態を更新
        setPosts((prev) =>
          prev.filter((post) => post.id !== deleteConfirm.postId)
        );
      }

      setDeleteConfirm({
        isOpen: false,
        postId: null,
        title: '',
        message: '',
      });
    } catch (error) {
      console.error('削除エラー:', error);
      setError('削除に失敗しました');
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm({
      isOpen: false,
      postId: null,
      title: '',
      message: '',
    });
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              タイムラインを読み込み中...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {/* ヘッダー */}
      <header className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Sparkles className="w-8 h-8 text-blue-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            画像分析タイムライン
          </h1>
          {/* WebSocket接続状態インジケーター */}
          {serverUrl && (
            <div className="flex items-center space-x-1 text-xs">
              <div
                className={`w-2 h-2 rounded-full ${apiConnected ? 'bg-green-500' : 'bg-red-500'}`}
              />
              <span className="text-gray-600 dark:text-gray-400">
                {apiConnected ? 'API接続済' : 'API未接続'}
              </span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => loadPosts(true)}
          disabled={refreshing}
          className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <RefreshCw
            className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
          />
          <span>更新</span>
        </button>
      </header>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* 新規投稿作成 */}
      <NewPostComposer onPostCreate={handlePostCreate} />

      {/* タイムライン */}
      <div className="space-y-6">
        {posts.length === 0 ? (
          <div className="text-center py-12">
            <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              まだ投稿がありません
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              最初の画像を分析して投稿してみましょう！
            </p>
          </div>
        ) : (
          posts.map((post) => (
            <TimelinePost
              key={post.id}
              post={post}
              onComment={handleComment}
              onDeletePost={handleDeletePost}
              onDeleteComment={handleDeleteComment}
              analysisState={{
                isAnalyzing: analyzingPosts.has(post.id),
              }}
            />
          ))
        )}
      </div>

      {/* フッター */}
      {posts.length > 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-gray-500">
            {posts.length}件の投稿を表示中
          </p>
        </div>
      )}

      {/* 削除確認ダイアログ */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title={deleteConfirm.title}
        message={deleteConfirm.message}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}
