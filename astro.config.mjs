import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import mdx from '@astrojs/mdx'

// the chat's engine runs on threads that share memory, and browsers only allow that
// on a cross-origin isolated page. vercel.json sends the same headers in production
const isolated = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
}

export default defineConfig({
  integrations: [react(), mdx()],
  server: { headers: isolated },
  markdown: {
    shikiConfig: {
      themes: { light: 'vitesse-light', dark: 'vitesse-dark' },
      defaultColor: false,
      langAlias: { nasm: 'asm', ptx: 'asm' },
    },
  },
})