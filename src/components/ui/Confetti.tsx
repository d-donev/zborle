import { useEffect, useRef } from 'react'

type Props = {
    /** Increment to fire a new burst; 0 means nothing has been won yet */
    trigger: number
}

const DURATION = 3500
const COLORS = ['#22c55e', '#eab308', '#f5793a', '#3b9fe8', '#ec4899', '#a855f7']

export const Confetti = ({ trigger }: Props) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        if (!trigger) return
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')
        if (!canvas || !ctx) return

        const resize = () => {
            const dpr = window.devicePixelRatio || 1
            canvas.width = window.innerWidth * dpr
            canvas.height = window.innerHeight * dpr
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        }
        resize()
        window.addEventListener('resize', resize)

        const pieces = Array.from({ length: 180 }, () => ({
            x: window.innerWidth / 2 + (Math.random() - 0.5) * 160,
            y: window.innerHeight * 0.35,
            vx: (Math.random() - 0.5) * 16,
            vy: -Math.random() * 15 - 5,
            size: 6 + Math.random() * 7,
            rotation: Math.random() * Math.PI,
            spin: (Math.random() - 0.5) * 0.3,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
        }))

        let frame = 0
        const start = performance.now()
        const tick = (now: number) => {
            const elapsed = now - start
            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
            ctx.globalAlpha = Math.max(0, 1 - elapsed / DURATION)
            for (const p of pieces) {
                p.vy += 0.32
                p.vx *= 0.99
                p.x += p.vx
                p.y += p.vy
                p.rotation += p.spin
                ctx.save()
                ctx.translate(p.x, p.y)
                ctx.rotate(p.rotation)
                ctx.fillStyle = p.color
                ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
                ctx.restore()
            }
            if (elapsed < DURATION) {
                frame = requestAnimationFrame(tick)
            } else {
                ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
            }
        }
        frame = requestAnimationFrame(tick)

        return () => {
            cancelAnimationFrame(frame)
            window.removeEventListener('resize', resize)
            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
        }
    }, [trigger])

    return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none z-50" aria-hidden="true" />
}
