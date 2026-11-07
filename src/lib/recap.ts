import { Archive, dateFromDayNumber, dayNumberFromDate, getDayResult, getWordForDay } from './archive'

/*
 * The year-end greeting card: from 31 December to 7 January players can download an image
 * with how many words they guessed during the year (taken from the calendar history).
 */

export type YearStats = {
    year: number
    solved: number
    missed: number
    played: number
    bestStreak: number
    averageTries: number | null
    /** one entry per day of the year: won / lost / playing / null (not played or still to come) */
    days: (ReturnType<typeof getDayResult> | 'future')[]
}

/**
 * Which year's card is on offer: on 31 December that year's, during 1-7 January the year that
 * just ended, otherwise none. `?recap=2026` in the address forces it (handy for trying it out).
 */
export const getRecapYear = (todayDay: number, search = window.location.search): number | null => {
    const forced = Number(new URLSearchParams(search).get('recap'))
    if (forced >= 2022 && forced <= 2100) return forced
    const { year, month, day } = dateFromDayNumber(todayDay)
    if (month === 11 && day === 31) return year
    if (month === 0 && day <= 7) return year - 1
    return null
}

export const computeYearStats = (archive: Archive, year: number, todayDay: number): YearStats => {
    const first = dayNumberFromDate(year, 0, 1)
    const last = dayNumberFromDate(year, 11, 31)
    const days: YearStats['days'] = []
    let solved = 0
    let missed = 0
    let triesTotal = 0
    let streak = 0
    let bestStreak = 0

    for (let n = first; n <= last; n++) {
        if (n > todayDay) {
            days.push('future')
            continue
        }
        const guesses = archive[n]
        const result = getDayResult(guesses, getWordForDay(n))
        days.push(result)
        if (result === 'won') {
            solved++
            triesTotal += guesses!.length
            streak++
            bestStreak = Math.max(bestStreak, streak)
        } else {
            if (result === 'lost') missed++
            streak = 0
        }
    }

    return {
        year,
        solved,
        missed,
        played: days.filter((d) => d === 'won' || d === 'lost' || d === 'playing').length,
        bestStreak,
        averageTries: solved ? Math.round((triesTotal / solved) * 10) / 10 : null,
        days,
    }
}

export const wordsLabel = (count: number) => (count === 1 ? 'збор' : 'зборови')

const WIDTH = 1080
const HEIGHT = 1350
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif'
const GREEN = '#22c55e'
const YELLOW = '#eab308'
const GREY = '#475569'

/** Same pseudo-random sequence every time, so the decoration doesn't jump between redraws */
const seeded = (seed: number) => () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
}

const fitText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number, size: number, weight = 800) => {
    let fontSize = size
    do {
        ctx.font = `${weight} ${fontSize}px ${FONT}`
        fontSize -= 4
    } while (ctx.measureText(text).width > maxWidth && fontSize > 24)
}

const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
}

