import { getApps, initializeApp } from 'firebase/app'
import { getDatabase, limitToLast, onValue, orderByChild, query, ref, runTransaction } from 'firebase/database'
import { firebaseConfig } from './duel/store'
import {
    LEADERBOARD_SIZE,
    LeaderboardEntry,
    RankedEntry,
    addSolvedDay,
    leaderboardYear,
    nameKey,
    sortEntries,
} from './leaderboard'

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

/** Thrown when another player already uses the name this year */
export class NameTakenError extends Error {
    name = 'NameTakenError'
}

/**
 * Reserves the name for this player for the year. A name is never released, so a player can
 * always go back to a name they used before, and nobody else can take it.
 */
const claimName = async (playerId: string, name: string, year: number) => {
    const result = await runTransaction(ref(db(), `leaderboardNames/${year}/${nameKey(name)}`), (current) =>
        current === null ? playerId : undefined,
    )
    if (result.snapshot.val() !== playerId) {
        throw new NameTakenError()
    }
}

/** Joins the year's table under this name, or renames this player's row (keeping the score) */
export const joinLeaderboard = async (playerId: string, name: string, year: number) => {
    await claimName(playerId, name, year)
    await runTransaction(ref(db(), `leaderboard/${year}/${playerId}`), (current) => {
        const e = toEntry(current)
        return e && e.name !== name ? { ...e, name, nameKey: nameKey(name) } : undefined
    })
}

/** Counts a solved day. Throws NameTakenError if the name now belongs to someone else. */
export const submitSolvedDay = async (playerId: string, name: string, day: number, tries: number) => {
    const year = leaderboardYear(day)
    await claimName(playerId, name, year)
    await runTransaction(ref(db(), `leaderboard/${year}/${playerId}`), (current) => {
        const next = addSolvedDay(toEntry(current), name, day, tries)
        return next ?? undefined
    })
}
