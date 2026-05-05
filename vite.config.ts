import "@tailwindcss/vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/query": {
        target: process.env.VITE_API_URL || "http://localhost:8080",
        changeOrigin: true,
      },
      "/artifact": {
        target: process.env.VITE_API_URL || "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
});

function tailwindcss() {
  return import("@tailwindcss/vite").then((m) => m.default());
}
