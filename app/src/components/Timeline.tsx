import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { RefreshCw, Sparkles } from "lucide-react";
import TimelinePost from "./TimelinePost";
import NewPostComposer from "./NewPostComposer";
import ConfirmDialog from "./ConfirmDialog";
import type { Post } from "~/types/posts";

export default function Timeline() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    postId: string | null;
    title: string;
    message: string;
  }>({
    isOpen: false,
    postId: null,
    title: "",
    message: ""
  });

  const loadPosts = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);

    setError(null);

    try {
      // invoke関数の利用可能性を確認
      if (typeof invoke === "undefined") {
        console.error("invoke関数が利用できません");
        throw new Error("Tauri APIが利用できません");
      }

      // 既存の画像メタデータを取得してPostsに変換
      const savedImages = await invoke<any[]>("get_saved_images");

      const convertedPosts: Post[] = savedImages.map((image) => ({
        id: image.id,
        timestamp: image.timestamp,
        original_name: image.original_name,
        filename: image.filename,
        ai_analysis: image.analysis_result,
        comments: image.user_comments || [],
        likes: 0, // 今回は簡単のため0で初期化
        author_name: "ユーザー",
        image_url: undefined // 後で画像を読み込み
      }));

      // 画像データを読み込んでURLを設定
      const postsWithImages = await Promise.all(
        convertedPosts.map(async (post) => {
          try {
            const imageBytes = await invoke<number[]>("load_image", {
              imageId: post.id
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
      console.error("投稿読み込みエラー:", err);
      setError("投稿の読み込みに失敗しました");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

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
      // Tauri環境のデバッグログ
      console.log("Tauri環境チェック:", {
        windowDefined: typeof window !== "undefined",
        tauriObject: (window as any).__TAURI__,
        invokeFunction: typeof invoke,
        userAgent: navigator.userAgent
      });

      // より柔軟なTauri環境チェック
      if (typeof invoke === "undefined") {
        throw new Error(
          "Tauri invoke関数が利用できません。ブラウザで実行されている可能性があります。"
        );
      }

      const postId = await invoke<string>("save_image", {
        imageData,
        originalName,
        analysisResult: aiAnalysis
      });

      console.log("新しい投稿が作成されました:", postId);

      // タイムラインを更新
      await loadPosts();
    } catch (error) {
      console.error("投稿作成エラー:", error);
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
        author_name: "ユーザー"
      };

      const updatedComments = [...post.comments, newComment];

      // Rustコマンドでコメントを更新
      await invoke("update_image_comments", {
        imageId: postId,
        comments: updatedComments
      });

      // ローカル状態を更新
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, comments: updatedComments } : p
        )
      );
    } catch (error) {
      console.error("コメント追加エラー:", error);
      setError("コメントの追加に失敗しました");
    }
  };

  const handleDeletePost = (postId: string) => {
    setDeleteConfirm({
      isOpen: true,
      postId,
      title: "投稿を削除",
      message: "この投稿を削除しますか？この操作は取り消せません。"
    });
  };

  const handleDeleteComment = (postId: string, commentId: string) => {
    setDeleteConfirm({
      isOpen: true,
      postId: `${postId}:${commentId}`,
      title: "コメントを削除",
      message: "このコメントを削除しますか？この操作は取り消せません。"
    });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.postId) return;

    try {
      if (deleteConfirm.postId.includes(":")) {
        // コメント削除
        const [postId, commentId] = deleteConfirm.postId.split(":");
        await invoke("delete_comment", { postId, commentId });

        // ローカル状態を更新
        setPosts((prev) =>
          prev.map((post) => {
            if (post.id === postId) {
              return {
                ...post,
                comments: post.comments.filter(
                  (comment) => comment.id !== commentId
                )
              };
            }
            return post;
          })
        );
      } else {
        // 投稿削除
        await invoke("delete_post", { postId: deleteConfirm.postId });

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
        title: "",
        message: ""
      });
    } catch (error) {
      console.error("削除エラー:", error);
      setError("削除に失敗しました");
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm({
      isOpen: false,
      postId: null,
      title: "",
      message: ""
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
        </div>
        <button
          type="button"
          onClick={() => loadPosts(true)}
          disabled={refreshing}
          className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <RefreshCw
            className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
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
