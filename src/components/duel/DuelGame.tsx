import { useEffect, useMemo, useRef, useState } from 'react'
import classnames from 'classnames'
import { ClipboardDocumentIcon, ShareIcon, TrophyIcon } from '@heroicons/react/24/outline'
import { Grid } from '../grid/Grid'
import { Keyboard } from '../keyboard/Keyboard'
import { Confetti } from '../ui/Confetti'
import { OpponentBoard } from './OpponentBoard'
import { useSound } from '../../contexts/SoundContext'
import { convert, LETTERS_EN } from '../../lib/keyboard'
import { getRandomWord, isWordInWordList } from '../../lib/words'
import {
    createDuel,
    expireTurn,
    getMatchWinner,
    getRole,
    getTurnDeadline,
    getTurnMs,
    isBoardDone,
    isDuelExpired,
    joinDuel,
    leaveDuel,
    rematch,
    setReady,
    submitGuess,
} from '../../lib/duel/logic'
import {
    DuelStore,
    generateDuelCode,
    getDuelLink,
    getDuelStore,
    getPlayerId,
    loadPlayerName,
    savePlayerName,
} from '../../lib/duel/store'
import {
    Duel,
    formatTurnTime,
    OPPONENT_GRACE_MS,
    otherRole,
    Role,
    TURN_MS,
    TURN_OPTIONS,
    WORD_LENGTH,
} from '../../lib/duel/types'

type AlertVariant = 'success' | 'warning' | 'error'

type Props = {
    code: string | null
    onCodeChange: (code: string | null) => void
    onExit: () => void
    showAlert: (message: string, variant?: AlertVariant, duration?: number) => void
}

const primaryButton =
    'inline-flex items-center justify-center gap-2 w-full rounded-xl px-4 py-3 text-base font-semibold text-white bg-tile-correct hover:brightness-95 active:brightness-90 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 transition'
const card = 'mx-auto w-[300px] rounded-2xl bg-slate-100 dark:bg-slate-800 p-4 text-slate-800 dark:text-slate-100'
const input =
    'w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-base text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400'

const vibrate = (pattern: number | number[]) => {
    try {
        navigator.vibrate?.(pattern)
    } catch {
        // not supported
    }
}

const NameField = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <label className="block text-left">
        <span className="text-sm font-semibold">Твое име</span>
        <input
            className={`${input} mt-1`}
            value={value}
            maxLength={16}
            placeholder="на пр. Марко"
            onChange={(e) => onChange(e.target.value)}
            // keep the game keyboard from reacting to typing in the field
            onKeyUp={(e) => e.stopPropagation()}
        />
    </label>
)

