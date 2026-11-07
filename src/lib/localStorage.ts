const readJson = <T>(key: string): T | null => {
    try {
        const value = localStorage.getItem(key)
        return value ? (JSON.parse(value) as T) : null
    } catch {
        return null
    }
}

const writeJson = (key: string, value: unknown) => {
    try {
        localStorage.setItem(key, JSON.stringify(value))
    } catch {
        // Storage full or blocked (private mode) - the game still works, it just won't be remembered
    }
}

const gameStateKey = 'gameState'

type StoredGameState = {
    guesses: string[]
    solutionIndex: number
}

export const saveGameStateToLocalStorage = (gameState: StoredGameState) => {
    writeJson(gameStateKey, gameState)
}

export const loadGameStateFromLocalStorage = () => readJson<StoredGameState>(gameStateKey)

const practiceStateKey = 'zborle-practice'

export type PracticeState = {
    guesses: string[]
    solution: string
}

export const savePracticeState = (state: PracticeState) => {
    writeJson(practiceStateKey, state)
}

export const loadPracticeState = () => readJson<PracticeState>(practiceStateKey)

export type GameStats = {
    winDistribution: number[]
    gamesFailed: number
    currentStreak: number
    bestStreak: number
    totalGames: number
    successRate: number
    lastPlayedIndex?: number
}

export type StatsKey = 'gameStats' | 'zborle-practice-stats'

export const saveStatsToLocalStorage = (gameStats: GameStats, key: StatsKey = 'gameStats') => {
    writeJson(key, gameStats)
}

export const loadStatsFromLocalStorage = (key: StatsKey = 'gameStats') => readJson<GameStats>(key)

export const loadBoolean = (key: string, fallback: boolean) => {
    try {
        const value = localStorage.getItem(key)
        return value === null ? fallback : value === 'true'
    } catch {
        return fallback
    }
}

export const saveBoolean = (key: string, value: boolean) => {
    try {
        localStorage.setItem(key, String(value))
    } catch {
        // ignore
    }
}

export type GameMode = 'daily' | 'practice'

export const loadGameMode = (): GameMode => {
    try {
        return localStorage.getItem('zborle-mode') === 'practice' ? 'practice' : 'daily'
    } catch {
        return 'daily'
    }
}

export const saveGameMode = (mode: GameMode) => {
    try {
        localStorage.setItem('zborle-mode', mode)
    } catch {
        // ignore
    }
}
