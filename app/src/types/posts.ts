export interface Comment {
  id: string;
  text: string;
  timestamp: string;
  is_ai: boolean;
  author_name?: string;
}

export interface Post {
  id: string;
  timestamp: string;
  original_name: string;
  filename: string;
  image_url?: string; // フロントエンド用の画像URL
  ai_analysis?: string;
  comments: Comment[];
  likes: number;
  tags?: string[];
  author_name: string;
  author_avatar?: string;
}

export interface PostCreateData {
  image_data: number[];
  original_name: string;
  ai_analysis?: string;
  author_name?: string;
}

export interface PostsData {
  posts: Post[];
}
