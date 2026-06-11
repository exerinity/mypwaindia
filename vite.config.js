import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      manifestFilename: 'mypayindia.webmanifest',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,ico}']
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
    modulePreload: false,
    minify: 'esbuild',
    sourcemap: false,
    target: 'esnext',
    rollupOptions: {
      output: {
        entryFileNames: 'mypwaindia.js',
        chunkFileNames: '[name].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) return assetInfo.name === 'index.css' ? 'mypwaindia.css' : '[name].css';
          return '[name]-[hash].[ext]';
        },
        manualChunks(id) {
          if (id.includes('node_modules')) return 'vendor';
          if (id.match(/pages\/(login|logout|onboarding)/)) return 'auth';
          if (id.match(/pages\/(transfer|bulk_transfer)/)) return 'transfers';
          if (id.match(/pages\/(history|statements|transaction)/)) return 'history';
          if (id.match(/pages\/(links|claim_link)/)) return 'links';
          if (id.match(/pages\/(leaderboard|team)/)) return 'social';
          if (id.match(/pages\/(settings|old_settings)/)) return 'settings';
          if (id.match(/pages\/(iotm|iotm_button)/)) return 'iotm';
          if (id.match(/pages\/(cli|toys)/)) return 'tools';
          if (id.match(/pages\/(release_notes|acknowledgements|restrictions|connection)/)) return 'info';
          if (id.match(/pages\/(not_found|flow_not_found|theme_apply)/)) return 'misc';
          if (id.match(/pages\/(account|dashboard)/)) return 'client';
          if (id.match(/pages\/cards/)) return 'scambait';
          if (id.match(/\/(hooks|utils)\//)) return 'helpers';
          if (id.match(/components\/(boundary_err|status|require_auth|verify_banner)/)) return 'stability';
          if (id.match(/components\/(acc_pill|add_acc_modal|logout_modal|bal_pill|install_pill)/)) return 'tandem';
          if (id.match(/context\//)) return 'bastion';
          if (id.match(/components\/(app_layout|sidebar|header|app_footer)/)) return 'commander';
        }
      }
    }
  }
});