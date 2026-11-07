export type Role = 'host' | 'guest'

export type DuelPlayer = {
    id: string
    name: string
    online?: boolean
    /** server time the player last disconnected */
    lastSeen?: number
    /** pressed "leave"; the duel is deleted once both have left */
    left?: boolean
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
    /** time allowed per guess; older duels without it use TURN_MS */
    turnMs?: number
    players: { host: DuelPlayer; guest?: DuelPlayer }
    ready?: { host?: boolean; guest?: boolean }
    score: { host: number; guest: number }
    /** matches won by each player, kept across rematches */
    matches?: { host: number; guest: number }
    round?: DuelRound
    boards?: { host?: DuelBoard; guest?: DuelBoard }
}

export const WORD_LENGTH = 5
export const MAX_GUESSES = 6
export const TURN_MS = 60_000
export const TURN_OPTIONS = [30_000, 60_000, 120_000]

export const formatTurnTime = (ms: number) => (ms < 60_000 ? `${ms / 1000} секунди` : ms === 60_000 ? '1 минута' : `${ms / 60_000} минути`)
export const COUNTDOWN_MS = 3_000
/** a duel with every player away this long is deleted the next time its link is opened */
export const DUEL_EXPIRY_MS = 10 * 60_000
/** the opponent's screen gives a late player this much extra time before using up their try */
export const OPPONENT_GRACE_MS = 3_000

/** Stored in place of a guess when the minute ran out without a valid word */
export const TIMEOUT_GUESS = '.....'

export const otherRole = (role: Role): Role => (role === 'host' ? 'guest' : 'host')
