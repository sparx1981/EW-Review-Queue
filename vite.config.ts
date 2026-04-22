import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api/sketchup': {
          target: 'https://extensions.sketchup.com/api',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/sketchup/, ''),
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              const customCookie = req.headers['x-session-cookie'] || req.headers['x-sketchup-cookie'];
              if (customCookie) {
                proxyReq.setHeader('Cookie', String(customCookie));
              }
              proxyReq.setHeader('Accept', 'application/json');
              proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (compatible; EW-Review-Dashboard/1.0)');
            });
          },
        },
      },
    },
  };
});
