import { GameStats, loadStatsFromLocalStorage, saveStatsToLocalStorage, StatsKey } from './localStorage'

// In stats array elements 0-5 are successes in 1-6 trys

/**
 * @param count number of incorrect guesses before the end (6 means the game was lost)
 * @param dayIndex index of the daily word; a skipped day resets the streak. Omit for practice games.
 */
export const addStatsForCompletedGame = (
    gameStats: GameStats,
    count: number,
    dayIndex?: number,
    key: StatsKey = 'gameStats',
) => {
    const stats: GameStats = { ...gameStats, winDistribution: [...gameStats.winDistribution] }

    if (dayIndex !== undefined && stats.lastPlayedIndex !== undefined && dayIndex - stats.lastPlayedIndex > 1) {
        stats.currentStreak = 0
    }

    stats.totalGames += 1

    if (count > 5) {
        // A fail situation
        stats.currentStreak = 0
        stats.gamesFailed += 1
    } else {
        stats.winDistribution[count] += 1
        stats.currentStreak += 1

        if (stats.bestStreak < stats.currentStreak) {
            stats.bestStreak = stats.currentStreak
        }
    }

    if (dayIndex !== undefined) {
        stats.lastPlayedIndex = dayIndex
    }
    stats.successRate = getSuccessRate(stats)

    saveStatsToLocalStorage(stats, key)
    return stats
}

const createDefaultStats = (): GameStats => ({
    winDistribution: [0, 0, 0, 0, 0, 0],
    gamesFailed: 0,
    currentStreak: 0,
    bestStreak: 0,
    totalGames: 0,
    successRate: 0,
})

/**
 * @param todayIndex when given, a streak whose last game is older than yesterday is shown as broken
 */
export const loadStats = (key: StatsKey = 'gameStats', todayIndex?: number): GameStats => {
    const stats = loadStatsFromLocalStorage(key) || createDefaultStats()
    if (todayIndex !== undefined && stats.lastPlayedIndex !== undefined && todayIndex - stats.lastPlayedIndex > 1) {
        return { ...stats, currentStreak: 0 }
    }
    return stats
}

const getSuccessRate = (gameStats: GameStats) => {
    const { totalGames, gamesFailed } = gameStats
    return Math.round((100 * (totalGames - gamesFailed)) / Math.max(totalGames, 1))
}
