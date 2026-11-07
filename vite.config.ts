import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// The production build is served from https://d-donev.github.io/zborle/ (GitHub Pages project site).
// Override with BASE_PATH=/ when deploying to a custom domain.
const BASE_PATH = process.env.BASE_PATH ?? '/zborle/'

// https://vite.dev/config/
export default defineConfig(({ command, isPreview }) => ({
    // `vite preview` serves the production build, so it needs the same base path
    base: command === 'build' || isPreview ? BASE_PATH : '/',
    plugins: [
        react(),
        VitePWA({
            // A new version takes over the cache as soon as it is downloaded; the app registers the
            // service worker itself (see UpdatePrompt) so it can then ask players to refresh,
            // instead of leaving them on an old version until every tab is closed.
            registerType: 'autoUpdate',
            injectRegister: false,
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
                // take over open tabs straight away (UpdatePrompt then offers the refresh)
                skipWaiting: true,
                clientsClaim: true,
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
