import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

// Fonte unica da versao: package.json (exibida na UI e usada para invalidar o cache do Service Worker)
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))
const buildStamp = Date.now().toString(36)

// Carimba o CACHE_NAME do sw.js emitido em dist/ com versao + build, forcando purga de cache stale no PWA
const stampServiceWorker = () => ({
  name: 'stamp-service-worker',
  apply: 'build',
  closeBundle() {
    const swPath = new URL('./dist/sw.js', import.meta.url)
    if (!existsSync(swPath)) {
      throw new Error('stamp-service-worker: dist/sw.js nao encontrado')
    }
    const code = readFileSync(swPath, 'utf-8')
    const stamped = code.replace(
      /const CACHE_NAME = '[^']*';/,
      `const CACHE_NAME = 'sfl-tracker-v${pkg.version}-${buildStamp}';`
    )
    if (stamped === code && !code.includes(`v${pkg.version}-${buildStamp}`)) {
      throw new Error('stamp-service-worker: CACHE_NAME nao localizado em sw.js')
    }
    writeFileSync(swPath, stamped)
  }
})

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), stampServiceWorker()],
  base: '/SflTrade/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
})
