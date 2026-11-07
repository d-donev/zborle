import { getGuessStatuses } from './statuses'

type ShareOptions = {
    guesses: string[]
    solution: string
    isPractice: boolean
    isHardMode: boolean
    isHighContrast: boolean
    dayIndex: number
}

export type ShareResult = 'shared' | 'copied' | 'failed'

const getGameUrl = () => `${window.location.origin}${import.meta.env.BASE_URL}`

export const buildShareText = ({
    guesses,
    solution,
    isPractice,
    isHardMode,
    isHighContrast,
    dayIndex,
}: ShareOptions) => {
    const won = guesses.includes(solution)
    const score = won ? `${guesses.length}/6` : 'X/6'
    const title = isPractice ? 'Зборле (вежба)' : `Зборле #${dayIndex}`
    return `${title} ${score}${isHardMode ? '*' : ''}\n\n${generateEmojiGrid(guesses, solution, isHighContrast)}\n\n${getGameUrl()}`
}

export const shareStatus = async (options: ShareOptions): Promise<ShareResult> => {
    const text = buildShareText(options)
    const isTouchDevice = window.matchMedia?.('(pointer: coarse)').matches

    if (isTouchDevice && navigator.share) {
        try {
            await navigator.share({ text })
            return 'shared'
        } catch (e) {
            if ((e as Error).name === 'AbortError') return 'failed'
        }
    }

    try {
        await navigator.clipboard.writeText(text)
        return 'copied'
    } catch {
        return 'failed'
    }
}

export const generateEmojiGrid = (guesses: string[], solution: string, isHighContrast = false) => {
    return guesses
        .map((guess) => {
            const status = getGuessStatuses(guess, solution)
            return guess
                .split('')
                .map((_, i) => {
                    switch (status[i]) {
                        case 'correct':
                            return isHighContrast ? '🟧' : '🟩'
                        case 'present':
                            return isHighContrast ? '🟦' : '🟨'
                        default:
                            return '⬜'
                    }
                })
                .join('')
        })
        .join('\n')
}
