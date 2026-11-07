import { describe, expect, it } from 'vitest'
import { addSolvedDay, averageTries, cleanName, nameKey, computeRank, leaderboardYear, sortEntries } from './leaderboard'
import { dayNumberFromDate } from './archive'

describe('leaderboard', () => {
    it('counts each solved day once', () => {
        const first = addSolvedDay(null, 'Ана', 100, 3)!
        expect(first).toEqual({ name: 'Ана', nameKey: 'ана', solved: 1, tries: 3, lastDay: 100, rank: computeRank(1, 3) })
        expect(addSolvedDay(first, 'Ана', 100, 2)).toBeNull()
        expect(addSolvedDay(first, 'Ана', 99, 2)).toBeNull()
        const second = addSolvedDay(first, 'Ана', 101, 5)!
        expect(second.solved).toBe(2)
        expect(second.tries).toBe(8)
        expect(averageTries(second)).toBe('4,0')
    })

    it('ranks more words first, then fewer guesses', () => {
        const e = (id: string, solved: number, tries: number) => ({
            id,
            name: id,
            nameKey: id,
            solved,
            tries,
            lastDay: 1,
            rank: computeRank(solved, tries),
        })
        const sorted = sortEntries([e('a', 3, 15), e('b', 4, 20), e('c', 3, 9)])
        expect(sorted.map((x) => x.id)).toEqual(['b', 'c', 'a'])
    })

    it('uses the calendar year of the day', () => {
        expect(leaderboardYear(dayNumberFromDate(2026, 11, 31))).toBe(2026)
        expect(leaderboardYear(dayNumberFromDate(2027, 0, 1))).toBe(2027)
    })

    it('tidies names', () => {
        expect(cleanName('  Марко   Петров  ')).toBe('Марко Петров')
        expect(cleanName('x'.repeat(30))).toHaveLength(20)
        expect(cleanName('a.b#c$d[e]f/g')).toBe('abcdefg')
        expect(nameKey(' Марко  ПЕТРОВ ')).toBe('марко петров')
    })
})
