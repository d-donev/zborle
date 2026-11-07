import { initializeApp } from 'firebase/app'
import { getDatabase, onDisconnect, onValue, ref, runTransaction, set } from 'firebase/database'
import { DuelStore, normalizeDuel, toStorable } from './store'

type Config = {
    apiKey?: string
    authDomain?: string
    databaseURL?: string
    projectId?: string
    appId?: string
}

export const createFirebaseStore = (config: Config): DuelStore => {
    const app = initializeApp(config)
    const db = getDatabase(app)

    // Both players use the server clock so "who guessed first" and the timers are fair
    let serverOffset = 0
    onValue(ref(db, '.info/serverTimeOffset'), (snap) => {
        serverOffset = Number(snap.val()) || 0
    })

    return {
        isOnline: true,
        subscribe(code, onChange) {
            return onValue(ref(db, `duels/${code}`), (snap) => onChange(normalizeDuel(snap.val())))
        },
        async transact(code, fn) {
            const result = await runTransaction(ref(db, `duels/${code}`), (current) => {
                const next = fn(normalizeDuel(current))
                return next === undefined ? undefined : toStorable(next)
            })
            return result.committed ? normalizeDuel(result.snapshot.val()) : null
        },
        now: () => Date.now() + serverOffset,
        trackPresence(code, role) {
            const onlineRef = ref(db, `duels/${code}/players/${role}/online`)
            return onValue(ref(db, '.info/connected'), (snap) => {
                if (snap.val() === true) {
                    onDisconnect(onlineRef).set(false)
                    set(onlineRef, true)
                }
            })
        },
    }
}
