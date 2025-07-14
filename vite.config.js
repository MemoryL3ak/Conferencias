import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      // todo lo que empiece con /api/... irá a tu Express en el puerto 3001
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        // opcionally websocket: true si usas sockets
      },
    },
  },
});
