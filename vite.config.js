/* global __dirname */
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { VitePWA } from 'vite-plugin-pwa'
import path from "path"

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // 1. Tell Vite to cache these 4 files for offline use
      includeAssets: [
        'blackicon.svg', 
        'whiteicon.svg', 
        'blackappleicon.png', 
        'whiteappleicon.png'
      ],
      manifest: {
        name: 'Personal Habit Tracker',
        short_name: 'Habits',
        description: 'Track your daily consistency.',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        // 2. Android / Chrome PWA Manifest Icons
        icons: [
          {
            src: 'blackandroidicon.png',
            sizes: '192x192 512x512',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'whiteandroidicon.png',
            sizes: '192x192 512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})