import { GameStats } from '../../lib/localStorage'
import { Progress } from './Progress'

type Props = {
    gameStats: GameStats
    /** Row (0-5) to highlight, e.g. the number of tries in today's win */
    highlightIndex?: number
}

export const Histogram = ({ gameStats, highlightIndex }: Props) => {
    const { winDistribution } = gameStats
    const maxValue = Math.max(...winDistribution, 1)

    return (
        <div className="columns-1 justify-left m-2 text-sm">
            {winDistribution.map((value, i) => (
                <Progress
                    key={i}
                    index={i}
                    size={95 * (value / maxValue)}
                    label={String(value)}
                    isHighlighted={i === highlightIndex}
                />
            ))}
        </div>
    )
}
