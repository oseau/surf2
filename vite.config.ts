import { defineConfig } from "vite";
import monkey from "vite-plugin-monkey";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    monkey({
      entry: "src/main.ts",
      server: { open: false },
      userscript: {
        icon: "https://vitejs.dev/logo.svg",
        namespace: "npm/vite-plugin-monkey",
        match: ["https://v2.surf.one/trade/*/"],
      },
    }),
  ],
});
