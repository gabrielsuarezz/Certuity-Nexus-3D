import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Bind all interfaces (IPv4 + IPv6) so localhost / 127.0.0.1 both resolve.
  server: { host: true, port: 5173 },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // Split the heavy 3D / vendor libs into cacheable chunks so the browser can
    // fetch them in parallel and reuse them across deploys, instead of shipping
    // one ~2 MB monolith. (The ElevenLabs voice SDK is code-split separately via
    // the lazy import in AgentDock.)
    rollupOptions: {
      output: {
        // Only split out self-contained "sink" libs (cacheable, one-way deps) so
        // there are no circular chunks. Everything else is left to Rollup: the
        // app's eager deps land in the entry chunk, and voice-only deps (the
        // ElevenLabs SDK) stay in the lazy VoiceSession chunk.
        manualChunks(id) {
          if (id.includes('/node_modules/three/')) return 'three'
          if (id.includes('/node_modules/postprocessing/')) return 'postprocessing'
          if (
            id.includes('/node_modules/react/') ||
            id.includes('/node_modules/react-dom/') ||
            id.includes('/node_modules/scheduler/')
          ) {
            return 'react'
          }
          return undefined
        },
      },
    },
  },
})
