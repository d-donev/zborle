import { formatTime, Time } from '../../lib/words'

type Props = {
    timeLeft: Time
}

export const TimeLeft = ({ timeLeft }: Props) => {
    const { hours, minutes, seconds } = timeLeft
    return (
        <div className="my-2 text-center text-slate-700 dark:text-slate-300">
            <h4 className="text-xs uppercase tracking-wider">До следно ЗБОРЛЕ</h4>
            <p className="text-3xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                {hours}:{formatTime(minutes)}:{formatTime(seconds)}
            </p>
        </div>
    )
}
