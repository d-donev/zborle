import { initializeApp } from 'firebase/app'
import {
    getDatabase,
    onDisconnect,
    onValue,
    ref,
    runTransaction,
    serverTimestamp,
    update,
} from 'firebase/database'
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
                if (next === undefined) return undefined
                return next === null ? null : toStorable(next)
            })
            return result.committed ? normalizeDuel(result.snapshot.val()) : null
        },
        now: () => Date.now() + serverOffset,
        trackPresence(code, role) {
            // When the connection drops, the server itself records that the player went away and
            // when; a duel whose players are all away for 10 minutes is then treated as over.
            // (Writes to a duel that was deleted are refused by the database rules.)
            const playerRef = ref(db, `duels/${code}/players/${role}`)
            const stop = onValue(ref(db, '.info/connected'), (snap) => {
                if (snap.val() === true) {
                    onDisconnect(playerRef).update({ online: false, lastSeen: serverTimestamp() })
                    update(playerRef, { online: true }).catch(() => {})
                }
            })
            return () => {
                stop()
                onDisconnect(playerRef)
                    .cancel()
                    .catch(() => {})
                update(playerRef, { online: false, lastSeen: serverTimestamp() }).catch(() => {})
            }
        },
    }
}
