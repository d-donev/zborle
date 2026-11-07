import { Duel, DuelBoard, Role } from './types'

/**
 * Where duels live. Production uses Firebase Realtime Database; without Firebase settings a
 * local store syncs duels between tabs of the same browser, which is enough to try it out.
 */
export interface DuelStore {
    readonly isOnline: boolean
    subscribe(code: string, onChange: (duel: Duel | null) => void): () => void
    /**
     * Atomically replaces the duel with fn(current). Returning undefined leaves it untouched,
     * returning null deletes it.
     */
    transact(code: string, fn: (current: Duel | null) => Duel | null | undefined): Promise<Duel | null>
    /** Clock shared by both players (server time when online) */
    now(): number
    /** Marks the player online now and offline when they disconnect */
    trackPresence(code: string, role: Role): () => void
}

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL as string | undefined,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
    appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
}

export const isOnlineDuelAvailable = !!firebaseConfig.databaseURL

let storePromise: Promise<DuelStore> | null = null

export const getDuelStore = (): Promise<DuelStore> => {
    if (!storePromise) {
        storePromise = isOnlineDuelAvailable
            ? import('./firebaseStore').then((m) => m.createFirebaseStore(firebaseConfig))
            : Promise.resolve(createLocalStore())
    }
    return storePromise
}

/** Firebase returns arrays as objects and drops empty ones - bring the shape back */
export const normalizeDuel = (raw: unknown): Duel | null => {
    const d = raw as Duel | null
    if (!d || !d.players?.host?.id) return null
    const toArray = (value: unknown): string[] => {
        if (Array.isArray(value)) return value.filter((v) => typeof v === 'string')
        if (value && typeof value === 'object') {
            return Object.keys(value)
                .sort((a, b) => Number(a) - Number(b))
                .map((k) => (value as Record<string, string>)[k])
        }
        return []
    }
    const board = (b: DuelBoard | undefined) => (b ? { ...b, guesses: toArray(b.guesses) } : undefined)
    return {
        ...d,
        players: { host: d.players.host, guest: d.players.guest?.id ? d.players.guest : undefined },
        score: { host: d.score?.host ?? 0, guest: d.score?.guest ?? 0 },
        matches: { host: d.matches?.host ?? 0, guest: d.matches?.guest ?? 0 },
        boards: d.boards ? { host: board(d.boards.host), guest: board(d.boards.guest) } : undefined,
    }
}

/** Removes undefined values, which Firebase rejects */
export const toStorable = (duel: Duel) => JSON.parse(JSON.stringify(duel)) as Duel

const localKey = (code: string) => `zborle-duel-local:${code}`
const LOCAL_EVENT = 'zborle-duel-local'

const createLocalStore = (): DuelStore => {
    const read = (code: string) => {
        try {
            return normalizeDuel(JSON.parse(localStorage.getItem(localKey(code)) || 'null'))
        } catch {
            return null
        }
    }

    return {
        isOnline: false,
        subscribe(code, onChange) {
            const emit = () => onChange(read(code))
            const onStorage = (e: StorageEvent) => e.key === localKey(code) && emit()
            const onLocal = (e: Event) => (e as CustomEvent<string>).detail === code && emit()
            window.addEventListener('storage', onStorage)
            window.addEventListener(LOCAL_EVENT, onLocal)
            emit()
            return () => {
                window.removeEventListener('storage', onStorage)
                window.removeEventListener(LOCAL_EVENT, onLocal)
            }
        },
        async transact(code, fn) {
            const next = fn(read(code))
            if (next === undefined) return null
            if (next === null) localStorage.removeItem(localKey(code))
            else localStorage.setItem(localKey(code), JSON.stringify(toStorable(next)))
            window.dispatchEvent(new CustomEvent(LOCAL_EVENT, { detail: code }))
            return next
        },
        now: () => Date.now(),
        trackPresence: () => () => {},
    }
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export const generateDuelCode = () =>
    Array.from({ length: 5 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('')

export const isValidDuelCode = (code: string | null): code is string => !!code && /^[A-Z0-9]{5}$/.test(code)

export const getDuelLink = (code: string) => `${window.location.origin}${import.meta.env.BASE_URL}?duel=${code}`

/**
 * A random id that identifies this player in a duel. In production it lives in localStorage so a
 * reload keeps your seat; in local test mode and during development it is per tab, so two tabs
 * can play each other.
 */
export const getPlayerId = () => {
    const storage = isOnlineDuelAvailable && !import.meta.env.DEV ? localStorage : sessionStorage
    const key = 'zborle-player-id'
    try {
        let id = storage.getItem(key)
        if (!id) {
            id = Math.random().toString(36).slice(2) + Date.now().toString(36)
            storage.setItem(key, id)
        }
        return id
    } catch {
        return Math.random().toString(36).slice(2)
    }
}

export const loadPlayerName = () => {
    try {
        return localStorage.getItem('zborle-player-name') || ''
    } catch {
        return ''
    }
}

export const savePlayerName = (name: string) => {
    try {
        localStorage.setItem('zborle-player-name', name)
    } catch {
        // ignore
    }
}
