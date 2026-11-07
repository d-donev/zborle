import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// The production build is served from https://d-donev.github.io/zborle/ (GitHub Pages project site).
// Override with BASE_PATH=/ when deploying to a custom domain.
const BASE_PATH = process.env.BASE_PATH ?? '/zborle/'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
    base: command === 'build' ? BASE_PATH : '/',
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'safari-pinned-tab.svg'],
            manifest: {
                name: 'Зборле',
                short_name: 'Зборле',
                description: 'Погодете го македонскиот збор во 6 обиди',
                lang: 'mk',
                display: 'standalone',
                start_url: '.',
                scope: '.',
                theme_color: '#0f172a',
                background_color: '#ffffff',
                icons: [
                    { src: 'android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
                    { src: 'android-chrome-256x256.png', sizes: '256x256', type: 'image/png' },
                    {
                        src: 'android-chrome-256x256.png',
                        sizes: '256x256',
                        type: 'image/png',
                        purpose: 'maskable',
                    },
                ],
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
                // the word lists make the main bundle fairly large
                maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
            },
        }),
    ],
    server: {
        port: 3000,
        open: true,
    },
    build: {
        outDir: 'dist',
        sourcemap: true,
    },
}))
