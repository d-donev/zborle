import {
    ArrowPathIcon,
    ChartBarIcon,
    Cog6ToothIcon,
    InformationCircleIcon,
    QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline'
import classnames from 'classnames'
import { useEffect, useRef, useState } from 'react'
import { Alert } from './components/alerts/Alert'
import { Grid } from './components/grid/Grid'
import { Keyboard } from './components/keyboard/Keyboard'
import { AboutModal } from './components/modals/AboutModal'
import { InfoModal } from './components/modals/InfoModal'
import { GameOverModal } from './components/modals/GameOverModal'
import { ShortcutsModal } from './components/modals/ShortcutsModal'
import { SettingsModal } from './components/modals/SettingsModal'
import { StatsModal } from './components/modals/StatsModals'
import { Confetti } from './components/ui/Confetti'
import { ThemeToggle } from './components/ui/ThemeToggle'
import { SoundToggle } from './components/ui/SoundToggle'
import {
    getRandomWord,
    getTimeUntilNextWord,
    getWordByIndex,
    getWordOfDay,
    getWordOfDayIndex,
    isWordInWordList,
} from './lib/words'
import {
    GameMode,
    loadGameMode,
    loadGameStateFromLocalStorage,
    loadPracticeState,
    PracticeState,
    saveGameMode,
    saveGameStateToLocalStorage,
    savePracticeState,
} from './lib/localStorage'
import { convert, LETTERS_EN } from './lib/keyboard'
import { addStatsForCompletedGame, loadStats } from './lib/stats'
import { findHardModeViolation } from './lib/hardMode'
import { shareStatus } from './lib/share'
import { useSound } from './contexts/SoundContext'
import { useSettings } from './contexts/SettingsContext'

const WORD_LENGTH = 5
const MAX_GUESSES = 6
const DAILY_STATS = 'gameStats'
const PRACTICE_STATS = 'zborle-practice-stats'

type AlertVariant = 'success' | 'warning' | 'error'

const vibrate = (pattern: number | number[]) => {
    try {
        navigator.vibrate?.(pattern)
    } catch {
        // not supported
    }
}

const createPracticeGame = (exclude?: string): PracticeState => ({
    solution: getRandomWord(exclude ?? getWordOfDay()),
    guesses: [],
})

const headerButton =
    'p-2 rounded-lg transition-all duration-200 hover:bg-slate-200 dark:hover:bg-slate-700 hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400'

function App() {
    const { playSound } = useSound()
    const { isHardMode, isHighContrast } = useSettings()

    const [isFirstVisit] = useState(() => loadGameStateFromLocalStorage() == null)
    const [mode, setMode] = useState<GameMode>(loadGameMode)
    const [dayIndex, setDayIndex] = useState(getWordOfDayIndex)
    const [dailyGuesses, setDailyGuesses] = useState<string[]>(() => {
        const loaded = loadGameStateFromLocalStorage()
        return loaded?.solutionIndex === getWordOfDayIndex() ? loaded.guesses : []
    })
    const [practice, setPractice] = useState<PracticeState>(() => {
        const loaded = loadPracticeState()
        return loaded?.solution?.length === WORD_LENGTH ? loaded : createPracticeGame()
    })
    const [currentGuess, setCurrentGuess] = useState('')
    const [dailyStats, setDailyStats] = useState(() => loadStats(DAILY_STATS, getWordOfDayIndex()))
    const [practiceStats, setPracticeStats] = useState(() => loadStats(PRACTICE_STATS))
    const [timeUntilNextWord, setTimeUntilNextWord] = useState(getTimeUntilNextWord)

    const [isInfoModalOpen, setIsInfoModalOpen] = useState(isFirstVisit)
    const [isAboutModalOpen, setIsAboutModalOpen] = useState(false)
    const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false)
    const [isStatsModalOpen, setIsStatsModalOpen] = useState(false)
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
    const [isGameOverModalOpen, setIsGameOverModalOpen] = useState(false)
    const [isWinAnimationStarted, setIsWinAnimationStarted] = useState(false)
    const [isRowInvalid, setIsRowInvalid] = useState(false)
    const [celebration, setCelebration] = useState(0)
    const [alert, setAlert] = useState<{ open: boolean; message: string; variant: AlertVariant }>({
        open: false,
        message: '',
        variant: 'error',
    })
    const alertTimer = useRef<number | undefined>(undefined)

    const isPractice = mode === 'practice'
    const solution = isPractice ? practice.solution : getWordByIndex(dayIndex)
    const guesses = isPractice ? practice.guesses : dailyGuesses
    const stats = isPractice ? practiceStats : dailyStats
    const isGameWon = guesses.includes(solution)
    const isGameLost = !isGameWon && guesses.length >= MAX_GUESSES
    const isGameOver = isGameWon || isGameLost
    const isGameInProgress = guesses.length > 0 && !isGameOver

    const setGuesses = (next: string[]) => {
        if (isPractice) {
            setPractice((p) => ({ ...p, guesses: next }))
        } else {
            setDailyGuesses(next)
        }
    }

    const showAlert = (message: string, variant: AlertVariant = 'error', duration = 2000) => {
        window.clearTimeout(alertTimer.current)
        setAlert({ open: true, message, variant })
        alertTimer.current = window.setTimeout(() => setAlert((a) => ({ ...a, open: false })), duration)
    }

    const rejectGuess = (message: string) => {
        showAlert(message)
        playSound('invalid')
        vibrate(80)
        setIsRowInvalid(true)
        window.setTimeout(() => setIsRowInvalid(false), 600)
    }

    // Persist state
    useEffect(() => {
        saveGameStateToLocalStorage({ guesses: dailyGuesses, solutionIndex: dayIndex })
    }, [dailyGuesses, dayIndex])

    useEffect(() => {
        savePracticeState(practice)
    }, [practice])

    useEffect(() => {
        saveGameMode(mode)
    }, [mode])

    // Countdown to the next word, and roll over to the new word at midnight
    useEffect(() => {
        const timer = window.setInterval(() => {
            const next = getTimeUntilNextWord()
            setTimeUntilNextWord(next)
            if (next.solutionIndex !== dayIndex) {
                setDayIndex(next.solutionIndex)
                setDailyGuesses([])
                setDailyStats(loadStats(DAILY_STATS, next.solutionIndex))
                if (mode === 'daily') {
                    setCurrentGuess('')
                }
            }
        }, 1000)
        return () => window.clearInterval(timer)
    }, [dayIndex, mode])

    // Win animation, then the end-of-game dialog
    useEffect(() => {
        if (!isGameOver) {
            setIsGameOverModalOpen(false)
            setIsWinAnimationStarted(false)
            return
        }
        const winTimer = isGameWon
            ? window.setTimeout(() => setIsWinAnimationStarted(true), 150 * WORD_LENGTH + 250)
            : undefined
        const modalTimer = window.setTimeout(() => setIsGameOverModalOpen(true), isGameWon ? 2500 : 1600)
        return () => {
            window.clearTimeout(winTimer)
            window.clearTimeout(modalTimer)
        }
    }, [isGameOver, isGameWon, mode, solution])

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault()
                setIsShortcutsModalOpen(true)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    const recordResult = (count: number) => {
        if (isPractice) {
            setPracticeStats((s) => addStatsForCompletedGame(s, count, undefined, PRACTICE_STATS))
        } else {
            setDailyStats((s) => addStatsForCompletedGame(s, count, dayIndex, DAILY_STATS))
        }
    }

    const onChar = (value: string) => {
        if (isGameOver) {
            return
        }
        const converted = LETTERS_EN.includes(value) ? convert(value) : value
        // functional updates so very fast typing never loses a letter
        setCurrentGuess((g) => (g.length < WORD_LENGTH ? `${g}${converted}` : g))
        playSound('keypress')
    }

    const onDelete = () => {
        if (isGameOver) {
            return
        }
        setCurrentGuess((g) => g.slice(0, -1))
        playSound('delete')
    }

    const onEnter = () => {
        if (isGameOver) {
            return
        }
        if (currentGuess.length !== WORD_LENGTH) {
            return rejectGuess('Немате внесено доволно букви')
        }
        if (!isWordInWordList(currentGuess)) {
            return rejectGuess('Зборот не е пронајден во речникот на Зборле')
        }
        if (isHardMode) {
            const violation = findHardModeViolation(currentGuess, guesses, solution)
            if (violation) {
                return rejectGuess(violation)
            }
        }

        const nextGuesses = [...guesses, currentGuess]
        setGuesses(nextGuesses)
        setCurrentGuess('')
        playSound('enter')

        if (currentGuess === solution) {
            recordResult(guesses.length)
            window.setTimeout(() => {
                playSound('win')
                vibrate([60, 40, 60])
                setCelebration((c) => c + 1)
            }, 150 * WORD_LENGTH + 250)
        } else if (nextGuesses.length === MAX_GUESSES) {
            recordResult(MAX_GUESSES)
            window.setTimeout(() => playSound('lose'), 500)
        }
    }

    const switchMode = (next: GameMode) => {
        if (next === mode) return
        setMode(next)
        setCurrentGuess('')
        setIsGameOverModalOpen(false)
    }

    const startNewPracticeGame = () => {
        if (isPractice && isGameInProgress) {
            // Skipping a word counts as a loss so practice stats stay honest
            recordResult(MAX_GUESSES)
            showAlert(`Зборот беше ${practice.solution}`, 'warning', 2500)
        }
        setPractice(createPracticeGame(practice.solution))
        setCurrentGuess('')
        setIsGameOverModalOpen(false)
    }

    const handleShare = async () => {
        const result = await shareStatus({
            guesses,
            solution,
            isPractice,
            isHardMode,
            isHighContrast,
            dayIndex,
        })
        if (result === 'copied') {
            showAlert('Резултатот е копиран, залепете го каде сакате', 'success')
        } else if (result === 'failed') {
            showAlert('Не успеавме да го споделиме резултатот')
        }
    }

    return (
        <div className="min-h-screen bg-white dark:bg-slate-900 transition-colors duration-300">
            <Confetti trigger={celebration} />
            <div className="py-6 max-w-7xl mx-auto sm:px-6 lg:px-8">
                <Alert message={alert.message} isOpen={alert.open} variant={alert.variant} />

                <header className="flex items-center justify-between mb-3 mx-auto w-[300px]">
                    <h1 className="text-3xl text-slate-800 dark:text-slate-100 tracking-wider uppercase font-bold">
                        Зборле
                    </h1>

                    <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl px-1.5 py-1">
                        <button
                            onClick={() => setIsInfoModalOpen(true)}
                            className={headerButton}
                            aria-label="Како се игра"
                            title="Помош"
                        >
                            <QuestionMarkCircleIcon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                        </button>
                        <button
                            onClick={() => setIsStatsModalOpen(true)}
                            className={headerButton}
                            aria-label="Статистика"
                            title="Статистика"
                        >
                            <ChartBarIcon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                        </button>
                        <button
                            onClick={() => setIsSettingsModalOpen(true)}
                            className={headerButton}
                            aria-label="Поставки"
                            title="Поставки"
                        >
                            <Cog6ToothIcon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                        </button>
                    </div>
                </header>

                <div className="flex items-center justify-between gap-2 mb-4 mx-auto w-[300px]">
                    <div
                        role="tablist"
                        aria-label="Режим на игра"
                        className="flex flex-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm font-semibold"
                    >
                        {(['daily', 'practice'] as GameMode[]).map((m) => (
                            <button
                                key={m}
                                role="tab"
                                aria-selected={mode === m}
                                onClick={() => switchMode(m)}
                                className={classnames(
                                    'flex-1 py-1.5 rounded-lg transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400',
                                    mode === m
                                        ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200',
                                )}
                            >
                                {m === 'daily' ? `Дневен #${dayIndex}` : 'Вежба'}
                            </button>
                        ))}
                    </div>
                    {isPractice && (
                        <button
                            onClick={startNewPracticeGame}
                            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-200 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                            aria-label="Нов збор"
                            title="Нов збор"
                        >
                            <ArrowPathIcon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                        </button>
                    )}
                </div>

                {isHardMode && (
                    <p className="-mt-2 mb-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Тежок режим
                    </p>
                )}

                <Grid
                    guesses={guesses}
                    currentGuess={currentGuess}
                    solution={solution}
                    invalid={isRowInvalid}
                    win={isWinAnimationStarted}
                />
                <Keyboard
                    onChar={onChar}
                    onDelete={onDelete}
                    onEnter={onEnter}
                    guesses={guesses}
                    solution={solution}
                />

                {isGameOver && !isGameOverModalOpen && (
                    <div className="mt-4 flex justify-center">
                        <button
                            onClick={() => setIsGameOverModalOpen(true)}
                            className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                            Прикажи резултат
                        </button>
                    </div>
                )}

                <GameOverModal
                    isOpen={isGameOverModalOpen}
                    handleClose={() => setIsGameOverModalOpen(false)}
                    guesses={guesses}
                    solution={solution}
                    isWon={isGameWon}
                    mode={mode}
                    timeLeft={timeUntilNextWord}
                    onShare={handleShare}
                    onNewPracticeGame={startNewPracticeGame}
                    onSwitchToPractice={() => switchMode('practice')}
                />
                <InfoModal isOpen={isInfoModalOpen} handleClose={() => setIsInfoModalOpen(false)} />
                <StatsModal
                    isOpen={isStatsModalOpen}
                    handleClose={() => setIsStatsModalOpen(false)}
                    gameStats={stats}
                    mode={mode}
                    highlightIndex={isGameWon ? guesses.length - 1 : undefined}
                />
                <SettingsModal
                    isOpen={isSettingsModalOpen}
                    handleClose={() => setIsSettingsModalOpen(false)}
                    isHardModeLocked={!isHardMode && isGameInProgress}
                    onHardModeLocked={() =>
                        showAlert('Тежок режим може да се вклучи само на почеток на игра', 'warning', 2500)
                    }
                />
                <AboutModal isOpen={isAboutModalOpen} handleClose={() => setIsAboutModalOpen(false)} />
                <ShortcutsModal isOpen={isShortcutsModalOpen} handleClose={() => setIsShortcutsModalOpen(false)} />

                <footer className="mt-8 flex items-center justify-center">
                    <div className="flex items-center gap-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
                        <SoundToggle />
                        <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1" />
                        <ThemeToggle />
                        <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1" />
                        <button
                            type="button"
                            className={headerButton}
                            onClick={() => setIsAboutModalOpen(true)}
                            aria-label="За играта"
                            title="За играта"
                        >
                            <InformationCircleIcon className="h-6 w-6 text-slate-700 dark:text-slate-300" />
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    )
}

export default App
