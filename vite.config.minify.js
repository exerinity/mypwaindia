/* 
  This vite config is for an experimental single file build. Instead of making an array
  of script files lazily loaded and a readable index.html, this one gives you everything in
  one file.

  In other words, big monolitchic index.html, nothing else compiled
  other than the logo

  Please don't use this I beg you it's stupid
*/

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { viteSingleFile } from 'vite-plugin-singlefile';

function umamiAnalytics() {
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
  plugins: [react(), VitePWA({ disable: true }), viteSingleFile(), umamiAnalytics()],
  build: {
    outDir: 'dist-minify',
    emptyOutDir: true,
    minify: 'esbuild',
    sourcemap: false,
    target: 'esnext',
    cssCodeSplit: false,
    assetsInlineLimit: Infinity
  }
});
