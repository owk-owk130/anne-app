import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const host = process.env.TAURI_DEV_HOST;
const isDev = process.env.NODE_ENV !== 'production';

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  // Path alias configuration
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './src'),
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    // 開発時はlocalhostを使用、本番時はネットワークアクセス可能にする
    host: host || (isDev ? 'localhost' : '0.0.0.0'),
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ['**/src-tauri/**'],
    },
  },
}));
