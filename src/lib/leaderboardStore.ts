import { getApps, initializeApp } from 'firebase/app'
import { getDatabase, limitToLast, onValue, orderByChild, query, ref, runTransaction } from 'firebase/database'
import { firebaseConfig } from './duel/store'
import { LEADERBOARD_SIZE, LeaderboardEntry, RankedEntry, addSolvedDay, leaderboardYear, sortEntries } from './leaderboard'

const db = () => getDatabase(getApps()[0] ?? initializeApp(firebaseConfig))

const toEntry = (raw: unknown): LeaderboardEntry | null => {
    const e = raw as LeaderboardEntry | null
    return e && typeof e.solved === 'number' ? e : null
}

/** Live top 10 of the year, plus this player's own entry (which may be outside the top 10) */
export const watchLeaderboard = (
    year: number,
    playerId: string,
    onChange: (top: RankedEntry[], me: LeaderboardEntry | null) => void,
    onError: () => void,
) => {
    let top: RankedEntry[] = []
    let me: LeaderboardEntry | null = null
    const emit = () => onChange(top, me)
    const stopTop = onValue(
        query(ref(db(), `leaderboard/${year}`), orderByChild('rank'), limitToLast(LEADERBOARD_SIZE)),
        (snap) => {
            const entries: RankedEntry[] = []
            snap.forEach((child) => {
                const e = toEntry(child.val())
                if (e && child.key) entries.push({ ...e, id: child.key })
            })
            top = sortEntries(entries)
            emit()
        },
        onError,
    )
    const stopMe = onValue(
        ref(db(), `leaderboard/${year}/${playerId}`),
        (snap) => {
            me = toEntry(snap.val())
            emit()
        },
        onError,
    )
    return () => {
        stopTop()
        stopMe()
    }
}

/** Counts a solved day. Resolves true once it is recorded (or was already). */
export const submitSolvedDay = async (playerId: string, name: string, day: number, tries: number) => {
    await runTransaction(ref(db(), `leaderboard/${leaderboardYear(day)}/${playerId}`), (current) => {
        const next = addSolvedDay(toEntry(current), name, day, tries)
        return next ?? undefined
    })
    return true
}

/** Changes the name shown in this year's table, keeping the score */
export const renamePlayer = async (playerId: string, name: string, year: number) => {
    await runTransaction(ref(db(), `leaderboard/${year}/${playerId}`), (current) => {
        const e = toEntry(current)
        return e ? { ...e, name } : undefined
    })
}
