import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Relative base so the built site works at any subpath (e.g. GitHub Pages
  // project site https://user.github.io/torq-crm/) without hardcoding the repo.
  base: './',
  server: { port: 5180, open: false },
})
