import { FormEvent, useEffect, useState } from 'react'
import { BaseModal } from './BaseModal'
import {
    LEADERBOARD_SIZE,
    LeaderboardEntry,
    NAME_MAX_LENGTH,
    RankedEntry,
    averageTries,
    cleanName,
} from '../../lib/leaderboard'

type Props = {
    isOpen: boolean
    handleClose: () => void
    year: number
    playerId: string
    /** the name this device plays under, null until the player joins */
    name: string | null
    suggestedName: string
    onSaveName: (name: string) => void
}

type State = { status: 'loading' | 'ready' | 'error'; top: RankedEntry[]; me: LeaderboardEntry | null }

const MEDALS = ['🥇', '🥈', '🥉']

const wordsLabel = (n: number) => `${n} ${n % 10 === 1 && n % 100 !== 11 ? 'збор' : 'зборови'}`

const inputClass =
    'w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-base text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400'
const buttonClass =
    'shrink-0 rounded-md px-4 py-2 text-base font-semibold text-white bg-tile-correct hover:brightness-95 active:brightness-90 disabled:opacity-50 transition'

const Row = ({ place, entry, isMe }: { place: number | null; entry: LeaderboardEntry; isMe: boolean }) => (
    <li
        className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
            isMe ? 'bg-amber-100 dark:bg-amber-900/40 font-semibold' : 'odd:bg-slate-100 dark:odd:bg-slate-700/50'
        }`}
    >
        <span className="w-7 text-center text-lg tabular-nums" aria-label={place ? `${place}. место` : undefined}>
            {place === null ? '·' : (MEDALS[place - 1] ?? place)}
        </span>
        <span className="flex-1 truncate text-left text-slate-900 dark:text-slate-100">
            {entry.name}
            {isMe && <span className="ml-1 text-xs font-normal text-slate-500 dark:text-slate-400">(ти)</span>}
        </span>
        <span className="text-right text-sm tabular-nums text-slate-700 dark:text-slate-200">
            {wordsLabel(entry.solved)}
            <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">
                просек {averageTries(entry)}
            </span>
        </span>
    </li>
)

export const LeaderboardModal = ({ isOpen, handleClose, year, playerId, name, suggestedName, onSaveName }: Props) => {
    const [state, setState] = useState<State>({ status: 'loading', top: [], me: null })
    const [draft, setDraft] = useState('')
    const [isEditing, setIsEditing] = useState(false)

    useEffect(() => {
        if (!isOpen) return
        let stop: (() => void) | undefined
        let cancelled = false
        setState((s) => ({ ...s, status: s.top.length ? 'ready' : 'loading' }))
        import('../../lib/leaderboardStore')
            .then((m) => {
                if (cancelled) return
                stop = m.watchLeaderboard(
                    year,
                    playerId,
                    (top, me) => setState({ status: 'ready', top, me }),
                    () => setState((s) => ({ ...s, status: 'error' })),
                )
            })
            .catch(() => setState((s) => ({ ...s, status: 'error' })))
        return () => {
            cancelled = true
            stop?.()
        }
    }, [isOpen, year, playerId])

    useEffect(() => {
        if (isOpen) {
            setDraft(name ?? suggestedName)
            setIsEditing(false)
        }
    }, [isOpen, name, suggestedName])

    const submit = (e: FormEvent) => {
        e.preventDefault()
        const clean = cleanName(draft)
        if (!clean) return
        onSaveName(clean)
        setIsEditing(false)
    }

    const { status, top, me } = state
    const meInTop = top.some((e) => e.id === playerId)

    const nameForm = (
        <form onSubmit={submit} className="flex gap-2">
            <input
                className={inputClass}
                value={draft}
                maxLength={NAME_MAX_LENGTH}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Твое име"
                aria-label="Име за табелата"
                autoFocus={isEditing}
            />
            <button type="submit" className={buttonClass} disabled={!cleanName(draft)}>
                {name ? 'Зачувај' : 'Влези'}
            </button>
        </form>
    )

    return (
        <BaseModal title={`Најдобри ${LEADERBOARD_SIZE} · ${year}`} isOpen={isOpen} handleClose={handleClose}>
            <p className="mt-1 text-center text-sm text-slate-600 dark:text-slate-400">
                Се бројат само дневните зборови погодени истиот ден.
            </p>

            <div className="mt-4 min-h-[6rem]">
                {status === 'loading' && (
                    <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">Се вчитува…</p>
                )}
                {status === 'error' && (
                    <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                        Табелата не е достапна во моментов. Обидете се подоцна.
                    </p>
                )}
                {status === 'ready' && top.length === 0 && (
                    <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                        Сè уште нема никој во табелата. Биди прв!
                    </p>
                )}
                {status === 'ready' && top.length > 0 && (
                    <ol className="space-y-1">
                        {top.map((entry, i) => (
                            <Row key={entry.id} place={i + 1} entry={entry} isMe={entry.id === playerId} />
                        ))}
                        {me && !meInTop && <Row place={null} entry={me} isMe />}
                    </ol>
                )}
            </div>

            <div className="mt-5 border-t border-slate-200 dark:border-slate-700 pt-4 text-left">
                {!name ? (
                    <>
                        <p className="mb-2 text-sm text-slate-700 dark:text-slate-300">
                            Внеси име и твоите дневни погодоци ќе се бројат автоматски, почнувајќи од денес.
                        </p>
                        {nameForm}
                    </>
                ) : isEditing ? (
                    nameForm
                ) : (
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                        Играш како <span className="font-semibold">{name}</span>.{' '}
                        <button
                            type="button"
                            className="font-medium underline underline-offset-2 hover:text-slate-900 dark:hover:text-white"
                            onClick={() => setIsEditing(true)}
                        >
                            Промени име
                        </button>
                    </p>
                )}
            </div>
        </BaseModal>
    )
}
