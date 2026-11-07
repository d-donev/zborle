import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDownTrayIcon, ShareIcon } from '@heroicons/react/24/outline'
import { BaseModal } from './BaseModal'
import { Archive } from '../../lib/archive'
import { computeYearStats, drawRecapCard, wordsLabel } from '../../lib/recap'
import { loadPlayerName, savePlayerName } from '../../lib/duel/store'

type Props = {
    isOpen: boolean
    handleClose: () => void
    year: number
    archive: Archive
    todayDay: number
    showAlert: (message: string, variant?: 'success' | 'warning' | 'error') => void
}

const siteUrl = () => `${window.location.host}${import.meta.env.BASE_URL}`.replace(/\/$/, '')

const button =
    'inline-flex items-center justify-center gap-2 w-full rounded-xl px-4 py-3 text-base font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 transition'

export const RecapModal = ({ isOpen, handleClose, year, archive, todayDay, showAlert }: Props) => {
    const [name, setName] = useState(loadPlayerName)
    const [imageUrl, setImageUrl] = useState<string | null>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const stats = useMemo(() => computeYearStats(archive, year, todayDay), [archive, year, todayDay])
    const displayName = name.trim().slice(0, 24) || 'Зборле играч'

    // Redraw the card whenever the name changes
    useEffect(() => {
        if (!isOpen) return
        const canvas = canvasRef.current ?? document.createElement('canvas')
        canvasRef.current = canvas
        drawRecapCard(canvas, displayName, stats, siteUrl())
        setImageUrl(canvas.toDataURL('image/png'))
    }, [isOpen, displayName, stats])

    const fileName = `zborle-${year}-${displayName.replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()}.png`

    // (toBlob reports back through its callback, so the promise waits for it)
    const getBlob = () =>
        new Promise<Blob | null>((resolve) => {
            const canvas = canvasRef.current
            if (!canvas) return resolve(null)
            canvas.toBlob(resolve, 'image/png')
        })

    const download = async () => {
        savePlayerName(name.trim())
        const blob = await getBlob()
        // the preview image is a ready-made PNG too, so it works as a fallback
        const url = blob ? URL.createObjectURL(blob) : imageUrl
        if (!url) return showAlert('Не успеавме да ја создадеме сликата')
        const link = document.createElement('a')
        link.href = url
        link.download = fileName
        document.body.appendChild(link)
        link.click()
        link.remove()
        if (blob) window.setTimeout(() => URL.revokeObjectURL(url), 5000)
    }

    const file = () => getBlob().then((blob) => (blob ? new File([blob], fileName, { type: 'image/png' }) : null))
    const [canShareFiles, setCanShareFiles] = useState(false)
    useEffect(() => {
        if (!isOpen || !navigator.canShare) return
        file().then((f) => setCanShareFiles(!!f && navigator.canShare({ files: [f] })))
    }, [isOpen, imageUrl])

    const share = async () => {
        savePlayerName(name.trim())
        const f = await file()
        if (!f) return
        try {
            await navigator.share({
                files: [f],
                text: `Во Зборле ${year} погодив ${stats.solved} ${wordsLabel(stats.solved)}! ${window.location.origin}${import.meta.env.BASE_URL}`,
            })
        } catch (e) {
            if ((e as Error).name !== 'AbortError') download()
        }
    }

    return (
        <BaseModal title={`Зборле ${year}`} isOpen={isOpen} handleClose={handleClose}>
            <p className="mt-1 text-center text-sm text-slate-600 dark:text-slate-400">
                Вашата годишна честитка. Достапна до 7 јануари.
            </p>
            <label className="mt-4 block text-left">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Име на честитката</span>
                <input
                    className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-base text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400"
                    value={name}
                    maxLength={24}
                    placeholder="на пр. Марко"
                    onChange={(e) => setName(e.target.value)}
                    onKeyUp={(e) => e.stopPropagation()}
                />
            </label>

            {imageUrl && (
                <img
                    src={imageUrl}
                    alt={`Честитка: ${displayName} погоди ${stats.solved} ${wordsLabel(stats.solved)} во Зборле ${year}`}
                    className="mt-4 w-full rounded-xl shadow-lg"
                />
            )}

            <div className="mt-4 space-y-2">
                <button
                    className={`${button} text-white bg-tile-correct hover:brightness-95 active:brightness-90`}
                    onClick={download}
                >
                    <ArrowDownTrayIcon className="h-5 w-5" aria-hidden="true" />
                    Сними слика
                </button>
                {canShareFiles && (
                    <button
                        className={`${button} text-slate-800 dark:text-slate-100 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600`}
                        onClick={share}
                    >
                        <ShareIcon className="h-5 w-5" aria-hidden="true" />
                        Сподели
                    </button>
                )}
            </div>
        </BaseModal>
    )
}
