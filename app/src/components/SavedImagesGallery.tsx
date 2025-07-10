import { invoke } from '@tauri-apps/api/core';
import { Calendar, ImageIcon, MessageSquare } from 'lucide-react';
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

interface SavedImagesGalleryProps {
  onImageSelect: (imageId: string, metadata: ImageMetadata) => void;
}

export default function SavedImagesGallery({
  onImageSelect,
}: SavedImagesGalleryProps) {
  const [savedImages, setSavedImages] = useState<ImageMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSavedImages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const images = await invoke<ImageMetadata[]>('get_saved_images');
      setSavedImages(images.reverse()); // 新しい順に表示
    } catch (err) {
      console.error('保存済み画像の読み込みエラー:', err);
      setError('保存済み画像の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSavedImages();
  }, [loadSavedImages]);

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

  const handleImageClick = (imageId: string, metadata: ImageMetadata) => {
    onImageSelect(imageId, metadata);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center space-x-2">
          <ImageIcon className="h-5 w-5" />
          <span>保存済み画像</span>
        </h2>
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center space-x-2">
          <ImageIcon className="h-5 w-5" />
          <span>保存済み画像</span>
        </h2>
        <div className="text-red-500 text-center py-8">{error}</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
          <ImageIcon className="h-5 w-5" />
          <span>保存済み画像</span>
        </h2>
        <span className="text-sm text-gray-500">{savedImages.length}枚</span>
      </div>

      {savedImages.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>保存された画像がありません</p>
          <p className="text-sm mt-2">
            画像を分析して保存ボタンを押してください
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {savedImages.map((image) => (
            <button
              type="button"
              key={image.id}
              onClick={() => handleImageClick(image.id, image)}
              className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-gray-500" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {image.original_name}
                  </h3>

                  <div className="flex items-center space-x-2 mt-1 text-xs text-gray-500">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(image.timestamp)}</span>
                  </div>

                  <div className="flex items-center space-x-2 mt-1">
                    {image.analysis_result && (
                      <div className="flex items-center space-x-1 text-xs text-blue-600 dark:text-blue-400">
                        <MessageSquare className="h-3 w-3" />
                        <span>AI分析済み</span>
                      </div>
                    )}
                    {image.user_comments.length > 0 && (
                      <div className="flex items-center space-x-1 text-xs text-green-600 dark:text-green-400">
                        <MessageSquare className="h-3 w-3" />
                        <span>{image.user_comments.length}件のコメント</span>
                      </div>
                    )}
                  </div>

                  {image.analysis_result && (
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">
                      {image.analysis_result.substring(0, 100)}...
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={loadSavedImages}
        className="w-full mt-4 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
      >
        更新
      </button>
    </div>
  );
}
