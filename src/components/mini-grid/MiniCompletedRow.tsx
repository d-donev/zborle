import { getGuessStatuses } from '../../lib/statuses'
import { MiniCell } from './MiniCell'

type Props = {
    guess: string
    solution: string
}

export const MiniCompletedRow = ({ guess, solution }: Props) => {
    const statuses = getGuessStatuses(guess, solution)

    return (
        <div className="flex justify-center mb-1">
            {guess.split('').map((_, i) => (
                <MiniCell key={i} status={statuses[i]} />
            ))}
        </div>
    )
}
