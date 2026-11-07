import classnames from 'classnames'
import { getGuessStatuses } from '../../lib/statuses'
import { MAX_GUESSES, TIMEOUT_GUESS, WORD_LENGTH } from '../../lib/duel/types'

type Props = {
    guesses: string[]
    solution: string
}

/** The opponent's progress: colours only, never the letters */
export const OpponentBoard = ({ guesses, solution }: Props) => {
    return (
        <div className="flex flex-col gap-[2px]" aria-label={`Противникот има ${guesses.length} обиди`}>
            {Array.from(Array(MAX_GUESSES)).map((_, row) => {
                const guess = guesses[row]
                const statuses = guess && guess !== TIMEOUT_GUESS ? getGuessStatuses(guess, solution) : []
                return (
                    <div key={row} className="flex gap-[2px]">
                        {Array.from(Array(WORD_LENGTH)).map((_, i) => (
                            <div
                                key={i}
                                className={classnames('w-2.5 h-2.5 rounded-[2px] border', {
                                    'border-slate-300 dark:border-slate-600': !guess,
                                    'tile-absent': guess && (guess === TIMEOUT_GUESS || statuses[i] === 'absent'),
                                    'tile-present': statuses[i] === 'present',
                                    'tile-correct': statuses[i] === 'correct',
                                })}
                            />
                        ))}
                    </div>
                )
            })}
        </div>
    )
}
