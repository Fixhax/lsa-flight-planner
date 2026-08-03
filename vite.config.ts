import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // friends you share this with always get the latest build automatically
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'LSA Flight Planner',
        short_name: 'LSA Planner',
        description: 'Route and fuel planning for light sport aircraft.',
        start_url: '/',
        display: 'standalone',
        background_color: '#0d1117',
        theme_color: '#0d1117',
        orientation: 'portrait',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // Precache the app shell so it launches even with a flaky connection;
        // API calls (weather, sun times, Supabase) still need real network,
        // that part of the app was never meant to work offline.
        globPatterns: ['**/*.{js,css,html,png,svg,ico}']
      },
      devOptions: {
        enabled: true // lets you test "Install" during npm run dev, not just a production build
      }
    })
  ],
  server: {
    host: true // exposes on your LAN so you can test from an iPhone/iPad on the same wifi
  }
})
