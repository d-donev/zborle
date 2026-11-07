import { describe, expect, it } from 'vitest'
import {
    createDuel,
    expireTurn,
    getMatchWinner,
    getTurnDeadline,
    isDuelExpired,
    joinDuel,
    leaveDuel,
    rematch,
    setReady,
    submitGuess,
} from './logic'
import { Duel, TIMEOUT_GUESS, TURN_MS } from './types'

const WORD = 'ЗВОНО'
const pick = () => WORD

const startedDuel = (target = 1): Duel => {
    let d: Duel | undefined = createDuel('ABCDE', target, { id: 'h', name: 'Ана' }, 0)
    d = joinDuel(d, { id: 'g', name: 'Боне' })!
    d = setReady(d, 'host', 100, pick)!
    d = setReady(d, 'guest', 200, pick)!
    return d
}

describe('duel setup', () => {
    it('lets one guest join and keeps others out', () => {
        const d = joinDuel(createDuel('X', 1, { id: 'h', name: 'A' }, 0), { id: 'g', name: 'B' })!
        expect(d.players.guest?.id).toBe('g')
        expect(joinDuel(d, { id: 'z', name: 'C' })).toBeUndefined()
        expect(joinDuel(d, { id: 'g', name: 'B' })).toBe(d)
    })

    it('starts a round with a countdown only when both are ready', () => {
        let d: Duel | undefined = joinDuel(createDuel('X', 1, { id: 'h', name: 'A' }, 0), { id: 'g', name: 'B' })
        d = setReady(d!, 'host', 100, pick)!
        expect(d.round).toBeUndefined()
        d = setReady(d, 'guest', 200, pick)!
        expect(d.round).toMatchObject({ number: 1, solution: WORD, startsAt: 3200 })
        expect(d.ready).toEqual({ host: false, guest: false })
    })
})

describe('round result', () => {
    it('ignores guesses during the countdown', () => {
        expect(submitGuess(startedDuel(), 'host', WORD, 1000)).toBeUndefined()
    })

    it('gives the round to whoever guesses first', () => {
        let d = startedDuel()
        d = submitGuess(d, 'guest', 'КВАРЦ', 4000)!
        d = submitGuess(d, 'host', WORD, 5000)!
        expect(d.round?.result).toBe('host')
        expect(d.score).toEqual({ host: 1, guest: 0 })
        // the round is over, the other player can't guess any more
        expect(submitGuess(d, 'guest', WORD, 6000)).toBeUndefined()
    })

    it('lets the other player win if the first one runs out of tries', () => {
        let d = startedDuel()
        for (let i = 0; i < 6; i++) d = submitGuess(d, 'host', 'КВАРЦ', 4000 + i)!
        expect(d.round?.result).toBeUndefined()
        d = submitGuess(d, 'guest', WORD, 9000)!
        expect(d.round?.result).toBe('guest')
    })

    it('is a draw with no points when both miss', () => {
        let d = startedDuel()
        for (let i = 0; i < 6; i++) {
            d = submitGuess(d, 'host', 'КВАРЦ', 4000 + i)!
            d = submitGuess(d, 'guest', TIMEOUT_GUESS, 4000 + i)!
        }
        expect(d.round?.result).toBe('draw')
        expect(d.score).toEqual({ host: 0, guest: 0 })
    })

    it('restarts the one-minute timer after every guess', () => {
        let d = startedDuel()
        expect(getTurnDeadline(d, 'host')).toBe(3200 + TURN_MS)
        d = submitGuess(d, 'host', 'КВАРЦ', 10_000)!
        expect(getTurnDeadline(d, 'host')).toBe(10_000 + TURN_MS)
        expect(getTurnDeadline(d, 'guest')).toBe(3200 + TURN_MS)
    })
})

