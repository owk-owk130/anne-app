import express from "express";
import cors from "cors";
import multer from "multer";
import { networkInterfaces } from "node:os";
import type {
  UploadRequest,
  UploadResponse,
  HealthResponse,
  InfoResponse
} from "./types";
import { addImageMetadata, analyzeImage } from "./utils";

const app = express();

// 環境変数から設定を取得
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

// CORS設定
app.use(
  cors({
    origin: true, // 開発環境では全オリジン許可
    credentials: true
  })
);

// JSON解析
app.use(express.json({ limit: "50mb" }));

// multer設定 (メモリストレージ)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB制限
  },
  fileFilter: (_req, file, cb) => {
    // 画像ファイルのみ許可
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("画像ファイルのみアップロード可能です"));
    }
  }
});

// ネットワークインターフェース情報を取得
function getNetworkInterfaces() {
  const interfaces = networkInterfaces();
  const addresses: Array<{ name: string; address: string }> = [];

  for (const [name, nets] of Object.entries(interfaces)) {
    if (nets) {
      for (const net of nets) {
        // IPv4でプライベートアドレスのみ
        if (net.family === "IPv4" && !net.internal) {
          addresses.push({ name, address: net.address });
        }
      }
    }
  }

  return addresses;
}

// サーバー起動時にネットワーク情報を表示
function displayNetworkInfo() {
  const interfaces = getNetworkInterfaces();
  console.log("\n🚀 Anne App Backend Server Started");
  console.log("=====================================");
  console.log(`📡 Local:   http://localhost:${PORT}`);

  if (interfaces.length > 0) {
    console.log("🌐 Network access URLs:");
    interfaces.forEach(({ name, address }) => {
      console.log(`   http://${address}:${PORT} (${name})`);
    });
  }

  console.log("\n📋 Available endpoints:");
  console.log("   GET  /api/health  - ヘルスチェック");
  console.log("   GET  /api/info    - サーバー情報");
  console.log("   POST /api/upload  - 画像アップロード");
  console.log("=====================================\n");
}

// API エンドポイント

// ヘルスチェック
app.get("/api/health", (_req, res) => {
  const response: HealthResponse = {
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  };
  res.json(response);
});

// サーバー情報
app.get("/api/info", (_req, res) => {
  const response: InfoResponse = {
    server: "Anne App Backend",
    network: {
      interfaces: getNetworkInterfaces()
    },
    endpoints: ["GET /api/health", "GET /api/info", "POST /api/upload"]
  };
  res.json(response);
});

// 画像アップロード
app.post(
  "/api/upload",
  upload.single("image"),
  async (req: UploadRequest, res) => {
    try {
      // アップロードされたファイルをチェック
      if (!req.file) {
        const errorResponse: UploadResponse = {
          status: "error",
          message: "画像ファイルが提供されていません"
        };
        res.status(400).json(errorResponse);
        return;
      }

      const { buffer, originalname } = req.file;

      console.log(
        `画像アップロード開始: ${originalname} (${buffer.length} bytes)`
      );

      // AI分析を実行
      let analysisResult: string | undefined;
      try {
        analysisResult = await analyzeImage(buffer);
        console.log("AI分析完了:", analysisResult ? "成功" : "失敗");
      } catch (error) {
        console.error("AI分析エラー:", error);
        // AI分析が失敗しても画像保存は続行
      }

      // Tauriアプリと同じ形式でデータを保存
      const imageId = addImageMetadata(originalname, buffer, analysisResult);

      console.log(`画像保存完了: ID=${imageId}`);

      // 成功レスポンス
      const successResponse: UploadResponse = {
        status: "success",
        id: imageId,
        analysis: analysisResult
      };

      res.json(successResponse);
    } catch (error) {
      console.error("画像アップロードエラー:", error);

      const errorResponse: UploadResponse = {
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "画像アップロードに失敗しました"
      };

      res.status(500).json(errorResponse);
    }
  }
);

// エラーハンドリング
app.use((error: any, _req: any, res: any, _next: any) => {
  console.error("サーバーエラー:", error);

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        status: "error",
        message: "ファイルサイズが大きすぎます (最大10MB)"
      });
    }
  }

  res.status(500).json({
    status: "error",
    message: "サーバー内部エラーが発生しました"
  });
});

app.listen(PORT, HOST, () => {
  displayNetworkInfo();
});
