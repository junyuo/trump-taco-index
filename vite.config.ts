import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'trump-taco-index'
const isGitHubPages = process.env.GITHUB_ACTIONS === 'true'

export default defineConfig({
  plugins: [react()],
  base: isGitHubPages ? `/${repositoryName}/` : '/',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('recharts') || id.includes('/d3-') || id.includes('victory-vendor')) {
            return 'charts'
          }
          if (id.includes('node_modules/react') || id.includes('lucide-react')) {
            return 'vendor'
          }
          return undefined
        },
      },
    },
  },
})
