import { describe, expect, it } from 'vitest'
import {
    dateFromDayNumber,
    dayNumberFromDate,
    formatDay,
    getDayResult,
    getTodayDayNumber,
    getWordForDay,
} from './archive'
import { getWordOfDay, getWordOfDayIndex } from './words'
import { WORDS } from '../constants/wordlist'

describe('archive dates', () => {
    it('starts counting on 1 January 2022', () => {
        expect(dayNumberFromDate(2022, 0, 1)).toBe(0)
        expect(dayNumberFromDate(2026, 0, 1)).toBe(1461)
        expect(dateFromDayNumber(1461)).toEqual({ year: 2026, month: 0, day: 1 })
        expect(formatDay(1771)).toBe('7 ноември 2026')
    })

    it('gives today the same word as the daily game', () => {
        expect(getTodayDayNumber() % WORDS.length).toBe(getWordOfDayIndex())
        expect(getWordForDay(getTodayDayNumber())).toBe(getWordOfDay())
    })

    it('describes how a day went', () => {
        expect(getDayResult(undefined, 'ЗВОНО')).toBeNull()
        expect(getDayResult(['КВАРЦ'], 'ЗВОНО')).toBe('playing')
        expect(getDayResult(['КВАРЦ', 'ЗВОНО'], 'ЗВОНО')).toBe('won')
        expect(getDayResult(Array(6).fill('КВАРЦ'), 'ЗВОНО')).toBe('lost')
    })
})
