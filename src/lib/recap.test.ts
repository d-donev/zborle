import { describe, expect, it } from 'vitest'
import { computeYearStats, getRecapYear } from './recap'
import { dayNumberFromDate, getWordForDay } from './archive'

describe('getRecapYear', () => {
    const on = (y: number, m: number, d: number) => getRecapYear(dayNumberFromDate(y, m, d), '')

    it('offers the card from 31 December to 7 January only', () => {
        expect(on(2026, 11, 30)).toBeNull()
        expect(on(2026, 11, 31)).toBe(2026)
        expect(on(2027, 0, 1)).toBe(2026)
        expect(on(2027, 0, 7)).toBe(2026)
        expect(on(2027, 0, 8)).toBeNull()
    })

    it('can be forced with ?recap=YEAR to try it out', () => {
        expect(getRecapYear(dayNumberFromDate(2026, 5, 1), '?recap=2026')).toBe(2026)
    })
})

describe('computeYearStats', () => {
    it('counts solved days, the best streak and the average', () => {
        const day = (m: number, d: number) => dayNumberFromDate(2026, m, d)
        const win = (n: number, tries: number) => [...Array(tries - 1).fill('КВАРЦ'), getWordForDay(n)]
        const archive = {
            [day(0, 1)]: win(day(0, 1), 2),
            [day(0, 2)]: win(day(0, 2), 4),
            [day(0, 3)]: Array(6).fill('КВАРЦ'),
            [day(0, 4)]: win(day(0, 4), 3),
            [day(0, 5)]: ['КВАРЦ'],
        }
        const stats = computeYearStats(archive, 2026, day(0, 10))
        expect(stats.solved).toBe(3)
        expect(stats.missed).toBe(1)
        expect(stats.played).toBe(5)
        expect(stats.bestStreak).toBe(2)
        expect(stats.averageTries).toBe(3)
        expect(stats.days).toHaveLength(365)
        expect(stats.days[0]).toBe('won')
        expect(stats.days[20]).toBe('future')
    })
})
