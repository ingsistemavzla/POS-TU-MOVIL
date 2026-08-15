import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { copyFileSync, existsSync, writeFileSync } from "fs";
import { join } from "path";

const BUILD_ID = `${Date.now()}`;
try {
  writeFileSync(join(process.cwd(), "public", "build-id.txt"), BUILD_ID, "utf8");
} catch (error) {
  console.warn("⚠️ No se pudo escribir public/build-id.txt:", error);
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  define: {
    "import.meta.env.VITE_BUILD_ID": JSON.stringify(BUILD_ID),
  },
  plugins: [
    react(),
    {
      name: "copy-redirects",
      closeBundle() {
        const redirectsSrc = join(process.cwd(), "public", "_redirects");
        const redirectsDest = join(process.cwd(), "dist", "_redirects");
        if (existsSync(redirectsSrc)) {
          try {
            copyFileSync(redirectsSrc, redirectsDest);
            console.log("✅ _redirects copiado a dist/");
          } catch (error) {
            console.warn("⚠️ No se pudo copiar _redirects:", error);
          }
        } else {
          console.warn("⚠️ _redirects no encontrado en public/, omitiendo...");
        }

        const notFoundSrc = join(process.cwd(), "public", "404.html");
        const notFoundDest = join(process.cwd(), "dist", "404.html");
        if (existsSync(notFoundSrc)) {
          try {
            copyFileSync(notFoundSrc, notFoundDest);
            console.log("✅ 404.html copiado a dist/");
          } catch (error) {
            console.warn("⚠️ No se pudo copiar 404.html:", error);
          }
        } else {
          console.warn("⚠️ 404.html no encontrado en public/, omitiendo...");
        }

        try {
          writeFileSync(join(process.cwd(), "dist", "build-id.txt"), BUILD_ID, "utf8");
          console.log("✅ build-id.txt escrito:", BUILD_ID);
        } catch (error) {
          console.warn("⚠️ No se pudo escribir dist/build-id.txt:", error);
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
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "ui-vendor": ["@tanstack/react-query"],
          "chart-vendor": ["recharts"],
          "pdf-vendor": ["jspdf", "jspdf-autotable"],
          dashboard: ["./src/pages/Dashboard"],
          pos: ["./src/pages/POS"],
          reports: ["./src/pages/ReportsNew"],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    copyPublicDir: true,
    outDir: "dist",
  },
  publicDir: "public",
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "c8",
    },
  },
}));
