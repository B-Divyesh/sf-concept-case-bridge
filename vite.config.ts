import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        entryFileNames: 'assets/app.js',
        assetFileNames: ({ names }) => names.some((name) => name.endsWith('.css')) ? 'assets/app.css' : 'assets/[name][extname]'
      }
    }
  }
});
