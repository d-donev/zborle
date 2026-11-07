import { dateFromDayNumber } from './archive'

/**
 * Yearly top-10 of the daily word. Only today's word, solved today, counts: past days from the
 * calendar, practice and duels never do, and the database refuses a day that isn't (about) today.
 */
export type LeaderboardEntry = {
    name: string
    /** the reserved form of the name (see nameKey) - each one belongs to one player per year */
    nameKey: string
    /** daily words solved this year */
    solved: number
    /** total guesses those words took */
    tries: number
    /** last day number counted, so a day is never counted twice */
    lastDay: number
    /** sort key: more words first, then fewer guesses (checked by the database rules too) */
    rank: number
}

export type RankedEntry = LeaderboardEntry & { id: string }

export const LEADERBOARD_SIZE = 10
export const NAME_MAX_LENGTH = 20

export const leaderboardYear = (day: number) => dateFromDayNumber(day).year

export const computeRank = (solved: number, tries: number) => solved * 10000 - tries

/** Characters the database doesn't allow in keys are dropped */
export const cleanName = (name: string) =>
    name
        .replace(/[.#$[\]/]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, NAME_MAX_LENGTH)

/** Names are unique regardless of case: "Марко" and "марко" are the same name */
export const nameKey = (name: string) => cleanName(name).toLocaleLowerCase('mk')

/** The entry after solving `day` in `tries` guesses, or null when that day is already counted */
export const addSolvedDay = (
    current: LeaderboardEntry | null,
    name: string,
    day: number,
    tries: number,
): LeaderboardEntry | null => {
    if (current && current.lastDay >= day) return null
    const solved = (current?.solved ?? 0) + 1
    const total = (current?.tries ?? 0) + tries
    return { name, nameKey: nameKey(name), solved, tries: total, lastDay: day, rank: computeRank(solved, total) }
}

export const sortEntries = (entries: RankedEntry[]) =>
    [...entries].sort((a, b) => b.rank - a.rank || a.name.localeCompare(b.name, 'mk'))

export const averageTries = (entry: LeaderboardEntry) =>
    entry.solved ? (entry.tries / entry.solved).toFixed(1).replace('.', ',') : '–'

/** What this device remembers: the name it plays under and the last day it sent */
export type LeaderboardProfile = {
    name: string | null
    sentDay: number | null
}

const PROFILE_KEY = 'zborle-leaderboard'

export const loadLeaderboardProfile = (): LeaderboardProfile => {
    try {
        const raw = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null')
        return {
            name: typeof raw?.name === 'string' && raw.name ? raw.name : null,
            sentDay: typeof raw?.sentDay === 'number' ? raw.sentDay : null,
        }
    } catch {
        return { name: null, sentDay: null }
    }
}

export const saveLeaderboardProfile = (profile: LeaderboardProfile) => {
    try {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
    } catch {
        // ignore
    }
}
