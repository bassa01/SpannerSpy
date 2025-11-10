import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  server: {
    port: 4173,
    open: false,
    fs: {
      allow: [path.resolve(__dirname, ".."), path.resolve(__dirname, "../src")],
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "../src"),
    },
  },
});
