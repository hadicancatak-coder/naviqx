import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
// @ts-ignore - vite-plugin-eslint types issue
import eslint from "vite-plugin-eslint";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    // ESLint plugin - will show errors in console but not block build
    // Set failOnError: true to block build on ESLint errors
    eslint({
      failOnWarning: false,
      failOnError: true,
      emitWarning: true,
      emitError: true,
      cache: true,
      include: ['src/**/*.ts', 'src/**/*.tsx'],
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ['react', 'react-dom'],
  },
}));
