// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { getGuessStatuses, getStatuses } from './statuses'
import { findHardModeViolation } from './hardMode'
import { generateEmojiGrid } from './share'
import { addStatsForCompletedGame, loadStats } from './stats'

describe('getGuessStatuses', () => {
    it('marks correct, present and absent letters', () => {
        expect(getGuessStatuses('ВОЗАЧ', 'ЗВОНО')).toEqual(['present', 'present', 'present', 'absent', 'absent'])
        expect(getGuessStatuses('ЗВОНО', 'ЗВОНО')).toEqual(Array(5).fill('correct'))
    })

    it('does not count a repeated letter more times than it appears', () => {
        // solution has one А; the second А in the guess must be absent
        expect(getGuessStatuses('АААБВ', 'ГАДЕЖ')).toEqual(['absent', 'correct', 'absent', 'absent', 'absent'])
    })

    it('keeps a keyboard key green once it was correct', () => {
        const statuses = getStatuses(['ГАДЕЖ', 'АБВГД'], 'ГАДЕЖ')
        expect(statuses['Г']).toBe('correct')
        expect(statuses['Б']).toBe('absent')
    })
})

describe('findHardModeViolation', () => {
    const solution = 'ЗВОНО'

    it('requires green letters to stay in place', () => {
        expect(findHardModeViolation('АВАБВ', ['КВАРЦ'], solution)).toBeNull()
        expect(findHardModeViolation('АБАВВ', ['КВАРЦ'], solution)).toBe('2. буква мора да биде В')
    })

    it('requires yellow letters to be reused', () => {
        expect(findHardModeViolation('АБВГД', ['ОРАЛА'], solution)).toBe('Зборот мора да ја содржи буквата О')
        expect(findHardModeViolation('ОБВГД', ['ОРАЛА'], solution)).toBeNull()
    })

    it('accepts any guess when nothing was revealed', () => {
        expect(findHardModeViolation('АБВГД', [], solution)).toBeNull()
    })
})

describe('generateEmojiGrid', () => {
    it('uses orange/blue squares in high-contrast mode', () => {
        expect(generateEmojiGrid(['ЗВАКА'], 'ЗВОНО')).toBe('🟩🟩⬜⬜⬜')
        expect(generateEmojiGrid(['ЗВАКА'], 'ЗВОНО', true)).toBe('🟧🟧⬜⬜⬜')
    })
})

describe('addStatsForCompletedGame', () => {
    beforeEach(() => localStorage.clear())
    const base = () => loadStats('zborle-practice-stats')

    it('does not mutate the stats it is given', () => {
        const stats = base()
        addStatsForCompletedGame(stats, 2, undefined, 'zborle-practice-stats')
        expect(stats.winDistribution[2]).toBe(0)
    })

    it('resets the streak when a day was skipped', () => {
        let stats = addStatsForCompletedGame(base(), 0, 10)
        stats = addStatsForCompletedGame(stats, 0, 11)
        expect(stats.currentStreak).toBe(2)
        stats = addStatsForCompletedGame(stats, 0, 13)
        expect(stats.currentStreak).toBe(1)
        expect(stats.bestStreak).toBe(2)
    })
})
