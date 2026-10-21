import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  server: {
    // Em desenvolvimento, fetch("/api/...") no front vai para o back end Python.
    proxy: {
      // 127.0.0.1 e não "localhost": o Node pode resolver localhost para IPv6 (::1),
      // e o uvicorn escuta só em IPv4 por padrão.
      '/api': 'http://127.0.0.1:8000',
    },
  },
})
