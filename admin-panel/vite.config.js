import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig(({ command }) => ({
  // В проде раздаётся nginx'ом под путём /admin/ на том же домене, что и
  // публичный сайт (см. nginx location /admin/) — в деве путь не нужен.
  base: command === "build" ? "/admin/" : "/",
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
}))
