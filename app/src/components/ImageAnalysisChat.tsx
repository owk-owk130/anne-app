import {
  Image as ImageIcon,
  Loader2,
  MessageSquare,
  Upload,
  X
} from "lucide-react";
import { useState } from "react";
import { imageAnalysisAgent } from "~/lib/mastra/imageAnalysis";

interface Comment {
  id: string;
  text: string;
  timestamp: Date;
  isAI: boolean;
}

export default function ImageAnalysisChat() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [userComment, setUserComment] = useState("");

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
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

  const analyzeImage = async () => {
    if (!selectedImage || !imagePreview) return;

    setIsAnalyzing(true);
    try {
      // Convert image to base64
      const base64 = imagePreview.split(",")[1];

      const text = await imageAnalysisAgent(base64);

      const newComment: Comment = {
        id: Date.now().toString(),
        text,
        timestamp: new Date(),
        isAI: true
      };

      setComments((prev) => [...prev, newComment]);
    } catch (error) {
      console.error("画像分析エラー:", error);
      const errorComment: Comment = {
        id: Date.now().toString(),
        text: "すみません、画像の分析中にエラーが発生しました。APIキーが正しく設定されているか確認してください。",
        timestamp: new Date(),
        isAI: true
      };
      setComments((prev) => [...prev, errorComment]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const addUserComment = () => {
    if (!userComment.trim()) return;

    const newComment: Comment = {
      id: Date.now().toString(),
      text: userComment,
      timestamp: new Date(),
      isAI: false
    };

    setComments((prev) => [...prev, newComment]);
    setUserComment("");
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setComments([]);
  };

  console.log("ImageAnalysisChat rendered");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-white">
          Mastra AI画像解析コメント
        </h1>

        {/* Image Upload Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          {!imagePreview ? (
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className="cursor-pointer flex flex-col items-center space-y-4"
              >
                <Upload className="h-12 w-12 text-gray-400" />
                <span className="text-lg font-medium text-gray-600 dark:text-gray-300">
                  画像をアップロードしてください
                </span>
                <span className="text-sm text-gray-500">
                  JPG, PNG, GIF形式に対応
                </span>
              </label>
            </div>
          ) : (
            <div className="relative">
              <img
                src={imagePreview}
                alt="アップロード画像"
                className="w-full max-h-96 object-contain rounded-lg"
              />
              <button
                type="button"
                onClick={clearImage}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={analyzeImage}
                disabled={isAnalyzing}
                className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>分析中...</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-4 w-4" />
                    <span>Mastra AIで画像を分析</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Comments Section */}
        {(comments.length > 0 || imagePreview) && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>コメント</span>
            </h2>

            {/* Comments List */}
            <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className={`p-4 rounded-lg ${
                    comment.isAI
                      ? "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500"
                      : "bg-gray-50 dark:bg-gray-700 border-l-4 border-green-500"
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <span
                      className={`text-sm font-medium ${
                        comment.isAI
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-green-600 dark:text-green-400"
                      }`}
                    >
                      {comment.isAI ? "Mastra AI分析" : "あなた"}
                    </span>
                    <span className="text-xs text-gray-500">
                      {comment.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                    {comment.text}
                  </p>
                </div>
              ))}
            </div>

            {/* User Comment Input */}
            {imagePreview && (
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={userComment}
                  onChange={(e) => setUserComment(e.target.value)}
                  placeholder="コメントを入力..."
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  onKeyPress={(e) => e.key === "Enter" && addUserComment()}
                />
                <button
                  type="button"
                  onClick={addUserComment}
                  disabled={!userComment.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  送信
                </button>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        {!imagePreview && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-6">
            <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
              使い方
            </h3>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• 画像をアップロードしてください</li>
              <li>
                • Mastra AIエージェントが画像を詳細に分析してコメントします
              </li>
              <li>• あなたも自由にコメントを追加できます</li>
              <li>
                • Gemini AIとMastraフレームワークが高精度な画像解析を提供します
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
