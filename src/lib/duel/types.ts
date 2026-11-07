export type Role = 'host' | 'guest'

export type DuelPlayer = {
    id: string
    name: string
    online?: boolean
}

export type DuelBoard = {
    guesses: string[]
    /** time of the last guess (or round start); the 1-minute turn timer counts from here */
    lastAt?: number
    /** time the word was guessed; the earliest one wins the round */
    solvedAt?: number
}

export type RoundResult = Role | 'draw'

export type DuelRound = {
    number: number
    solution: string
    /** rounds begin after a short 3-2-1 countdown */
    startsAt: number
    result?: RoundResult
}

export type Duel = {
    code: string
    createdAt: number
    /** wins needed to take the match: 1 or 3 */
    target: number
    players: { host: DuelPlayer; guest?: DuelPlayer }
    ready?: { host?: boolean; guest?: boolean }
    score: { host: number; guest: number }
    round?: DuelRound
    boards?: { host?: DuelBoard; guest?: DuelBoard }
}

export const WORD_LENGTH = 5
export const MAX_GUESSES = 6
export const TURN_MS = 60_000
export const COUNTDOWN_MS = 3_000

/** Stored in place of a guess when the minute ran out without a valid word */
export const TIMEOUT_GUESS = '.....'

export const otherRole = (role: Role): Role => (role === 'host' ? 'guest' : 'host')
