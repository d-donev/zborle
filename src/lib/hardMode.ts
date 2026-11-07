import { getGuessStatuses } from './statuses'

/**
 * In hard mode every revealed hint must be used in the next guesses:
 * green letters must stay in place and yellow letters must appear somewhere.
 * Returns a message describing the first broken rule, or null if the guess is fine.
 */
export const findHardModeViolation = (guess: string, guesses: string[], solution: string): string | null => {
    const letters = guess.split('')

    for (const previous of guesses) {
        const statuses = getGuessStatuses(previous, solution)
        for (let i = 0; i < previous.length; i++) {
            if (statuses[i] === 'correct' && letters[i] !== previous[i]) {
                return `${i + 1}. буква мора да биде ${previous[i]}`
            }
        }
    }

    // How many times each revealed letter must appear (handles repeated letters)
    const required: Record<string, number> = {}
    for (const previous of guesses) {
        const statuses = getGuessStatuses(previous, solution)
        const counts: Record<string, number> = {}
        previous.split('').forEach((letter, i) => {
            if (statuses[i] === 'correct' || statuses[i] === 'present') {
                counts[letter] = (counts[letter] || 0) + 1
            }
        })
        Object.entries(counts).forEach(([letter, count]) => {
            required[letter] = Math.max(required[letter] || 0, count)
        })
    }

    for (const [letter, count] of Object.entries(required)) {
        const used = letters.filter((l) => l === letter).length
        if (used < count) {
            return `Зборот мора да ја содржи буквата ${letter}`
        }
    }

    return null
}
