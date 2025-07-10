import { useCallback, useEffect, useRef } from 'react';
import { type Socket, io } from 'socket.io-client';

interface NetworkSyncOptions {
  serverUrl: string; // e.g., "http://192.168.1.100:3000"
  onNewImages: (images: any[]) => void;
  enabled?: boolean; // 同期の有効/無効
}

export function useNetworkSync(options: NetworkSyncOptions) {
  const { serverUrl, onNewImages, enabled = true } = options;
  const socketRef = useRef<Socket | null>(null);
  const isConnectedRef = useRef(false);

  // デバッグログ
  console.log('useNetworkSync初期化:', {
    serverUrl,
    enabled,
    hasOnNewImages: !!onNewImages,
  });

  const downloadImage = useCallback(
    async (filename: string): Promise<Uint8Array> => {
      const response = await fetch(`${serverUrl}/api/images/${filename}`);
      if (!response.ok) {
        throw new Error(`画像ダウンロード失敗: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    },
    [serverUrl]
  );

  const saveImageWithMetadata = useCallback(
    async (filename: string, imageData: Uint8Array, metadata: any) => {
      try {
        const { invoke } = await import('@tauri-apps/api/core');

        // 画像データとメタデータを同時に保存
        await invoke('save_network_image_with_metadata', {
          filename,
          imageData: Array.from(imageData),
          imageMetadata: JSON.stringify(metadata),
        });

        console.log(
          `ネットワーク画像+メタデータをローカル保存完了: ${filename}`
        );
      } catch (error) {
        console.error(`ローカル保存エラー (${filename}):`, error);
        throw error;
      }
    },
    []
  );

  const handleNewImage = useCallback(
    async (imageData: any) => {
      try {
        console.log('WebSocket: 新しい画像イベントを受信');
        console.log(`WebSocket: 新しい画像を受信 ${imageData.filename}`);

        // 画像をダウンロードしてローカルに保存
        const imageBuffer = await downloadImage(imageData.filename);
        await saveImageWithMetadata(imageData.filename, imageBuffer, imageData);

        console.log(`WebSocket: 画像同期完了 ${imageData.filename}`);

        // 保存完了後にUIに通知
        onNewImages([imageData]);
      } catch (error) {
        console.error(
          `WebSocket: 画像同期エラー (${imageData.filename}):`,
          error
        );
      }
    },
    [downloadImage, saveImageWithMetadata, onNewImages]
  );

  const connectWebSocket = useCallback(() => {
    console.log('connectWebSocket呼び出し:', {
      hasSocket: !!socketRef.current,
      enabled,
      serverUrl,
    });

    if (socketRef.current) {
      console.log('既存のSocket接続があるためスキップ');
      return;
    }

    if (!enabled) {
      console.log('WebSocket同期が無効のためスキップ');
      return;
    }

    if (!serverUrl) {
      console.log('サーバーURLが空のためスキップ');
      return;
    }

    console.log(`WebSocket接続開始: ${serverUrl}`);

    const socket = io(serverUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Number.POSITIVE_INFINITY,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      console.log('✅ WebSocket接続成功:', {
        id: socket.id,
        connected: socket.connected,
        serverUrl,
        transport: socket.io.engine.transport.name,
      });
      isConnectedRef.current = true;
    });

    socket.on('new_image', (data) => {
      console.log('📸 WebSocket: new_imageイベントを受信');
      console.log('受信データ:', data);
      handleNewImage(data);
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`WebSocket再接続試行 #${attemptNumber}`);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log(`WebSocket再接続成功 (試行 #${attemptNumber})`);
    });

    socketRef.current = socket;
  }, [serverUrl, enabled, handleNewImage]);

  const disconnectWebSocket = useCallback(() => {
    if (socketRef.current) {
      console.log('WebSocket切断');
      socketRef.current.disconnect();
      socketRef.current = null;
      isConnectedRef.current = false;
    }
  }, []);

  useEffect(() => {
    console.log('useNetworkSync useEffect実行:', {
      enabled,
      serverUrl,
      shouldConnect: enabled && serverUrl,
    });

    if (enabled && serverUrl) {
      connectWebSocket();
    } else {
      disconnectWebSocket();
    }

    return () => {
      console.log('useNetworkSync cleanup実行');
      disconnectWebSocket();
    };
  }, [enabled, serverUrl, connectWebSocket, disconnectWebSocket]);

  const reconnect = useCallback(() => {
    console.log('🔄 手動再接続を開始');
    disconnectWebSocket();
    setTimeout(() => {
      connectWebSocket();
    }, 1000);
  }, [disconnectWebSocket, connectWebSocket]);

  return {
    startSync: connectWebSocket,
    stopSync: disconnectWebSocket,
    reconnect,
    isEnabled: enabled,
    isConnected: isConnectedRef.current,
  };
}
