/**
 * API URL設定ユーティリティ
 * 環境変数から読み込むシンプルな実装
 */

// 環境に応じたAPI URLを取得
export const getApiUrl = (): string => {
  // 環境変数が設定されている場合はそれを使用
  const envApiUrl = import.meta.env.VITE_API_URL;
  if (envApiUrl) {
    return envApiUrl;
  }

  // デフォルトはlocalhost
  return 'http://localhost:3000';
};

// API エンドポイント生成
export const getApiEndpoint = (path: string): string => {
  const baseUrl = getApiUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
};

// 後方互換性のため、非同期版も同じ値を返す
export const getApiUrlAsync = async (): Promise<string> => {
  return getApiUrl();
};

// 後方互換性のため、非同期版も提供
export const getApiEndpointAsync = async (path: string): Promise<string> => {
  return getApiEndpoint(path);
};

// ヘルスチェック用関数（シンプル版）
export const checkApiConnection = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${getApiUrl()}/api/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.ok;
  } catch {
    return false;
  }
};

// 後方互換性のため残す（何もしない）
export const setManualApiUrl = (_url: string): void => {
  console.warn(
    'setManualApiUrl is deprecated. Please use VITE_API_URL environment variable instead.'
  );
};

// 後方互換性のため残す（何もしない）
export const clearApiUrl = (): void => {
  console.warn(
    'clearApiUrl is deprecated. Please use VITE_API_URL environment variable instead.'
  );
};
