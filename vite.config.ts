import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
    hmr: false,
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  },
  build: {
    modulePreload: {
      polyfill: false
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('pdfjs-dist')) return 'pdf';
          if (id.includes('jspdf-autotable')) return 'jspdf-autotable';
          if (id.includes('jspdf')) return 'jspdf';
          if (id.includes('html2canvas')) return 'html2canvas';
          if (id.includes('dompurify')) return 'dompurify';
          if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) return 'react';
          if (id.includes('lucide-react') || id.includes('motion')) return 'ui';
          if (id.includes('i18next') || id.includes('react-i18next')) return 'i18n';
          if (id.includes('@supabase')) return 'supabase';
          return undefined;
        }
      }
    }
  }
});
