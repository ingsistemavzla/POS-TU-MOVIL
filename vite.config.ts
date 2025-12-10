import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { copyFileSync, existsSync } from "fs";
import { join } from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    // Plugin para copiar _redirects y 404.html a dist después del build
    {
      name: 'copy-redirects',
      closeBundle() {
        // Copiar _redirects
        const redirectsSrc = join(process.cwd(), 'public', '_redirects');
        const redirectsDest = join(process.cwd(), 'dist', '_redirects');
        if (existsSync(redirectsSrc)) {
          try {
            copyFileSync(redirectsSrc, redirectsDest);
            console.log('✅ _redirects copiado a dist/');
          } catch (error) {
            console.warn('⚠️ No se pudo copiar _redirects:', error);
          }
        } else {
          console.warn('⚠️ _redirects no encontrado en public/, omitiendo...');
        }
        
        // Copiar 404.html
        const notFoundSrc = join(process.cwd(), 'public', '404.html');
        const notFoundDest = join(process.cwd(), 'dist', '404.html');
        if (existsSync(notFoundSrc)) {
          try {
            copyFileSync(notFoundSrc, notFoundDest);
            console.log('✅ 404.html copiado a dist/');
          } catch (error) {
            console.warn('⚠️ No se pudo copiar 404.html:', error);
          }
        } else {
          console.warn('⚠️ 404.html no encontrado en public/, omitiendo...');
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