export const drawRecapCard = (canvas: HTMLCanvasElement, name: string, stats: YearStats, siteUrl: string) => {
    canvas.width = WIDTH
    canvas.height = HEIGHT
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Background with soft confetti
    const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT)
    bg.addColorStop(0, '#0f172a')
    bg.addColorStop(1, '#1e293b')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, WIDTH, HEIGHT)
    const random = seeded(stats.year)
    const confettiColors = [GREEN, YELLOW, '#f5793a', '#3b9fe8', '#ec4899', '#a855f7']
    for (let i = 0; i < 60; i++) {
        // only along the sides and above the title, so nothing covers the text or the year map
        const onLeft = random() < 0.5
        const x = onLeft ? 15 + random() * 120 : WIDTH - 135 + random() * 120
        const y = 20 + random() * 1060
        ctx.save()
        ctx.globalAlpha = 0.25 + random() * 0.35
        ctx.translate(x, y)
        ctx.rotate(random() * Math.PI)
        ctx.fillStyle = confettiColors[Math.floor(random() * confettiColors.length)]
        ctx.fillRect(-9, -4, 18, 8)
        ctx.restore()
    }

    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'

    // ЗБОРЛЕ spelled in tiles
    const title = 'ЗБОРЛЕ'
    const tileColors = [GREEN, YELLOW, GREY, GREEN, GREEN, YELLOW]
    const tile = 96
    const gap = 12
    const titleX = (WIDTH - (title.length * tile + (title.length - 1) * gap)) / 2
    title.split('').forEach((letter, i) => {
        const x = titleX + i * (tile + gap)
        ctx.fillStyle = tileColors[i]
        roundRect(ctx, x, 70, tile, tile, 12)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.font = `800 58px ${FONT}`
        ctx.fillText(letter, x + tile / 2, 70 + tile / 2 + 21)
    })

    ctx.fillStyle = '#ffffff'
    ctx.font = `900 150px ${FONT}`
    ctx.fillText(String(stats.year), WIDTH / 2, 345)

    ctx.fillStyle = '#cbd5e1'
    ctx.font = `600 54px ${FONT}`
    ctx.fillText('Честитки,', WIDTH / 2, 450)

    ctx.fillStyle = '#facc15'
    fitText(ctx, `${name}!`, WIDTH - 120, 92)
    ctx.fillText(`${name}!`, WIDTH / 2, 550)

    ctx.fillStyle = '#cbd5e1'
    ctx.font = `600 44px ${FONT}`
    ctx.fillText('погодивте', WIDTH / 2, 640)

    ctx.fillStyle = GREEN
    ctx.font = `900 210px ${FONT}`
    ctx.fillText(String(stats.solved), WIDTH / 2, 830)

    ctx.fillStyle = '#ffffff'
    ctx.font = `700 50px ${FONT}`
    ctx.fillText(`${wordsLabel(stats.solved)} во Зборле ${stats.year}`, WIDTH / 2, 905)

    // Three small stat boxes
    const boxes = [
        { value: String(stats.played), label: 'одиграни дена' },
        { value: String(stats.bestStreak), label: 'најдолга серија' },
        { value: stats.averageTries === null ? '-' : String(stats.averageTries).replace('.', ','), label: 'просек обиди' },
    ]
    const boxW = 290
    const boxGap = 30
    const boxX = (WIDTH - (3 * boxW + 2 * boxGap)) / 2
    boxes.forEach((box, i) => {
        const x = boxX + i * (boxW + boxGap)
        ctx.fillStyle = 'rgba(255,255,255,0.07)'
        roundRect(ctx, x, 960, boxW, 130, 20)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.font = `800 56px ${FONT}`
        ctx.fillText(box.value, x + boxW / 2, 1025)
        ctx.fillStyle = '#94a3b8'
        ctx.font = `500 28px ${FONT}`
        ctx.fillText(box.label, x + boxW / 2, 1068)
    })

    // The whole year, one square per day (weeks as columns, Monday on top)
    const cell = 15
    const cellGap = 4
    const firstWeekday = (new Date(Date.UTC(stats.year, 0, 1)).getUTCDay() + 6) % 7
    const weeks = Math.ceil((firstWeekday + stats.days.length) / 7)
    const mapX = (WIDTH - (weeks * (cell + cellGap) - cellGap)) / 2
    const mapY = 1125
    stats.days.forEach((result, i) => {
        const slot = firstWeekday + i
        const x = mapX + Math.floor(slot / 7) * (cell + cellGap)
        const y = mapY + (slot % 7) * (cell + cellGap)
        ctx.fillStyle =
            result === 'won'
                ? GREEN
                : result === 'lost'
                  ? '#ef4444'
                  : result === 'playing'
                    ? YELLOW
                    : result === 'future'
                      ? 'rgba(255,255,255,0.04)'
                      : 'rgba(255,255,255,0.12)'
        roundRect(ctx, x, y, cell, cell, 3)
        ctx.fill()
    })

    ctx.fillStyle = '#64748b'
    ctx.font = `500 28px ${FONT}`
    ctx.fillText(siteUrl, WIDTH / 2, 1310)
}
