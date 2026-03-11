import { defineConfig } from "astro/config"
import react from "@astrojs/react"
import tailwind from "@astrojs/tailwind"

export default defineConfig({
  output: "static",
  integrations: [react(), tailwind()],
  vite: {
    server: {
      proxy: {
        "/.netlify/functions": {
          target: "http://localhost:9999",
          changeOrigin: true,
        },
      },
    },
  },
})
