import { ReactNode } from 'react'
import classnames from 'classnames'
import { KeyValue } from '../../lib/keyboard'
import { CharStatus } from '../../lib/statuses'

type Props = {
    children?: ReactNode
    value: KeyValue
    width?: number
    status?: CharStatus
    onClick: (value: KeyValue) => void
}

export const Key = ({ children, status, width = 40, value, onClick }: Props) => {
    const isEnter = value === 'ENTER'
    const classes = classnames(
        'flex items-center justify-center rounded mx-[1px] sm:mx-0.5 font-bold cursor-pointer transition-all duration-150 select-none',
        {
            // Font size - smaller for ENTER
            'text-sm': isEnter,
            'text-lg': !isEnter,
            // Default state
            'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 active:bg-slate-400 dark:active:bg-slate-500 text-slate-800 dark:text-slate-200':
                !status,
            'tile-absent': status === 'absent',
            'tile-correct': status === 'correct',
            'tile-present': status === 'present',
            'hover:brightness-95 active:brightness-90': !!status,
        },
    )

    return (
        <button
            type="button"
            // grow to fill the row on narrow phones, but never wider than `width`
            style={{ flex: `${width / 40} 1 0`, maxWidth: `${width}px`, minWidth: 0, height: '58px' }}
            className={classes}
            onClick={(e) => {
                onClick(value)
                // keep focus off the key so a physical Enter press doesn't "click" it again
                e.currentTarget.blur()
            }}
            aria-label={value === 'DELETE' ? 'Избриши' : value}
        >
            {children || value}
        </button>
    )
}