describe('match', () => {
    it('ends at the target number of wins and can be replayed', () => {
        let d = startedDuel(3)
        for (let round = 0; round < 3; round++) {
            if (round > 0) {
                d = setReady(d, 'host', 0, pick)!
                d = setReady(d, 'guest', 0, pick)!
            }
            d = submitGuess(d, 'guest', WORD, d.round!.startsAt + 1)!
        }
        expect(d.score.guest).toBe(3)
        expect(getMatchWinner(d)).toBe('guest')
        expect(setReady(d, 'host', 0, pick)).toBeUndefined()

        const again = rematch(d)!
        expect(again.score).toEqual({ host: 0, guest: 0 })
        expect(again.round).toBeUndefined()
    })

    it('keeps a tally of matches across rematches', () => {
        let d = startedDuel(1)
        d = submitGuess(d, 'host', WORD, d.round!.startsAt + 1)!
        expect(d.matches).toEqual({ host: 1, guest: 0 })
        d = rematch(d)!
        d = setReady(d, 'host', 0, pick)!
        d = setReady(d, 'guest', 0, pick)!
        d = submitGuess(d, 'guest', WORD, d.round!.startsAt + 1)!
        expect(d.matches).toEqual({ host: 1, guest: 1 })
        d = rematch(d)!
        expect(d.matches).toEqual({ host: 1, guest: 1 })
    })
})

describe('time per guess', () => {
    it('uses the time chosen for the duel', () => {
        let d: Duel | undefined = createDuel('X', 1, { id: 'h', name: 'A' }, 0, 30_000)
        d = joinDuel(d, { id: 'g', name: 'B' })!
        d = setReady(d, 'host', 0, pick)!
        d = setReady(d, 'guest', 0, pick)!
        const start = d.round!.startsAt
        expect(getTurnDeadline(d, 'host')).toBe(start + 30_000)
        expect(expireTurn(d, 'host', start + 29_999)).toBeUndefined()
        expect(expireTurn(d, 'host', start + 30_000)?.boards?.host?.guesses).toEqual([TIMEOUT_GUESS])
    })

    it('falls back to one minute for duels created before the option existed', () => {
        const d = startedDuel()
        delete d.turnMs
        expect(getTurnDeadline(d, 'host')).toBe(d.round!.startsAt + TURN_MS)
    })
})

describe('missed turns', () => {
    it('uses up one try per missed minute, counted from each deadline', () => {
        let d = startedDuel()
        const start = d.round!.startsAt
        expect(expireTurn(d, 'guest', start + TURN_MS - 1)).toBeUndefined()
        // away for over three minutes: three tries are gone
        const now = start + 3 * TURN_MS + 500
        for (let i = 0; i < 3; i++) d = expireTurn(d, 'guest', now)!
        expect(d.boards!.guest!.guesses).toEqual([TIMEOUT_GUESS, TIMEOUT_GUESS, TIMEOUT_GUESS])
        expect(expireTurn(d, 'guest', now)).toBeUndefined()
        expect(getTurnDeadline(d, 'guest')).toBe(start + 4 * TURN_MS)
    })

    it('ends the round even if the absent player never comes back', () => {
        let d = startedDuel()
        for (let i = 0; i < 6; i++) d = submitGuess(d, 'host', 'КВАРЦ', 4000 + i)!
        for (let i = 0; i < 6; i++) d = expireTurn(d, 'guest', 10 * TURN_MS)!
        expect(d.round?.result).toBe('draw')
    })
})

describe('leaving and expiry', () => {
    it('marks the first player as gone and deletes the duel when the second leaves', () => {
        let d: Duel | null | undefined = startedDuel()
        d = leaveDuel(d, 'host')
        expect(d?.players.host.left).toBe(true)
        expect(leaveDuel(d!, 'guest')).toBeNull()
    })

    it('deletes a duel nobody joined when the host leaves', () => {
        expect(leaveDuel(createDuel('X', 1, { id: 'h', name: 'A' }, 0), 'host')).toBeNull()
    })

    it('expires only when everybody has been away for over 10 minutes', () => {
        const d = startedDuel()
        const away = (lastSeen: number) => ({ online: false, lastSeen })
        const withPlayers = (host: object, guest: object): Duel => ({
            ...d,
            players: { host: { ...d.players.host, ...host }, guest: { ...d.players.guest!, ...guest } },
        })
        const now = 100 * 60_000
        expect(isDuelExpired(withPlayers(away(0), away(0)), now)).toBe(true)
        expect(isDuelExpired(withPlayers(away(0), { online: true }), now)).toBe(false)
        expect(isDuelExpired(withPlayers(away(now - 5 * 60_000), away(0)), now)).toBe(false)
        // local test mode has no presence information, so it never expires
        expect(isDuelExpired(d, now)).toBe(false)
    })
})
