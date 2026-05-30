import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '127.0.0.1',
    port: 18082,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:18081',
        changeOrigin: true
      }
    }
  },
  preview: {
    host: '127.0.0.1',
    port: 18082,
    strictPort: true
  },
  resolve: {
    alias: {
      vue: 'vue/dist/vue.esm-bundler.js'
    }
  },
  define: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false
  }
})
