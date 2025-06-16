import { useState, useRef } from 'react';
import { Loader2, X, Sparkles, Upload } from 'lucide-react';
import { imageAnalysisAgent } from '~/lib/mastra/imageAnalysis';

interface NewPostComposerProps {
  onPostCreate: (
    imageData: number[],
    originalName: string,
    aiAnalysis?: string
  ) => void;
}

export default function NewPostComposer({
  onPostCreate,
}: NewPostComposerProps) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const analyzeAndPost = async () => {
    if (!selectedImage || !imagePreview) return;

    setIsPosting(true);
    setIsAnalyzing(true);

    try {
      // Convert image to Uint8Array
      const response = await fetch(imagePreview);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const imageData = Array.from(new Uint8Array(arrayBuffer));

      // AI分析を実行
      let aiAnalysis: string | undefined;
      try {
        const base64 = imagePreview.split(',')[1];
        aiAnalysis = await imageAnalysisAgent(base64);
      } catch (error) {
        console.error('AI分析エラー:', error);
        aiAnalysis = undefined; // AI分析失敗時はundefinedにして投稿は続行
      }

      setIsAnalyzing(false);

      // 投稿を作成
      await onPostCreate(imageData, selectedImage.name, aiAnalysis);

      // フォームをリセット
      setSelectedImage(null);
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('投稿作成エラー:', error);
    } finally {
      setIsPosting(false);
      setIsAnalyzing(false);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleUploadKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleUploadClick();
    }
  };

  const handleClearKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      clearImage();
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
      {/* 画像アップロードエリア */}
      {!imagePreview ? (
        <button
          type="button"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 m-4 rounded-lg cursor-pointer hover:border-blue-400 transition-colors"
          onClick={handleUploadClick}
          onKeyDown={handleUploadKeyDown}
          tabIndex={0}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              画像をアップロード
            </h3>
            <p className="text-sm text-gray-500">
              ファイルをドラッグ&ドロップするか、クリックして選択
            </p>
            <p className="text-xs text-gray-400 mt-2">
              JPG, PNG, GIF形式に対応
            </p>
          </div>
        </button>
      ) : (
        <div className="p-4">
          <div className="relative rounded-lg overflow-hidden">
            <img
              src={imagePreview}
              alt="プレビュー"
              className="w-full max-h-64 object-cover"
            />
            <button
              type="button"
              onClick={clearImage}
              onKeyDown={handleClearKeyDown}
              className="absolute top-2 right-2 p-1.5 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            {isAnalyzing && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg flex items-center space-x-3">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    AI分析中...
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* アクションボタン */}
      <div className="flex items-center justify-between p-4 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500">
            画像を選択して分析・投稿
          </span>
        </div>

        <button
          type="button"
          onClick={analyzeAndPost}
          disabled={!selectedImage || isPosting || isAnalyzing}
          className="flex items-center space-x-2 px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPosting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>投稿中...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>分析して投稿</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
