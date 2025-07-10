import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { join } from 'node:path';
import cors from 'cors';
import express, {
  type Request,
  type Response,
  type ErrorRequestHandler,
} from 'express';
import multer from 'multer';
import { Server } from 'socket.io';
import type {
  HealthResponse,
  InfoResponse,
  UploadRequest,
  UploadResponse,
} from './types';
import { addImageMetadata, getImagesDir, loadMetadata } from './utils';

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: { origin: true, methods: ['GET', 'POST'] },
});

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '100mb' }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('画像ファイルのみアップロード可能です'));
    }
  },
});

function getNetworkInterfaces() {
  const interfaces = networkInterfaces();
  const addresses: Array<{ name: string; address: string }> = [];

  for (const [name, nets] of Object.entries(interfaces)) {
    if (nets) {
      for (const net of nets) {
        if (net.family === 'IPv4' && !net.internal) {
          addresses.push({ name, address: net.address });
        }
      }
    }
  }

  return addresses;
}

function displayNetworkInfo() {
  const interfaces = getNetworkInterfaces();
  console.log('\n\u{1F680} Anne App Backend Server Started');
  console.log('=====================================');
  console.log(`\u{1F4E1} Local:   http://localhost:${PORT}`);
  if (interfaces.length > 0) {
    console.log('\u{1F310} Network access URLs:');
    for (const { name, address } of interfaces) {
      console.log(`   http://${address}:${PORT} (${name})`);
    }
  }
  console.log('\n\u{1F4CB} Available endpoints:');
  console.log('   GET  /api/health');
  console.log('   GET  /api/info');
  console.log('   POST /api/upload');
  console.log('   GET  /api/metadata');
  console.log('   GET  /api/images/:filename');
  console.log('\n\u{1F50C} WebSocket connection:');
  console.log('   ws://localhost:3000 または ws://[IP]:3000');
  console.log('   Events: new_image - 新しい画像の通知');
  console.log('=====================================\n');
}

app.get('/api/health', (_req: Request, res: Response<HealthResponse>) => {
  const response: HealthResponse = {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };
  res.json(response);
});

app.get('/api/info', (_req: Request, res: Response<InfoResponse>) => {
  const response: InfoResponse = {
    server: 'Anne App Backend',
    network: { interfaces: getNetworkInterfaces() },
    endpoints: [
      'GET /api/health',
      'GET /api/info',
      'POST /api/upload',
      'GET /api/metadata',
      'GET /api/images/:filename',
    ],
  };
  res.json(response);
});

app.get('/api/metadata', (_req: Request, res: Response) => {
  try {
    const metadata = loadMetadata();
    res.json(metadata);
  } catch (error) {
    console.error('メタデータ読み込みエラー:', error);
    res.status(500).json({
      status: 'error',
      message: 'メタデータの読み込みに失敗しました',
    });
  }
});

app.get(
  '/api/metadata/since/:timestamp',
  (req: Request<{ timestamp: string }>, res: Response): void => {
    try {
      const timestamp = req.params.timestamp;
      const sinceTime = new Date(timestamp);
      if (Number.isNaN(sinceTime.getTime())) {
        res
          .status(400)
          .json({ status: 'error', message: '無効なタイムスタンプ形式です' });
        return;
      }
      const metadata = loadMetadata();
      const newImages = metadata.images.filter(
        (image) => new Date(image.timestamp) > sinceTime
      );
      res.json({
        status: 'success',
        since: timestamp,
        new_images: newImages,
        count: newImages.length,
      });
      console.log(
        `新着チェック: ${timestamp} 以降の画像 ${newImages.length} 件`
      );
    } catch (error) {
      console.error('新着チェックエラー:', error);
      res
        .status(500)
        .json({ status: 'error', message: '新着チェックに失敗しました' });
    }
  }
);

app.get(
  '/api/images/:filename',
  (req: Request<{ filename: string }>, res: Response): void => {
    try {
      const { filename } = req.params;
      if (
        !filename ||
        filename.includes('..') ||
        filename.includes('/') ||
        filename.includes('\\')
      ) {
        res
          .status(400)
          .json({ status: 'error', message: '無効なファイル名です' });
        return;
      }
      const imagePath = join(getImagesDir(), filename);
      if (!existsSync(imagePath)) {
        res
          .status(404)
          .json({ status: 'error', message: '画像ファイルが見つかりません' });
        return;
      }
      const ext = filename.toLowerCase().split('.').pop();
      let contentType = 'application/octet-stream';
      switch (ext) {
        case 'jpg':
        case 'jpeg':
          contentType = 'image/jpeg';
          break;
        case 'png':
          contentType = 'image/png';
          break;
        case 'gif':
          contentType = 'image/gif';
          break;
        case 'webp':
          contentType = 'image/webp';
          break;
      }
      const imageBuffer = readFileSync(imagePath);
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', imageBuffer.length);
      res.send(imageBuffer);
      console.log(`画像配信完了: ${filename} (${imageBuffer.length} bytes)`);
    } catch (error) {
      console.error('画像配信エラー:', error);
      res
        .status(500)
        .json({ status: 'error', message: '画像の配信に失敗しました' });
    }
  }
);

app.post(
  '/api/upload',
  upload.single('image'),
  async (req: UploadRequest, res: Response<UploadResponse>) => {
    try {
      if (!req.file) {
        res.status(400).json({
          status: 'error',
          message: '画像ファイルが提供されていません',
        });
        return;
      }
      const { buffer, originalname } = req.file;
      console.log(
        `画像アップロード開始: ${originalname} (${buffer.length} bytes)`
      );
      const imageId = addImageMetadata(originalname, buffer);
      console.log(`画像保存完了: ID=${imageId} (AI分析はTauri側で実行)`);
      const metadata = loadMetadata();
      const newImage = metadata.images.find((img) => img.id === imageId);
      if (newImage) {
        io.emit('new_image', newImage);
        console.log(`WebSocket通知送信: 新しい画像 ${imageId}`);
      }
      res.json({ status: 'success', id: imageId });
    } catch (error) {
      console.error('画像アップロードエラー:', error);
      res.status(500).json({
        status: 'error',
        message:
          error instanceof Error
            ? error.message
            : '画像アップロードに失敗しました',
      });
    }
  }
);

app.use(((error, _req, res, _next) => {
  console.error('サーバーエラー:', error);
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    res.status(400).json({
      status: 'error',
      message: 'ファイルサイズが大きすぎます (最大100MB)',
    });
    return;
  }
  res.status(500).json({
    status: 'error',
    message: 'サーバー内部エラーが発生しました',
  });
}) as ErrorRequestHandler);

io.on('connection', (socket) => {
  console.log(`クライアント接続: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`クライアント切断: ${socket.id}`);
  });
});

server.listen(PORT, HOST, () => {
  displayNetworkInfo();
});
