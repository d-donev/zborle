import { getApps, initializeApp } from 'firebase/app'
import {
    get,
    getDatabase,
    limitToLast,
    onValue,
    orderByChild,
    query,
    ref,
    runTransaction,
    startAt,
} from 'firebase/database'
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

/** Rows from before names were reserved (no nameKey) are left out */
/** Any stored row, including ones from before names were reserved (no nameKey) */
const toStoredEntry = (raw: unknown): LeaderboardEntry | null => {
    const e = raw as LeaderboardEntry | null
    return e && typeof e.solved === 'number' ? e : null
}

const toEntry = (raw: unknown): LeaderboardEntry | null => {
    const e = raw as LeaderboardEntry | null
    return e && typeof e.solved === 'number' && typeof e.nameKey === 'string' ? e : null
}

const toEntries = (snap: { forEach: (fn: (child: { key: string | null; val: () => unknown }) => void) => void }) => {
    const entries: RankedEntry[] = []
    snap.forEach((child) => {
        const e = toEntry(child.val())
        if (e && child.key) entries.push({ ...e, id: child.key })
    })
    return entries
}

/**
 * Live top 10 of the year, plus this player's own entry and place (which may be outside the
 * top 10). Players with the same score share a place.
 */
export const watchLeaderboard = (
    year: number,
    playerId: string,
    onChange: (top: RankedEntry[], me: LeaderboardEntry | null, myPlace: number | null) => void,
    onError: () => void,
) => {
    let top: RankedEntry[] = []
    let me: LeaderboardEntry | null = null
    let myPlace: number | null = null
    let stopped = false
    const emit = () => onChange(top, me, myPlace)
    const updatePlace = () => {
        if (!me) {
            myPlace = null
            emit()
            return
        }
        const rank = me.rank
        get(query(ref(db(), `leaderboard/${year}`), orderByChild('rank'), startAt(rank + 1)))
            .then((snap) => {
                if (stopped || me?.rank !== rank) return
                myPlace = toEntries(snap).filter((e) => e.rank > rank).length + 1
                emit()
            })
            .catch(() => {})
    }
    const stopTop = onValue(
        // a few extra rows, in case some old ones are left out
        query(ref(db(), `leaderboard/${year}`), orderByChild('rank'), limitToLast(LEADERBOARD_SIZE * 2)),
        (snap) => {
            top = sortEntries(toEntries(snap)).slice(0, LEADERBOARD_SIZE)
            emit()
            updatePlace()
        },
        onError,
    )
    const stopMe = onValue(
        ref(db(), `leaderboard/${year}/${playerId}`),
        (snap) => {
            me = toEntry(snap.val())
            updatePlace()
        },
        onError,
    )
    return () => {
        stopped = true
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
        // an old row without nameKey gets one here, keeping its score
        const e = toStoredEntry(current)
        return e && (e.name !== name || e.nameKey !== nameKey(name))
            ? { ...e, name, nameKey: nameKey(name) }
            : undefined
    })
}

/** Counts a solved day. Throws NameTakenError if the name now belongs to someone else. */
export const submitSolvedDay = async (playerId: string, name: string, day: number, tries: number) => {
    const year = leaderboardYear(day)
    await claimName(playerId, name, year)
    await runTransaction(ref(db(), `leaderboard/${year}/${playerId}`), (current) => {
        const next = addSolvedDay(toStoredEntry(current), name, day, tries)
        return next ?? undefined
    })
}
