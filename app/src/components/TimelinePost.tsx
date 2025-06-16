import { useState, useEffect, useRef } from 'react';
import { MoreHorizontal, Bot, User, Send, Clock, Trash2 } from 'lucide-react';
import type { Post, Comment } from '~/types/posts';

interface TimelinePostProps {
  post: Post;
  onComment: (postId: string, comment: string) => void;
  onDeletePost: (postId: string) => void;
  onDeleteComment: (postId: string, commentId: string) => void;
}

export default function TimelinePost({
  post,
  onComment,
  onDeletePost,
  onDeleteComment,
}: TimelinePostProps) {
  const [newComment, setNewComment] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 外部クリックでドロップダウンを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const postTime = new Date(timestamp);
    const diffMs = now.getTime() - postTime.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return '今';
    if (diffMins < 60) return `${diffMins}分前`;
    if (diffHours < 24) return `${diffHours}時間前`;
    if (diffDays < 7) return `${diffDays}日前`;

    return postTime.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
    });
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    onComment(post.id, newComment.trim());
    setNewComment('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddComment();
    }
  };

  // AI分析とユーザーコメントを統合して時系列順にソート
  const allComments: Comment[] = [];

  if (post.ai_analysis) {
    allComments.push({
      id: 'ai_analysis',
      text: post.ai_analysis,
      timestamp: post.timestamp,
      is_ai: true,
    });
  }

  allComments.push(...post.comments);
  allComments.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return (
    <article className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:shadow-lg transition-shadow duration-200">
      {/* ヘッダー */}
      <header className="flex items-center justify-between p-4 pb-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
            {post.author_name ? post.author_name[0].toUpperCase() : 'U'}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {post.author_name || 'ユーザー'}
            </h3>
            <div className="flex items-center space-x-1 text-sm text-gray-500">
              <Clock className="w-3 h-3" />
              <time>{formatTimeAgo(post.timestamp)}</time>
            </div>
          </div>
        </div>
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <MoreHorizontal className="w-4 h-4 text-gray-500" />
          </button>

          {showDropdown && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-10">
              <button
                type="button"
                onClick={() => {
                  onDeletePost(post.id);
                  setShowDropdown(false);
                }}
                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>投稿を削除</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* 画像 */}
      {post.image_url && (
        <div className="relative">
          <img
            src={post.image_url}
            alt={post.original_name}
            className="w-full max-h-96 object-cover"
          />
        </div>
      )}

      {/* コメントセクション - 常時表示 */}
      <div className="px-4 pb-4">
        <div className="mt-3 space-y-3">
          {allComments.map((comment) => (
            <div key={comment.id} className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                {comment.is_ai ? (
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                ) : (
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {comment.is_ai ? 'AI分析' : comment.author_name || 'あなた'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatTimeAgo(comment.timestamp)}
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap">
                  {comment.text}
                </p>
              </div>

              {/* コメント削除ボタン（ユーザーコメントのみ） */}
              {!comment.is_ai && (
                <button
                  type="button"
                  onClick={() => onDeleteComment(post.id, comment.id)}
                  className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                  title="コメントを削除"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* 新しいコメント入力 */}
        <div className="mt-4 flex items-center space-x-3">
          <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
            U
          </div>
          <div className="flex-1 flex items-center space-x-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="コメントを追加..."
              className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
            />
            <button
              type="button"
              onClick={handleAddComment}
              disabled={!newComment.trim()}
              className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
