import { WORDS } from '../constants/wordlist'

/*
 * Past daily words. Every calendar day since 1 January 2022 has a "day number"; its word is
 * WORDS[dayNumber % WORDS.length], the same rule the daily game uses. What the player guessed on
 * each day is kept in localStorage (about 60 bytes per day played).
 */

const EPOCH_START = 1640995200000 // 1 January 2022, the game's first day
const MS_IN_DAY = 86400000
const ARCHIVE_KEY = 'zborle-archive'

export const MONTHS = [
    'јануари',
    'февруари',
    'март',
    'април',
    'мај',
    'јуни',
    'јули',
    'август',
    'септември',
    'октомври',
    'ноември',
    'декември',
]

/** Today's day number in the player's own time zone (matches getWordOfDayIndex) */
export const getTodayDayNumber = (now = Date.now()) =>
    Math.floor((now - EPOCH_START - new Date(now).getTimezoneOffset() * 60000) / MS_IN_DAY)

export const dayNumberFromDate = (year: number, month: number, day: number) =>
    Math.round((Date.UTC(year, month, day) - EPOCH_START) / MS_IN_DAY)

export const dateFromDayNumber = (dayNumber: number) => {
    const date = new Date(EPOCH_START + dayNumber * MS_IN_DAY)
    return { year: date.getUTCFullYear(), month: date.getUTCMonth(), day: date.getUTCDate() }
}

export const getWordForDay = (dayNumber: number) => WORDS[dayNumber % WORDS.length].toUpperCase()

export const formatDay = (dayNumber: number) => {
    const { year, month, day } = dateFromDayNumber(dayNumber)
    return `${day} ${MONTHS[month]} ${year}`
}

export const formatDayShort = (dayNumber: number) => {
    const { year, month, day } = dateFromDayNumber(dayNumber)
    return `${day}.${month + 1}.${year}`
}

export type Archive = Record<string, string[]>

export const loadArchive = (): Archive => {
    try {
        const parsed = JSON.parse(localStorage.getItem(ARCHIVE_KEY) || '{}')
        return parsed && typeof parsed === 'object' ? (parsed as Archive) : {}
    } catch {
        return {}
    }
}

export const saveArchive = (archive: Archive) => {
    try {
        localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archive))
    } catch {
        // storage full or blocked - the game still works
    }
}

export type DayResult = 'won' | 'lost' | 'playing'

export const getDayResult = (guesses: string[] | undefined, solution: string): DayResult | null => {
    if (!guesses || guesses.length === 0) return null
    if (guesses.includes(solution)) return 'won'
    return guesses.length >= 6 ? 'lost' : 'playing'
}
