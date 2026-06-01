import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifestFilename: 'mypayindia.webmanifest',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2}']
      },
      manifest: {
        name: 'MyPayIndia PWA',
        short_name: 'MyPayIndia',
        description: 'The official progressive web app for MyPayIndia',
        theme_color: '#d03505',
        background_color: '#000000',
        display: 'standalone',
        start_url: '/dash',
        id: 'com.exerinity.mypayindia',
        icons: [{ src: '/i/mygayindia.png', sizes: '64x64', type: 'image/png', purpose: 'any maskable' }]
      }
    })
  ],
  build: {
    minify: 'esbuild',
    sourcemap: false,
    target: 'esnext',
    rollupOptions: {
      output: {
        entryFileNames: 'mypwaindia.js',
        chunkFileNames: '[name]-[hash].js',
        assetFileNames: '[name]-[hash].[ext]',
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom']
        }
      }
    }
  }
});