import { BaseModal } from './BaseModal'
import { StatBar } from '../stats/StatBar'
import { Histogram } from '../stats/Histogram'
import { GameStats, GameMode } from '../../lib/localStorage'

type Props = {
    isOpen: boolean
    handleClose: () => void
    gameStats: GameStats
    mode: GameMode
    highlightIndex?: number
}

export const StatsModal = ({ isOpen, handleClose, gameStats, mode, highlightIndex }: Props) => {
    return (
        <BaseModal
            title={mode === 'practice' ? 'Статистика · вежба' : 'Статистика'}
            isOpen={isOpen}
            handleClose={handleClose}
        >
            <div className="text-center">
                <StatBar gameStats={gameStats} />
                <h4 className="text-lg leading-6 font-bold text-slate-900 dark:text-slate-100 uppercase mt-4">
                    Распределба на погодоци
                </h4>
                {gameStats.totalGames === 0 ? (
                    <p className="my-4 text-sm text-slate-500 dark:text-slate-400">Сè уште нема одиграни игри.</p>
                ) : (
                    <Histogram gameStats={gameStats} highlightIndex={highlightIndex} />
                )}
            </div>
        </BaseModal>
    )
}
