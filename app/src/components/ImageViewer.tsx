import { invoke } from '@tauri-apps/api/core';
import {
  Bot,
  Calendar,
  Image as ImageIcon,
  MessageSquare,
  Send,
  User,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface Comment {
  id: string;
  text: string;
  timestamp: string;
  is_ai: boolean;
}

interface ImageMetadata {
  id: string;
  filename: string;
  original_name: string;
  timestamp: string;
  analysis_result?: string;
  user_comments: Comment[];
}

interface ImageViewerProps {
  imageId: string;
  metadata: ImageMetadata;
  onClose: () => void;
}

export default function ImageViewer({
  imageId,
  metadata,
  onClose,
}: ImageViewerProps) {
  const [imageData, setImageData] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>(metadata.user_comments);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadImage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const imageBytes = await invoke<number[]>('load_image', { imageId });
      const uint8Array = new Uint8Array(imageBytes);
      const blob = new Blob([uint8Array]);
      const imageUrl = URL.createObjectURL(blob);
      setImageData(imageUrl);
    } catch (err) {
      console.error('画像読み込みエラー:', err);
      setError('画像の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, [imageId]);

  useEffect(() => {
    loadImage();
  }, [loadImage]);

  const saveComments = async (updatedComments: Comment[]) => {
    setSaving(true);
    try {
      await invoke('update_image_comments', {
        imageId,
        comments: updatedComments,
      });
      setComments(updatedComments);
    } catch (err) {
      console.error('コメント保存エラー:', err);
      setError('コメントの保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const addComment = () => {
    if (!newComment.trim()) return;

    const comment: Comment = {
      id: `comment_${Date.now()}`,
      text: newComment.trim(),
      timestamp: new Date().toISOString(),
      is_ai: false,
    };

    const updatedComments = [...comments, comment];
    saveComments(updatedComments);
    setNewComment('');
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 全コメント（AI分析結果 + ユーザーコメント）を時系列順に並べる
  const allComments = [];

  // AI分析結果をコメントとして追加
  if (metadata.analysis_result) {
    allComments.push({
      id: 'ai_analysis',
      text: metadata.analysis_result,
      timestamp: metadata.timestamp,
      is_ai: true,
    });
  }

  // ユーザーコメントを追加
  allComments.push(...comments);

  // 時系列順にソート
  allComments.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center space-x-3">
            <ImageIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {metadata.original_name}
              </h2>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(metadata.timestamp)}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="flex h-[calc(90vh-80px)]">
          {/* 画像表示エリア */}
          <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
            {loading ? (
              <div className="text-gray-500">画像を読み込み中...</div>
            ) : error ? (
              <div className="text-red-500">{error}</div>
            ) : imageData ? (
              <img
                src={imageData}
                alt={metadata.original_name}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            ) : null}
          </div>

          {/* コメントエリア */}
          <div className="w-80 border-l border-gray-200 dark:border-gray-600 flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-600">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                <MessageSquare className="h-4 w-4" />
                <span>コメント</span>
              </h3>
            </div>

            {/* コメント一覧 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {allComments.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>コメントがありません</p>
                </div>
              ) : (
                allComments.map((comment) => (
                  <div key={comment.id} className="space-y-2">
                    <div className="flex items-center space-x-2">
                      {comment.is_ai ? (
                        <Bot className="h-4 w-4 text-blue-500" />
                      ) : (
                        <User className="h-4 w-4 text-green-500" />
                      )}
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {comment.is_ai ? 'AI分析' : 'あなた'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(comment.timestamp)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-300 ml-6 whitespace-pre-wrap">
                      {comment.text}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 新しいコメント入力 */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-600">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="コメントを追加..."
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      addComment();
                    }
                  }}
                  disabled={saving}
                />
                <button
                  type="button"
                  onClick={addComment}
                  disabled={!newComment.trim() || saving}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
