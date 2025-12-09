import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { copyFileSync } from "fs";
import { join } from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    // Plugin para copiar _redirects a dist después del build
    {
      name: 'copy-redirects',
      closeBundle() {
        const src = join(__dirname, 'public', '_redirects');
        const dest = join(__dirname, 'dist', '_redirects');
        try {
          copyFileSync(src, dest);
          console.log('✅ _redirects copiado a dist/');
        } catch (error) {
          console.warn('⚠️ No se pudo copiar _redirects:', error);
        }
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@tanstack/react-query'],
          'chart-vendor': ['recharts'],
          // Heavy pages
          'dashboard': ['./src/pages/Dashboard'],
          'pos': ['./src/pages/POS'],
          'reports': ['./src/pages/ReportsNew'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    // Copy _redirects file to dist for Render
    copyPublicDir: true,
    // Ensure _redirects is copied to root of dist
    outDir: 'dist',
  },
  publicDir: 'public',
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "c8",
    },
  },
}));
