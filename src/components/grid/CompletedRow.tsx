import { getGuessStatuses } from '../../lib/statuses'
import { Cell } from './Cell'
import { TIMEOUT_GUESS } from '../../lib/duel/types'

type Props = {
    guess: string
    solution: string
    win?: boolean
}

export const CompletedRow = ({ guess, solution, win = false }: Props) => {
    if (guess === TIMEOUT_GUESS) {
        // the minute ran out in a duel: a wasted, empty grey row
        return (
            <div className="flex justify-center mb-1" aria-label="Истечено време">
                {Array.from(Array(5)).map((_, i) => (
                    <Cell key={i} value="" status="absent" completed={true} delay={i * 80} />
                ))}
            </div>
        )
    }
    const statuses = getGuessStatuses(guess, solution)
    return (
      <div className="flex justify-center mb-1">
          {guess.split('').map((letter, i) => (
            <Cell key={i} value={letter} status={statuses[i]} completed={true} delay={i * 150} win={win} />
          ))}
      </div>
    )
}
