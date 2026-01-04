import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Este selo força o sistema a reconhecer o código JSX mesmo em arquivos .js
export default defineConfig({
  plugins: [react()],
  server: {
    host: true
  },
  esbuild: {
    loader: "jsx",
    include: /src\/.*\.jsx?$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
})
