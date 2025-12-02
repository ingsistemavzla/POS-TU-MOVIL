import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
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
  },
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "c8",
    },
  },
}));
