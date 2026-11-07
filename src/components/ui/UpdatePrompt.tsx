import { useEffect, useState } from 'react'

const CHECK_EVERY_MS = 10 * 60 * 1000

/**
 * The game works offline, so a phone keeps showing the version it has cached. This registers
 * the service worker, looks for a new version every few minutes and whenever the app comes
 * back on screen, and once one has been installed asks to refresh - or refreshes on its own
 * while the app is in the background - so nobody keeps playing (or duelling) an old version.
 */
export const UpdatePrompt = () => {
    const [isUpdateReady, setIsUpdateReady] = useState(false)

    useEffect(() => {
        if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return

        // On the very first visit the worker also takes control - that's not an update
        const hadController = !!navigator.serviceWorker.controller
        const onControllerChange = () => hadController && setIsUpdateReady(true)
        navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

        let registration: ServiceWorkerRegistration | undefined
        navigator.serviceWorker
            .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
            .then((reg) => (registration = reg))
            .catch(() => {})

        const check = () => registration?.update().catch(() => {})
        const timer = window.setInterval(check, CHECK_EVERY_MS)
        const onVisible = () => document.visibilityState === 'visible' && check()
        document.addEventListener('visibilitychange', onVisible)

        return () => {
            navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
            window.clearInterval(timer)
            document.removeEventListener('visibilitychange', onVisible)
        }
    }, [])

    // Nobody is looking: reload now, so the app opens on the new version next time
    useEffect(() => {
        if (!isUpdateReady) return
        const reloadIfHidden = () => document.visibilityState === 'hidden' && window.location.reload()
        reloadIfHidden()
        document.addEventListener('visibilitychange', reloadIfHidden)
        return () => document.removeEventListener('visibilitychange', reloadIfHidden)
    }, [isUpdateReady])

    if (!isUpdateReady) return null

    return (
        <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 pointer-events-none" role="status">
            <div className="pointer-events-auto flex items-center gap-3 rounded-xl bg-slate-900 dark:bg-white px-4 py-3 text-sm text-white dark:text-slate-900 shadow-xl">
                <span className="font-medium">Има нова верзија на Зборле</span>
                <button
                    onClick={() => window.location.reload()}
                    className="rounded-lg bg-tile-correct px-3 py-1.5 font-semibold text-white hover:brightness-95 active:brightness-90"
                >
                    Освежи
                </button>
            </div>
        </div>
    )
}
