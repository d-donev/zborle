import { ArrowPathIcon, BookOpenIcon, CheckIcon, ShareIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { DialogTitle } from '@headlessui/react'
import { BaseModal } from './BaseModal'
import { MiniGrid } from '../mini-grid/MiniGrid'
import { TimeLeft } from './TimeLeft'
import { Time } from '../../lib/words'
import { GameMode } from '../../lib/localStorage'

type Props = {
    isOpen: boolean
    handleClose: () => void
    guesses: string[]
    solution: string
    isWon: boolean
    mode: GameMode
    timeLeft: Time
    onShare: () => void
    onNewPracticeGame: () => void
    onSwitchToPractice: () => void
}

const WIN_MESSAGES = ['Генијално!', 'Величествено!', 'Импресивно!', 'Одлично!', 'Браво!', 'Фуу, за малку!']

const primaryButton =
    'inline-flex items-center justify-center gap-2 w-full rounded-md px-4 py-2.5 text-base font-semibold text-white bg-tile-correct hover:brightness-95 active:brightness-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400 dark:focus-visible:ring-offset-slate-800 transition'
const secondaryButton =
    'inline-flex items-center justify-center gap-2 w-full rounded-md px-4 py-2.5 text-base font-semibold text-slate-800 dark:text-slate-100 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 transition'

export const GameOverModal = ({
    isOpen,
    handleClose,
    guesses,
    solution,
    isWon,
    mode,
    timeLeft,
    onShare,
    onNewPracticeGame,
    onSwitchToPractice,
}: Props) => {
    const title = isWon ? WIN_MESSAGES[Math.min(guesses.length, 6) - 1] : 'Следниот пат!'
    const meaningUrl = `https://www.google.com/search?q=${encodeURIComponent(`${solution.toLowerCase()} значење`)}`

    return (
        <BaseModal isOpen={isOpen} handleClose={handleClose}>
            <div className="text-center">
                <div
                    className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full ${
                        isWon ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'
                    }`}
                >
                    {isWon ? (
                        <CheckIcon className="h-6 w-6 text-green-600 dark:text-green-400" aria-hidden="true" />
                    ) : (
                        <XMarkIcon className="h-6 w-6 text-red-600 dark:text-red-400" aria-hidden="true" />
                    )}
                </div>
                <DialogTitle as="h3" className="mt-3 text-xl font-bold text-slate-900 dark:text-slate-100">
                    {title}
                </DialogTitle>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {isWon
                        ? `Го погодивте зборот во ${guesses.length} ${guesses.length === 1 ? 'обид' : 'обиди'}.`
                        : 'Бараниот збор беше:'}
                </p>

                <div className="flex justify-center gap-1 my-3" aria-label={`Зборот е ${solution}`}>
                    {solution.split('').map((letter, i) => (
                        <div
                            key={i}
                            className="tile-correct w-10 h-10 flex items-center justify-center rounded text-xl font-bold border-2"
                        >
                            {letter}
                        </div>
                    ))}
                </div>
                <a
                    href={meaningUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-300 underline underline-offset-2 hover:text-slate-900 dark:hover:text-white"
                >
                    <BookOpenIcon className="h-4 w-4" aria-hidden="true" />
                    Што значи зборот?
                </a>

                <div className="mt-4">
                    <MiniGrid guesses={guesses} solution={solution} />
                </div>

                {mode === 'daily' && <TimeLeft timeLeft={timeLeft} />}
            </div>

            <div className="mt-4 space-y-2">
                <button type="button" className={primaryButton} onClick={onShare}>
                    <ShareIcon className="h-5 w-5" aria-hidden="true" />
                    Сподели
                </button>
                {mode === 'practice' ? (
                    <button type="button" className={secondaryButton} onClick={onNewPracticeGame}>
                        <ArrowPathIcon className="h-5 w-5" aria-hidden="true" />
                        Нов збор
                    </button>
                ) : (
                    <button type="button" className={secondaryButton} onClick={onSwitchToPractice}>
                        <ArrowPathIcon className="h-5 w-5" aria-hidden="true" />
                        Вежбај уште зборови
                    </button>
                )}
            </div>
        </BaseModal>
    )
}
