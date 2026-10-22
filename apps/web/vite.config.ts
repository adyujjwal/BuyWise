import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // The 3D engine imports @react-three/fiber, which globally augments
      // JSX.IntrinsicElements with ~150 three.js elements. That bloats MUI's
      // Box/sx types past TS's union limit everywhere. We import it through
      // this alias (declared as an opaque module for TS) so fiber's types
      // never enter the main program; Vite resolves it to the real file.
      '@buywise/decision-engine-3d': fileURLToPath(
        new URL('./src/three/DecisionEngine.tsx', import.meta.url),
      ),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Split the heavy 3D stack into its own chunk so the rest of the app
        // (and anyone who never scrolls the hero) isn't blocked on it.
        manualChunks: {
          three: ['three', '@react-three/fiber'],
          mui: ['@mui/material', '@emotion/react', '@emotion/styled'],
          vendor: ['react', 'react-dom', 'react-router-dom', 'framer-motion'],
        },
      },
    },
  },
});
