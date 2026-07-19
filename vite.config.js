import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

function umami() {
  return {
    name: 'umami',
    apply: 'build',
    transformIndexHtml() {
      return [
        {
          tag: 'script',
          attrs: {
            defer: true,
            src: 'https://analytics.mypayindia.com/script.js',
            'data-website-id': 'd4251bd6-18ba-4558-a11d-6440a3cd1ab6'
          },
          injectTo: 'head'
        }
      ];
    }
  };
}

export default defineConfig({
  plugins: [
    react(),
    umami(),
    VitePWA({
      registerType: 'prompt',
      manifestFilename: 'mypayindia.webmanifest',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,ico}'],
        globIgnores: ['**/mpi_globe-*.js']
      },
      manifest: {
        name: 'MyPayIndia PWA',
        short_name: 'MyPayIndia',
        description: 'MyPayIndia responsive web app',
        theme_color: '#d03505',
        background_color: '#000000',
        display: 'standalone',
        start_url: '/dash',
        id: 'com.exerinity.mpi',
        icons: [{ src: '/i/mypayindia.png', sizes: '64x64', type: 'image/png', purpose: 'any maskable' }]
      }
    })
  ],
  build: {
    modulePreload: false,
    minify: false,
    sourcemap: false,
    target: 'esnext',
    rollupOptions: {
      output: {
        entryFileNames: 'i/scripts/mypwaindia_index-[hash].js',
        chunkFileNames: 'i/scripts/mpi_[name]-[hash].js',
        assetFileNames: '[name]-[hash].[ext]',
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (/[\\/]node_modules[\\/](three|three-globe|three-render-objects|three-conic-polygon-geometry|three-geojson-geometry|three-slippy-map-globe|globe\.gl|react-globe\.gl|react-kapsule|kapsule|accessor-fn|index-array-by|tinycolor2|frame-ticker|data-bind-mapper|h3-js|earcut|float-tooltip|@tweenjs[\\/]tween\.js|d3-[^\\/]+)[\\/]/.test(id)) return 'globe';
            return 'node_modules';
          }
          if (id.match(/pages\/(login|logout|onboarding)/)) return 'flow';
          if (id.match(/pages\/(transfer|bulk_transfer)/)) return 'transfers';
          if (id.match(/pages\/(history|statements|old_transaction|transaction)/)) return 'history';
          if (id.match(/pages\/(links|claim_link)/)) return 'links';
          if (id.match(/pages\/team_map/)) return 'teammap';
          if (id.match(/pages\/(leaderboard|team)/)) return 'social';
          if (id.match(/pages\/(settings|old_settings)/)) return 'settings';
          if (id.match(/pages\/(iotm|iotm_button)/)) return 'iotm';
          if (id.match(/pages\/(cli|toys)/)) return 'tools';
          if (id.match(/pages\/(release_notes|acknowledgements|restrictions|connection)/)) return 'info';
          if (id.match(/pages\/(not_found|flow_not_found|theme_apply|external_redirect)/)) return 'misc';
          if (id.match(/pages\/(account|dashboard)/)) return 'client';
          if (id.match(/pages\/cards/)) return 'scambait';
          if (id.match(/pages\/subscriptions/)) return 'subs';
          if (id.match(/components\/status/)) return 'stability';
          if (id.match(/context\//)) return 'bastion';
        }
      }
    }
  }
});