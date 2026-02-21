import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: process.env.VITE_API_URL || 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
        },
      }
    },
    plugins: [tailwindcss(), react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      sourcemap: false,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
      rollupOptions: {
        output: {
          // manualChunks: {
          //   vendor: ['react', 'react-dom', 'react-router-dom'],
          //   leaflet: ['leaflet', 'react-leaflet'],
          //   charts: ['recharts'],
          //   utils: ['html2canvas', 'jspdf', 'qrcode.react', 'socket.io-client', 'i18next', 'react-i18next'],
          //   ui: ['lucide-react']
          // }
        }
      }
    }
  };
});
