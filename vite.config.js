import { defineConfig, transformWithEsbuild } from 'vite';
import react from '@vitejs/plugin-react';
import stylex from '@stylexjs/unplugin';
import { VitePWA } from 'vite-plugin-pwa';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

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

function minify_css_assets() {
  let output_dir;
  let css_files = [];
  return {
    name: 'minify-css-assets',
    apply: 'build',
    configResolved(config) {
      output_dir = resolve(config.root, config.build.outDir);
    },
    writeBundle(_options, bundle) {
      css_files = Object.values(bundle)
        .filter((asset) => asset.type === 'asset' && asset.fileName.endsWith('.css'))
        .map((asset) => asset.fileName);
    },
    async closeBundle() {
      for (const file_name of css_files) {
        const file_path = resolve(output_dir, file_name);
        const source = await readFile(file_path, 'utf8');
        const result = await transformWithEsbuild(source, file_name, {
          loader: 'css',
          minify: true,
          legalComments: 'none'
        });
        if (!result.code.trim() && source.trim()) throw new Error(`CSS minification removed ${file_name}`);
        await writeFile(file_path, result.code);
      }
    }
  };
}

function script_file_name(chunk) {
  return `i/scripts/${chunk.name.split('/').at(-1)}_[hash].js`;
}

export default defineConfig({
  plugins: [
    stylex.vite({ classNamePrefix: 'r-' }),
    react(),
    umami(),
    minify_css_assets(),
    VitePWA({
      registerType: 'prompt',
      manifestFilename: 'mypayindia.webmanifest',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,ico}'],
        globIgnores: [
          '**/mpi_globe-*.js',
          '**/mpi_three-*.js'
        ]
      },
      manifest: {
        name: 'MyPayIndia PWA',
        short_name: 'MyPayIndia',
        description: 'MyPayIndia responsive web app',
        theme_color: '#121212',
        background_color: '#121212',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        scope: '/',
        start_url: '/dash',
        id: 'com.exerinity.mpi',
        icons: [
          { src: '/i/mypayindia-bg.png', sizes: '1024x1024', type: 'image/png', purpose: 'any' },
          { src: '/i/mypayindia-bg.png', sizes: '1024x1024', type: 'image/png', purpose: 'maskable' }
        ],
        shortcuts: [
          { name: 'Transfer funds', short_name: 'Transfer', url: '/account/transfer', icons: [{ src: '/i/mypayindia-bg.png', sizes: '1024x1024', type: 'image/png' }] },
          { name: 'Transaction history', short_name: 'History', url: '/account/history', icons: [{ src: '/i/mypayindia-bg.png', sizes: '1024x1024', type: 'image/png' }] },
          { name: 'Payment links', short_name: 'Links', url: '/account/links', icons: [{ src: '/i/mypayindia-bg.png', sizes: '1024x1024', type: 'image/png' }] }
        ]
      }
    })
  ],
  server: {
    proxy: {
      '/i/api/pwa/meta/news': {
        target: 'https://mypayindia.sbs',
        changeOrigin: true
      },
      ...Object.fromEntries(
        ['/i/api', '/i/iotm', '/i/accountservices', '/i/api/pwa', '/i/staging'].map((prefix) => [prefix, {
          target: 'https://bastion.mypayindia.sbs',
          changeOrigin: true,
          rewrite: (path) => path === '/i/api/pwa/buttonclick' ? '/iotm/button/click' : path.replace(/^\/i/, '')
        }])
      ),
      '/i/api/buttonac': {
        target: 'https://subscribe.mypayindia.sbs',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/i\/subscribe/, '') || '/'
      }
    }
  },
  build: {
    modulePreload: false,
    minify: 'esbuild',
    cssMinify: 'esbuild',
    cssCodeSplit: false,
    sourcemap: false,
    target: 'esnext',
    rollupOptions: {
      preserveEntrySignatures: 'strict',
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: script_file_name,
        chunkFileNames: script_file_name,
        assetFileNames: (asset) => asset.name?.endsWith('.css')
          ? 'i/css/mypwaindia_[hash].css'
          : '[name]-[hash].[ext]',
      }
    }
  }
});
