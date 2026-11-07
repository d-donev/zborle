import { useEffect, useState } from 'react'
import classnames from 'classnames'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { BaseModal } from './BaseModal'
import {
    Archive,
    dateFromDayNumber,
    dayNumberFromDate,
    getDayResult,
    getWordForDay,
    MONTHS,
} from '../../lib/archive'

type Props = {
    isOpen: boolean
    handleClose: () => void
    archive: Archive
    todayDay: number
    /** the day being played right now */
    selectedDay: number
    onSelect: (dayNumber: number) => void
}

const WEEKDAYS = ['П', 'В', 'С', 'Ч', 'П', 'С', 'Н']

export const CalendarModal = ({ isOpen, handleClose, archive, todayDay, selectedDay, onSelect }: Props) => {
    const today = dateFromDayNumber(todayDay)
    const year = today.year
    const [month, setMonth] = useState(today.month)

    // open on the month of the day being played
    useEffect(() => {
        if (isOpen) {
            const selected = dateFromDayNumber(selectedDay)
            setMonth(selected.year === year ? selected.month : today.month)
        }
    }, [isOpen])

    const firstOfYear = dayNumberFromDate(year, 0, 1)
    const daysThisYear = todayDay - firstOfYear + 1
    let solvedThisYear = 0
    for (let n = firstOfYear; n <= todayDay; n++) {
        if (getDayResult(archive[n], getWordForDay(n)) === 'won') solvedThisYear++
    }

    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
    // Monday-first offset of the 1st of the month
    const leadingBlanks = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7

    return (
        <BaseModal title="Календар" isOpen={isOpen} handleClose={handleClose}>
            <p className="mt-1 text-center text-sm text-slate-600 dark:text-slate-400">
                Решени во {year}:{' '}
                <b className="text-slate-900 dark:text-white tabular-nums">
                    {solvedThisYear} / {daysThisYear}
                </b>{' '}
                дена
            </p>

            <div className="mt-4 flex items-center justify-between">
                <button
                    onClick={() => setMonth((m) => m - 1)}
                    disabled={month === 0}
                    className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent"
                    aria-label="Претходен месец"
                >
                    <ChevronLeftIcon className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                </button>
                <p className="font-bold capitalize text-slate-900 dark:text-white">
                    {MONTHS[month]} {year}
                </p>
                <button
                    onClick={() => setMonth((m) => m + 1)}
                    disabled={month === today.month}
                    className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent"
                    aria-label="Следен месец"
                >
                    <ChevronRightIcon className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                </button>
            </div>

            <div className="mt-2 grid grid-cols-7 gap-1 text-center">
                {WEEKDAYS.map((w, i) => (
                    <div key={i} className="text-xs font-semibold text-slate-400 dark:text-slate-500 py-1">
                        {w}
                    </div>
                ))}
                {Array.from(Array(leadingBlanks)).map((_, i) => (
                    <div key={`blank-${i}`} />
                ))}
                {Array.from(Array(daysInMonth)).map((_, i) => {
                    const dayNumber = dayNumberFromDate(year, month, i + 1)
                    const isFuture = dayNumber > todayDay
                    const guesses = archive[dayNumber]
                    const result = isFuture ? null : getDayResult(guesses, getWordForDay(dayNumber))
                    const label = `${i + 1} ${MONTHS[month]}${
                        result === 'won'
                            ? `, погоден во ${guesses!.length}`
                            : result === 'lost'
                              ? ', промашен'
                              : result === 'playing'
                                ? ', започнат'
                                : ''
                    }`
                    return (
                        <button
                            key={dayNumber}
                            disabled={isFuture}
                            onClick={() => onSelect(dayNumber)}
                            aria-label={label}
                            title={label}
                            className={classnames(
                                'relative aspect-square rounded-lg text-sm font-semibold flex flex-col items-center justify-center transition',
                                {
                                    'tile-correct': result === 'won',
                                    'bg-red-500 text-white': result === 'lost',
                                    'bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200':
                                        result === 'playing',
                                    'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600':
                                        !result && !isFuture,
                                    'text-slate-300 dark:text-slate-600 cursor-default': isFuture,
                                    'hover:brightness-95': !!result,
                                    'ring-2 ring-offset-1 ring-slate-900 dark:ring-white dark:ring-offset-slate-800':
                                        dayNumber === selectedDay,
                                    'outline outline-2 outline-slate-400': dayNumber === todayDay && dayNumber !== selectedDay,
                                },
                            )}
                        >
                            {i + 1}
                            {result === 'won' && (
                                <span className="text-[9px] leading-none font-medium opacity-90">
                                    {guesses!.length}/6
                                </span>
                            )}
                        </button>
                    )
                })}
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3 rounded tile-correct" /> погоден
                </span>
                <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3 rounded bg-red-500" /> промашен
                </span>
                <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3 rounded bg-amber-200 dark:bg-amber-800" /> започнат
                </span>
            </div>
            <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
                Минатите денови не ја менуваат статистиката и серијата.
            </p>
        </BaseModal>
    )
}
