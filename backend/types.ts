import type { Request } from "express";

// Upload API types - Multer adds file property to Request
export interface UploadRequest extends Request {
  file?: Express.Multer.File;
}

export interface UploadResponse {
  status: "success" | "error";
  id?: string;
  analysis?: string;
  message?: string;
}

// Health API types
export interface HealthResponse {
  status: "ok";
  uptime: number;
  timestamp: string;
}

// Info API types
export interface InfoResponse {
  server: string;
  network: {
    interfaces: Array<{
      name: string;
      address: string;
    }>;
  };
  endpoints: string[];
}

// Tauri compatible image metadata
export interface ImageMetadata {
  id: string;
  filename: string;
  original_name: string;
  timestamp: string;
  analysis_result?: string;
  user_comments: Array<{
    id: string;
    text: string;
    timestamp: string;
    is_ai: boolean;
    author_name?: string;
  }>;
}

export interface ImagesData {
  images: ImageMetadata[];
}
