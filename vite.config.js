import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import obfuscator from 'vite-plugin-javascript-obfuscator';

const rn = () => Array.from({ length: 200 }, () =>
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 62)]
).join('');

function dcp() {
  const dn = [];

  return {
    name: 'dummy',
    generateBundle() {
      for (let i = 0; i < 200; i++) {
        const ln = Array.from({ length: Math.floor(Math.random() * 60) + 20 }, () => {
          const vn = `_0x${Math.random().toString(16).slice(2, 10)}`;
          const st = [
            () => `const ${vn} = "${Buffer.from(Math.random().toString(36).repeat(300)).toString('base64')}";`,
            () => `function ${vn}(){return _0x${Math.random().toString(16).slice(2, 10)}||null;}`,
            () => `const ${vn} = [${Array.from({ length: 8 }, () => `"${Buffer.from(Math.random().toString(36).repeat(20)).toString('base64')}"`).join(',')}];`,
            () => `const ${vn} = {${Array.from({ length: 5 }, () => `_0x${Math.random().toString(16).slice(2, 6)}:"${Math.random().toString(36)}"`).join(',')}};`,
            () => `const ${vn} = "${[...Math.random().toString(36)].map(c => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`).join('')}";`,
          ];
          return st[Math.floor(Math.random() * st.length)]();
        }).join('\n');

        const fn = rn();
        dn.push(`/i/${fn}.js`);
        this.emitFile({ type: 'asset', fileName: `i/${fn}.js`, source: ln });
      }
    },

    transformIndexHtml(html) {
      const mn = html
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<link rel="modulepreload"[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .replace(/> </g, '><')
        .trim();

      const sh = dn.sort(() => Math.random() - 0.5);
      const th = Math.floor(sh.length / 3);
      const hjs = sh.slice(0, th).map(src => `<script defer src="${src}"></script>`).join('');
      const mjs = sh.slice(th, th * 2).map(src => `<script defer src="${src}"></script>`).join('');
      const bjs = sh.slice(th * 2).map(src => `<script defer src="${src}"></script>`).join('');

      return mn
        .replace('</head>', `${hjs}</head>`)
        .replace('<div id="root">', `${mjs}<div id="root">`)
        .replace('</body>', `${bjs}</body>`);
    }
  };
}

function b64b() {
  return {
    name: 'b64-bloat',
    renderChunk(cd) {
      const bl = Array.from({ length: 40 }, (_, i) => {
        const bv = Buffer.from(Math.random().toString(36).repeat(200)).toString('base64');
        return `const _b${i}_${Math.random().toString(16).slice(2, 8)} = "${bv}";`;
      }).join('\n');
      return { code: bl + '\n' + cd };
    }
  };
}

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      workbox: {
        globPatterns: ['**/*.{html,css,woff2}', 'i/[A-Z]*.js']
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
        icons: [{ src: '/i/logo.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }]
      }
    }),
    dcp(),
    b64b(),
    obfuscator({
      options: {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 1,
        deadCodeInjection: true,
        deadCodeInjectionThreshold: 1,
        identifierNamesGenerator: 'hexadecimal',
        numbersToExpressions: true,
        simplify: true,
        stringArray: true,
        stringArrayEncoding: ['base64'],
        stringArrayThreshold: 1,
        stringArrayRotate: true,
        stringArrayShuffle: true,
        stringArrayWrappersCount: 5,
        stringArrayWrappersType: 'function',
        stringArrayWrappersChainedCalls: true,
        splitStrings: true,
        splitStringsChunkLength: 3,
        unicodeEscapeSequence: true,
        transformObjectKeys: true,
        disableConsoleOutput: true,
        selfDefending: true,
        rotateStringArray: true,
      }
    })
  ],
  build: {
    minify: 'terser',
    sourcemap: false,
    target: 'esnext',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1000,
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 5,
        unsafe: true,
        unsafe_math: true,
        unsafe_proto: true,
        unsafe_regexp: true,
        pure_getters: true,
        toplevel: true,
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
        experimentalMinChunkSize: 1,
        entryFileNames: () => `i/${rn()}.js`,
        chunkFileNames: () => `i/${rn()}.js`,
        assetFileNames: () => `i/${rn()}.[ext]`,
        manualChunks(id) {
          if (id.includes('node_modules')) {
            const dirs = id.toString().split('node_modules/')[1].split('/');
            const nm = dirs[0].startsWith('@') ? `${dirs[0]}/${dirs[1]}` : dirs[0];
            return Buffer.from(nm + id.length).toString('hex').substring(0, 10);
          }
          if (id.includes('/src/')) {
            return Buffer.from(id).toString('hex').substring(5, 15);
          }
        },
      }
    }
  }
});