export const DuelGame = ({ code, onCodeChange, onExit, showAlert }: Props) => {
    const { playSound } = useSound()
    const playerId = useMemo(getPlayerId, [])
    const [store, setStore] = useState<DuelStore | null>(null)
    const [duel, setDuel] = useState<Duel | null>(null)
    const [isLoaded, setIsLoaded] = useState(false)
    const [name, setName] = useState(loadPlayerName)
    const [target, setTarget] = useState(3)
    const [turnMs, setTurnMs] = useState(TURN_MS)
    const [isBusy, setIsBusy] = useState(false)
    const [currentGuess, setCurrentGuess] = useState('')
    const [isRowInvalid, setIsRowInvalid] = useState(false)
    const [now, setNow] = useState(() => Date.now())
    const [celebration, setCelebration] = useState(0)

    useEffect(() => {
        getDuelStore().then(setStore)
    }, [])

    useEffect(() => {
        if (!store || !code) return
        setIsLoaded(false)
        setExpiryCheckedFor(null)
        return store.subscribe(code, (d) => {
            setDuel(d)
            setIsLoaded(true)
        })
    }, [store, code])

    const role: Role | null = duel ? getRole(duel, playerId) : null

    // When a link is opened, a duel whose players have all been gone for 10+ minutes is deleted.
    // This runs before we mark ourselves online, so our own return can't keep a dead duel alive.
    const [expiryCheckedFor, setExpiryCheckedFor] = useState<string | null>(null)
    useEffect(() => {
        if (!store || !code || !isLoaded || expiryCheckedFor === code) return
        if (!duel || !isDuelExpired(duel, store.now())) {
            setExpiryCheckedFor(code)
            return
        }
        store
            .transact(code, (d) => (d && isDuelExpired(d, store.now()) ? null : undefined))
            .finally(() => setExpiryCheckedFor(code))
    }, [store, code, isLoaded, duel, expiryCheckedFor])

    useEffect(() => {
        if (store && code && role && expiryCheckedFor === code) return store.trackPresence(code, role)
    }, [store, code, role, expiryCheckedFor])

    useEffect(() => {
        if (!store) return
        const timer = window.setInterval(() => setNow(store.now()), 200)
        return () => window.clearInterval(timer)
    }, [store])

    const round = duel?.round
    const myBoard = role ? duel?.boards?.[role] : undefined
    const opponentRole = role ? otherRole(role) : null
    const opponent = duel && opponentRole ? duel.players[opponentRole] : undefined
    const opponentBoard = opponentRole ? duel?.boards?.[opponentRole] : undefined
    const matchWinner = duel ? getMatchWinner(duel) : null
    const isCountdown = !!round && !round.result && now < round.startsAt
    const isPlaying = !!round && !round.result && now >= round.startsAt
    const myDone = isBoardDone(myBoard)
    const canType = isPlaying && !myDone && !isBusy
    const deadline = duel && role ? getTurnDeadline(duel, role) : 0
    const msLeft = Math.max(0, deadline - now)

    // Clear the typed letters whenever a new round starts
    useEffect(() => {
        setCurrentGuess('')
    }, [round?.number])

    // Sounds and confetti when a round ends (not for results that were already there on load)
    const announcedRound = useRef<number | null>(null)
    const hasSeenRound = useRef(false)
    useEffect(() => {
        if (!round || !role) return
        if (!hasSeenRound.current) {
            hasSeenRound.current = true
            if (round.result) {
                announcedRound.current = round.number
                return
            }
        }
        if (!round.result || announcedRound.current === round.number) return
        announcedRound.current = round.number
        if (round.result === role) {
            playSound('win')
            vibrate([60, 40, 60])
            setCelebration((c) => c + 1)
        } else if (round.result !== 'draw') {
            playSound('lose')
        }
    }, [round?.result, round?.number, role])

    const transact = async (fn: (d: Duel | null) => Duel | null | undefined) => {
        if (!store || !code) return null
        setIsBusy(true)
        try {
            return await store.transact(code, fn)
        } catch {
            showAlert('Проблем со врската, обидете се повторно')
            return null
        } finally {
            setIsBusy(false)
        }
    }

    const sendGuess = (guess: string) => {
        if (!role || !store) return
        playSound('enter')
        setCurrentGuess('')
        return transact((d) => submitGuess(d, role, guess, store.now()))
    }

    // One minute per guess: when it runs out, send whatever was typed (or waste the try)
    const typedRef = useRef(currentGuess)
    typedRef.current = currentGuess
    const firedDeadline = useRef(0)
    useEffect(() => {
        if (!isPlaying || myDone || !role || !store || msLeft > 0 || firedDeadline.current === deadline) return
        firedDeadline.current = deadline
        const typed = typedRef.current
        if (typed.length === WORD_LENGTH && isWordInWordList(typed)) {
            sendGuess(typed)
            return
        }
        showAlert('Времето истече! Го изгубивте обидот', 'warning')
        vibrate(150)
        setCurrentGuess('')
        transact((d) => expireTurn(d, role, store.now()))
    }, [isPlaying, myDone, msLeft, deadline, role])

    // If the opponent walks away mid-round, their screen can't use up their tries - so ours does
    // (a few seconds late, giving their own screen the chance to send a typed word first)
    const opponentDeadline = duel && opponentRole ? getTurnDeadline(duel, opponentRole) : 0
    const firedOpponentDeadline = useRef(0)
    useEffect(() => {
        if (!isPlaying || !store || !code || !opponentRole || opponent?.left || isBoardDone(opponentBoard)) return
        if (now < opponentDeadline + OPPONENT_GRACE_MS || firedOpponentDeadline.current === opponentDeadline) return
        firedOpponentDeadline.current = opponentDeadline
        store.transact(code, (d) => expireTurn(d, opponentRole, store.now())).catch(() => {})
    }, [isPlaying, now, opponentDeadline, opponentRole])

    const rejectGuess = (message: string) => {
        showAlert(message)
        playSound('invalid')
        vibrate(80)
        setIsRowInvalid(true)
        window.setTimeout(() => setIsRowInvalid(false), 600)
    }

    const onChar = (value: string) => {
        if (!canType) return
        const converted = LETTERS_EN.includes(value) ? convert(value) : value
        setCurrentGuess((g) => (g.length < WORD_LENGTH ? `${g}${converted}` : g))
        playSound('keypress')
    }

    const onDelete = () => {
        if (!canType) return
        setCurrentGuess((g) => g.slice(0, -1))
        playSound('delete')
    }

    const onEnter = () => {
        if (!canType) return
        if (currentGuess.length !== WORD_LENGTH) return rejectGuess('Немате внесено доволно букви')
        if (!isWordInWordList(currentGuess)) return rejectGuess('Зборот не е пронајден во речникот на Зборле')
        sendGuess(currentGuess)
    }

    const cleanName = (fallback: string) => {
        const trimmed = name.trim().slice(0, 16)
        if (trimmed) savePlayerName(trimmed)
        return trimmed || fallback
    }

    const createNewDuel = async () => {
        if (!store) return
        setIsBusy(true)
        const host = { id: playerId, name: cleanName('Играч 1') }
        try {
            for (let attempt = 0; attempt < 3; attempt++) {
                const newCode = generateDuelCode()
                const created = await store.transact(newCode, (d) =>
                    d ? undefined : createDuel(newCode, target, host, store.now(), turnMs),
                )
                if (created) {
                    onCodeChange(newCode)
                    return
                }
            }
            showAlert('Не успеавме да создадеме дуел')
        } catch {
            showAlert('Нема врска со серверот за дуели')
        } finally {
            setIsBusy(false)
        }
    }

    const join = async () => {
        const result = await transact((d) => joinDuel(d, { id: playerId, name: cleanName('Играч 2') }))
        if (!result) showAlert('Не успеавте да влезете, дуелот е веќе полн')
    }

    const shareLink = async () => {
        if (!code) return
        const link = getDuelLink(code)
        const text = 'Предизвик на Зборле! Кој прв ќе го погоди зборот?'
        if (window.matchMedia?.('(pointer: coarse)').matches && navigator.share) {
            try {
                await navigator.share({ text, url: link })
                return
            } catch (e) {
                if ((e as Error).name === 'AbortError') return
            }
        }
        try {
            await navigator.clipboard.writeText(link)
            showAlert('Линкот е копиран, пратете му го на другарот', 'success')
        } catch {
            showAlert('Копирајте го линкот рачно')
        }
    }

    const leave = async () => {
        if (role) {
            await transact((d) => leaveDuel(d, role))
        }
        onCodeChange(null)
        onExit()
    }

    const localNotice = store && !store.isOnline && (
        <p className="mx-auto mt-3 w-[300px] rounded-lg bg-amber-100 dark:bg-amber-900/50 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
            Тест режим: дуелот работи само меѓу табови во овој прелистувач. Поставете Firebase за игра преку
            интернет.
        </p>
    )

    // ── Lobby: choose the match length and create a link ──
    if (!code) {
        return (
            <div>
                <div className={card}>
                    <h2 className="text-xl font-bold text-center">Дуел со другар</h2>
                    <p className="mt-1 mb-4 text-sm text-center text-slate-600 dark:text-slate-400">
                        Истиот збор, две табли. Кој прв ќе го погоди, ја добива рундата.
                    </p>
                    <NameField value={name} onChange={setName} />
                    <p className="mt-4 text-sm font-semibold">Се игра до</p>
                    <div className="mt-1 grid grid-cols-2 gap-2">
                        {[1, 3].map((t) => (
                            <button
                                key={t}
                                onClick={() => setTarget(t)}
                                aria-pressed={target === t}
                                className={classnames(
                                    'rounded-lg py-2 font-semibold border-2 transition',
                                    target === t
                                        ? 'border-transparent bg-tile-correct text-white'
                                        : 'border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700',
                                )}
                            >
                                {t === 1 ? '1 победа' : '3 победи'}
                            </button>
                        ))}
                    </div>
                    <p className="mt-4 text-sm font-semibold">Време за обид</p>
                    <div className="mt-1 grid grid-cols-3 gap-2">
                        {TURN_OPTIONS.map((ms) => (
                            <button
                                key={ms}
                                onClick={() => setTurnMs(ms)}
                                aria-pressed={turnMs === ms}
                                className={classnames(
                                    'rounded-lg py-2 font-semibold border-2 transition',
                                    turnMs === ms
                                        ? 'border-transparent bg-tile-correct text-white'
                                        : 'border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700',
                                )}
                            >
                                {ms < 60_000 ? `${ms / 1000} сек` : `${ms / 60_000} мин`}
                            </button>
                        ))}
                    </div>
                    <ul className="mt-4 space-y-1 text-xs text-slate-600 dark:text-slate-400 list-disc pl-4">
                        <li>
                            Имате {formatTurnTime(turnMs)} за секој обид. Ако истече, се праќа тоа што сте го
                            напишале.
                        </li>
                        <li>Ако и двајцата промашите, рундата е нерешена и нема поен.</li>
                    </ul>
                    <button className={`${primaryButton} mt-4`} onClick={createNewDuel} disabled={!store || isBusy}>
                        Создај дуел
                    </button>
                </div>
                {localNotice}
            </div>
        )
    }

    if (!isLoaded) {
        return <p className="text-center text-slate-500 dark:text-slate-400 py-10">Се поврзува…</p>
    }

    if (!duel) {
        return (
            <div className={card}>
                <p className="text-center font-semibold">Овој дуел заврши или не постои.</p>
                <p className="mt-1 text-center text-sm text-slate-500 dark:text-slate-400">
                    Дуелите се бришат кога двајцата ќе излезат.
                </p>
                <button className={`${primaryButton} mt-4`} onClick={() => onCodeChange(null)}>
                    Создај нов дуел
                </button>
            </div>
        )
    }

    // ── Someone opened the link: join (or the duel is already full) ──
    if (!role) {
        return (
            <div>
                <div className={card}>
                    {duel.players.guest ? (
                        <>
                            <p className="text-center font-semibold">Овој дуел веќе има двајца играчи.</p>
                            <button className={`${primaryButton} mt-4`} onClick={() => onCodeChange(null)}>
                                Создај свој дуел
                            </button>
                        </>
                    ) : (
                        <>
                            <h2 className="text-xl font-bold text-center">
                                {duel.players.host.name} ве предизвикува!
                            </h2>
                            <p className="mt-1 mb-4 text-sm text-center text-slate-600 dark:text-slate-400">
                                Се игра до {duel.target === 1 ? '1 победа' : `${duel.target} победи`},{' '}
                                {formatTurnTime(getTurnMs(duel))} за обид.
                            </p>
                            <NameField value={name} onChange={setName} />
                            <button className={`${primaryButton} mt-4`} onClick={join} disabled={isBusy}>
                                Прифати го дуелот
                            </button>
                        </>
                    )}
                </div>
                {localNotice}
            </div>
        )
    }

    // role is only set once this player is seated, so their entry exists
    const me = duel.players[role]!

    // ── Waiting for the friend to open the link ──
    if (!opponent) {
        return (
            <div>
                <div className={card}>
                    <h2 className="text-lg font-bold text-center">Пратете го линкот на другарот</h2>
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-white dark:bg-slate-900 px-3 py-2">
                        <span className="flex-1 truncate text-sm font-mono">{getDuelLink(code)}</span>
                    </div>
                    <button className={`${primaryButton} mt-3`} onClick={shareLink}>
                        {window.matchMedia?.('(pointer: coarse)').matches ? (
                            <ShareIcon className="h-5 w-5" />
                        ) : (
                            <ClipboardDocumentIcon className="h-5 w-5" />
                        )}
                        Сподели линк
                    </button>
                    <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400 animate-pulse">
                        Чекам противник…
                    </p>
                </div>
                {localNotice}
                <button
                    onClick={leave}
                    className="mx-auto mt-4 block text-sm underline text-slate-500 dark:text-slate-400"
                >
                    Откажи
                </button>
            </div>
        )
    }

    const matches = duel.matches ?? { host: 0, guest: 0 }
    const matchesPlayed = matches.host + matches.guest
    const matchTally = (
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Вкупно дуели:{' '}
            <b className="tabular-nums">
                {me.name} {matches[role]} : {matches[opponentRole!]} {opponent.name}
            </b>
        </p>
    )

    // ── Someone pressed "leave" ──
    if (me.left || opponent.left) {
        return (
            <div className={card}>
                <p className="text-center text-lg font-bold">
                    {me.left ? 'Го напуштивте овој дуел.' : `${opponent.name} го напушти дуелот.`}
                </p>
                <div className="text-center">{matchesPlayed > 0 && matchTally}</div>
                <button className={`${primaryButton} mt-4`} onClick={me.left ? () => onCodeChange(null) : leave}>
                    {me.left ? 'Создај нов дуел' : 'Излези'}
                </button>
            </div>
        )
    }

    const amReady = !!duel.ready?.[role]
    const opponentReady = !!(opponentRole && duel.ready?.[opponentRole])
    const solution = round?.solution ?? ''
    const seconds = Math.ceil(msLeft / 1000)

    return (
        <div>
            <Confetti trigger={celebration} />

            {/* Scoreboard: me on the left, opponent (with their colours) on the right */}
            <div className="mx-auto mb-3 w-[300px] flex items-center gap-3 rounded-2xl bg-slate-100 dark:bg-slate-800 px-3 py-2">
                <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">{me.name}</p>
                    <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{duel.score[role]}</p>
                </div>
                <div className="text-center text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    до {duel.target}
                    {round && <div className="text-xs font-semibold normal-case">рунда {round.number}</div>}
                    {matchesPlayed > 0 && (
                        <div className="text-xs font-semibold normal-case" title="Добиени дуели, вкупно со реваншите">
                            дуели {matches[role]}:{matches[opponentRole!]}
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0 text-right">
                    <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {opponent.online === false && (
                            <span className="mr-1 text-[10px] font-normal text-slate-400">(офлајн)</span>
                        )}
                        {opponent.name}
                    </p>
                    <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                        {duel.score[opponentRole!]}
                    </p>
                </div>
                {round && <OpponentBoard guesses={opponentBoard?.guesses ?? []} solution={solution} />}
            </div>

            {/* Turn timer */}
            {isPlaying && !myDone && (
                <div className="mx-auto mb-3 w-[300px]">
                    <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div
                            className={classnames('h-full rounded-full transition-[width] duration-200 ease-linear', {
                                'bg-tile-correct': seconds > 10,
                                'bg-red-500': seconds <= 10,
                            })}
                            style={{ width: `${(msLeft / getTurnMs(duel)) * 100}%` }}
                        />
                    </div>
                    <p
                        className={classnames('mt-1 text-center text-xs font-semibold tabular-nums', {
                            'text-slate-500 dark:text-slate-400': seconds > 10,
                            'text-red-500 animate-pulse': seconds <= 10,
                        })}
                    >
                        {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
                    </p>
                </div>
            )}
            {isPlaying && myDone && !round?.result && (
                <p className="mb-3 text-center text-sm text-slate-500 dark:text-slate-400 animate-pulse">
                    Ги потрошивте обидите, чекаме {opponent.name}…
                </p>
            )}

            {/* Between rounds: result and the ready button */}
            {(!round || round.result) && (
                <div className={`${card} mb-3 text-center`}>
                    {round?.result && (
                        <>
                            <p className="text-xl font-bold">
                                {round.result === 'draw'
                                    ? 'Нерешено, никој не го погоди'
                                    : round.result === role
                                      ? 'Ја добивте рундата!'
                                      : `${opponent.name} ја доби рундата`}
                            </p>
                            <div className="flex justify-center gap-1 my-2" aria-label={`Зборот беше ${solution}`}>
                                {solution.split('').map((letter, i) => (
                                    <div
                                        key={i}
                                        className="tile-correct w-8 h-8 flex items-center justify-center rounded text-base font-bold border-2"
                                    >
                                        {letter}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {matchWinner ? (
                        <>
                            <TrophyIcon className="mx-auto h-10 w-10 text-amber-500" />
                            <p className="text-lg font-bold">
                                {matchWinner === role ? 'Го добивте дуелот!' : `${opponent.name} го доби дуелот`}{' '}
                                {duel.score[role]}:{duel.score[opponentRole!]}
                            </p>
                            {matchTally}
                            <button
                                className={`${primaryButton} mt-3`}
                                onClick={() => transact((d) => rematch(d))}
                                disabled={isBusy}
                            >
                                Реванш
                            </button>
                        </>
                    ) : (
                        <>
                            {!round && <p className="text-lg font-bold">{opponent.name} е тука!</p>}
                            <button
                                className={`${primaryButton} mt-3`}
                                onClick={() => transact((d) => setReady(d, role, store!.now(), () => getRandomWord()))}
                                disabled={isBusy || amReady}
                            >
                                {amReady ? 'Спремни сте' : round ? 'Следна рунда' : 'Спремен сум'}
                            </button>
                            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                {amReady
                                    ? `Чекаме ${opponent.name} да стисне…`
                                    : opponentReady
                                      ? `${opponent.name} е спремен/на`
                                      : 'Рундата почнува кога двајцата ќе стиснете'}
                            </p>
                        </>
                    )}
                </div>
            )}

            {/* The board, with the 3-2-1 countdown on top */}
            {round && (
                <div className="relative">
                    <Grid
                        guesses={myBoard?.guesses ?? []}
                        currentGuess={currentGuess}
                        solution={solution}
                        invalid={isRowInvalid}
                    />
                    {isCountdown && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span
                                key={Math.ceil((round.startsAt - now) / 1000)}
                                className="pop-in text-8xl font-black text-slate-900 dark:text-white drop-shadow-lg"
                            >
                                {Math.ceil((round.startsAt - now) / 1000)}
                            </span>
                        </div>
                    )}
                </div>
            )}
            <Keyboard
                onChar={onChar}
                onDelete={onDelete}
                onEnter={onEnter}
                guesses={myBoard?.guesses ?? []}
                solution={solution}
            />

            <button
                onClick={leave}
                className="mx-auto mt-4 block text-sm underline text-slate-500 dark:text-slate-400"
            >
                Напушти го дуелот
            </button>
        </div>
    )
}
