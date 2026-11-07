import {
    COUNTDOWN_MS,
    Duel,
    DuelBoard,
    DuelPlayer,
    DUEL_EXPIRY_MS,
    MAX_GUESSES,
    otherRole,
    Role,
    RoundResult,
    TIMEOUT_GUESS,
    TURN_MS,
} from './types'

/*
 * Pure state transitions for a duel. Each one takes the current duel and returns the next one,
 * or undefined when the action isn't allowed (the store then leaves the duel untouched).
 * They run inside store transactions, so both players can call them safely at the same time.
 */

export const createDuel = (
    code: string,
    target: number,
    host: DuelPlayer,
    now: number,
    turnMs: number = TURN_MS,
): Duel => ({
    code,
    createdAt: now,
    target,
    turnMs,
    players: { host },
    score: { host: 0, guest: 0 },
})

export const getRole = (duel: Duel, playerId: string): Role | null => {
    if (duel.players.host.id === playerId) return 'host'
    if (duel.players.guest?.id === playerId) return 'guest'
    return null
}

export const joinDuel = (duel: Duel | null, guest: DuelPlayer): Duel | undefined => {
    if (!duel) return undefined
    if (getRole(duel, guest.id)) return duel
    if (duel.players.guest) return undefined
    return { ...duel, players: { ...duel.players, guest } }
}

export const getMatchWinner = (duel: Duel): Role | null => {
    if (duel.score.host >= duel.target) return 'host'
    if (duel.score.guest >= duel.target) return 'guest'
    return null
}

export const isRoundActive = (duel: Duel) => !!duel.round && !duel.round.result

const emptyBoard = (startsAt: number): DuelBoard => ({ guesses: [], lastAt: startsAt })

/** Marks a player ready; when both are ready a new round starts with a fresh word */
export const setReady = (duel: Duel | null, role: Role, now: number, pickWord: () => string): Duel | undefined => {
    if (!duel || !duel.players.guest || isRoundActive(duel) || getMatchWinner(duel)) return undefined

    const ready = { ...duel.ready, [role]: true }
    if (!ready.host || !ready.guest) {
        return { ...duel, ready }
    }

    const startsAt = now + COUNTDOWN_MS
    return {
        ...duel,
        ready: { host: false, guest: false },
        round: { number: (duel.round?.number ?? 0) + 1, solution: pickWord(), startsAt },
        boards: { host: emptyBoard(startsAt), guest: emptyBoard(startsAt) },
    }
}

export const isBoardDone = (board: DuelBoard | undefined) =>
    !!board && (board.solvedAt !== undefined || board.guesses.length >= MAX_GUESSES)

export const getTurnMs = (duel: Duel) => duel.turnMs ?? TURN_MS

/** When the current guess must be in: the chosen time after the previous guess (or the round start) */
export const getTurnDeadline = (duel: Duel, role: Role) => {
    const board = duel.boards?.[role]
    return (board?.lastAt ?? duel.round?.startsAt ?? 0) + getTurnMs(duel)
}

export const submitGuess = (duel: Duel | null, role: Role, guess: string, now: number): Duel | undefined => {
    if (!duel?.round || duel.round.result || now < duel.round.startsAt) return undefined
    const board = duel.boards?.[role] ?? emptyBoard(duel.round.startsAt)
    if (isBoardDone(board)) return undefined

    const nextBoard: DuelBoard = { ...board, guesses: [...board.guesses, guess], lastAt: now }
    if (guess === duel.round.solution) {
        nextBoard.solvedAt = now
    }
    return resolveRound({ ...duel, boards: { ...duel.boards, [role]: nextBoard } })
}

/**
 * Uses up a try whose minute has run out. Either player's screen may call it, so a player who
 * walks away keeps losing a try every minute and the round can't get stuck waiting for them.
 * The next minute counts from the missed deadline, not from when this happened to run.
 */
export const expireTurn = (duel: Duel | null, role: Role, now: number): Duel | undefined => {
    if (!duel?.round || duel.round.result || now < duel.round.startsAt) return undefined
    const board = duel.boards?.[role] ?? emptyBoard(duel.round.startsAt)
    if (isBoardDone(board)) return undefined
    const deadline = getTurnDeadline(duel, role)
    if (now < deadline) return undefined

    const nextBoard: DuelBoard = { ...board, guesses: [...board.guesses, TIMEOUT_GUESS], lastAt: deadline }
    return resolveRound({ ...duel, boards: { ...duel.boards, [role]: nextBoard } })
}

/**
 * A player presses "leave". The first one is only marked as gone (the other sees a message);
 * once nobody is left, the duel is deleted (null) and its link stops working.
 */
export const leaveDuel = (duel: Duel | null, role: Role): Duel | null | undefined => {
    if (!duel) return undefined
    const me = duel.players[role]
    const other = duel.players[otherRole(role)]
    if (!me) return undefined
    if (!other || other.left) return null
    return { ...duel, players: { ...duel.players, [role]: { ...me, left: true } } }
}

/** Every player has left or has been offline for more than 10 minutes */
export const isDuelExpired = (duel: Duel, now: number) => {
    const seated = [duel.players.host, duel.players.guest].filter((p): p is DuelPlayer => !!p)
    return seated.every(
        (p) => p.left || (p.online === false && p.lastSeen !== undefined && now - p.lastSeen > DUEL_EXPIRY_MS),
    )
}

/**
 * Decides the round as soon as possible:
 * - the first player to guess the word wins (even if the other one is still playing)
 * - if both use all 6 tries without guessing, it's a draw and nobody scores
 */
export const getRoundResult = (duel: Duel): RoundResult | null => {
    const host = duel.boards?.host
    const guest = duel.boards?.guest
    const hostSolved = host?.solvedAt
    const guestSolved = guest?.solvedAt

    if (hostSolved !== undefined && guestSolved !== undefined) {
        return hostSolved <= guestSolved ? 'host' : 'guest'
    }
    if (hostSolved !== undefined) return 'host'
    if (guestSolved !== undefined) return 'guest'
    if (isBoardDone(host) && isBoardDone(guest)) return 'draw'
    return null
}

export const resolveRound = (duel: Duel): Duel => {
    if (!duel.round || duel.round.result) return duel
    const result = getRoundResult(duel)
    if (!result) return duel

    const score = { ...duel.score }
    if (result !== 'draw') {
        score[result] += 1
    }
    const next: Duel = { ...duel, score, round: { ...duel.round, result } }

    // A won match goes on the tally that survives rematches
    const matchWinner = getMatchWinner(next)
    if (matchWinner) {
        const matches = { host: 0, guest: 0, ...duel.matches }
        matches[matchWinner] += 1
        next.matches = matches
    }
    return next
}

/** Start the match over with the same two players */
export const rematch = (duel: Duel | null): Duel | undefined => {
    if (!duel || !getMatchWinner(duel)) return undefined
    const next: Duel = { ...duel, score: { host: 0, guest: 0 }, ready: { host: false, guest: false } }
    delete next.round
    delete next.boards
    return next
}

export const getOpponent = (duel: Duel, role: Role) => duel.players[otherRole(role)]
