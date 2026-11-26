import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      manifest: {
        name: 'PTN-Student-Care — ระบบดูแลช่วยเหลือนักเรียน',
        short_name: 'PTN-Care',
        description: 'ระบบดูแลช่วยเหลือและติดตามความพร้อมจบการศึกษา โรงเรียนเปรมติณสูลานนท์ อบจ.ขอนแก่น',
        theme_color: '#2B3E50',
        background_color: '#BDCCD6',
        display: 'standalone',
        orientation: 'portrait-primary',
        lang: 'th',
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor_react: ['react', 'react-dom', 'lucide-react'],
          vendor_charts: ['recharts'],
          vendor_export: ['xlsx', 'jspdf', 'html2canvas'],
          vendor_firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
        },
      },
    },
  },
});
