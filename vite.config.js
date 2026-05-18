import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import obfuscator from 'vite-plugin-javascript-obfuscator';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      manifestFilename: 'manifest.json',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'MyPayIndia PWA',
        short_name: 'MyPayIndia',
        description: 'MyPayIndia responsive web app',
        theme_color: '#d03505',
        background_color: '#000000',
        display: 'standalone',
        start_url: '/dash',
        id: 'com.exerinity.mypayindia',
        icons: [{ src: '/i/logo.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }]
      }
    }),
    obfuscator({
      options: {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 1,
        deadCodeInjection: true,
        deadCodeInjectionThreshold: 0.4,
        identifierNamesGenerator: 'hexadecimal',
        numbersToExpressions: true,
        simplify: true,
        stringArray: true,
        stringArrayEncoding: ['base64'],
        stringArrayThreshold: 1,
        splitStrings: true,
        splitStringsChunkLength: 3,
        unicodeEscapeSequence: true
      }
    })
  ],
  build: {
    minify: 'terser',
    sourcemap: false,
    target: 'esnext',
    assetsInlineLimit: 0, 
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 4,
        unsafe: true
      },
      mangle: {
        toplevel: true,
        properties: false
      },
      format: {
        comments: false
      }
    },
    rollupOptions: {
      output: {
        minChunkSize: 1,
        manualChunks(id) {
          if (id.includes('node_modules')) {
            const directories = id.toString().split('node_modules/')[1].split('/');
            const name = directories[0].startsWith('@') ? `${directories[0]}/${directories[1]}` : directories[0];
            return Buffer.from(name + id.length).toString('hex').substring(0, 10);
          }
          if (id.includes('/src/')) {
            return Buffer.from(id).toString('hex').substring(5, 15);
          }
        },
        entryFileNames: 'i/[hash].js',
        chunkFileNames: 'i/[hash].js',
        assetFileNames: 'i/[hash].[ext]'
      }
    }
  }
});