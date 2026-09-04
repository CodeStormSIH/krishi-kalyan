import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

const resolve = path => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@shared': resolve('./Shared_with_all_portals/src') },
    dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom'],
  },
  // Imported assets belong to each portal's src/assets folder.
  publicDir: resolve('./Shared_with_all_portals/public'),
  server: { host: '127.0.0.1' },
  build: {
    rollupOptions: {
      input: {
        main: resolve('./index.html'),
        farmer: resolve('./Farmer-portal/index.html'),
        admin: resolve('./Admin-portal/index.html'),
        procurement: resolve('./Procurement-center/index.html'),
      },
    },
  },
});
