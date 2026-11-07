import { FIRST_ROW, KeyValue, LETTERS_EN, LETTERS_MK, SECOND_ROW, THIRD_ROW } from '../../lib/keyboard'
import { CharValue, getStatuses } from '../../lib/statuses'
import { Key } from './Key'
import { useEffect } from 'react'
import { BackspaceIcon } from '@heroicons/react/24/outline'

type Props = {
    onChar: (value: string) => void
    onDelete: () => void
    onEnter: () => void
    guesses: string[]
    solution: string
}

export const Keyboard = ({ onChar, onDelete, onEnter, guesses, solution }: Props) => {
    const charStatuses = getStatuses(guesses, solution)

    const onClick = (value: KeyValue) => {
        if (value === 'ENTER') {
            onEnter()
        } else if (value === 'DELETE') {
            onDelete()
        } else {
            onChar(value)
        }
    }

    useEffect(() => {
        const listener = (e: KeyboardEvent) => {
            // Don't type into the grid while a dialog is open or a shortcut is used
            if (e.ctrlKey || e.metaKey || e.altKey || document.querySelector('[role="dialog"]')) {
                return
            }
            if (e.code === 'Enter' || e.code === 'NumpadEnter') {
                onEnter()
            } else if (e.code === 'Backspace') {
                onDelete()
            } else {
                const key = e.key.toUpperCase()
                if (key.length === 1 && (LETTERS_MK.includes(key) || LETTERS_EN.includes(key))) {
                    onChar(key)
                }
            }
        }
        // A button clicked just before typing (theme, tabs, a key on screen...) keeps the focus, and
        // the browser would "click" it again on Enter or Space. While the board is up these keys
        // belong to the game, so the browser's default is cancelled and the focus let go.
        const stopButtonActivation = (e: KeyboardEvent) => {
            if (e.key !== 'Enter' && e.key !== ' ') return
            const active = document.activeElement as HTMLElement | null
            if (
                !active ||
                active === document.body ||
                active.matches('input, textarea, select, [contenteditable="true"]') ||
                active.closest('[role="dialog"]')
            ) {
                return
            }
            e.preventDefault()
            active.blur()
        }
        window.addEventListener('keydown', stopButtonActivation, true)
        window.addEventListener('keyup', listener)
        return () => {
            window.removeEventListener('keydown', stopButtonActivation, true)
            window.removeEventListener('keyup', listener)
        }
    }, [onEnter, onDelete, onChar])

    return (
        <div className="mx-1">
            <div className="flex justify-center mb-1">
                {FIRST_ROW.map((letter) => (
                    <Key key={letter} value={letter as CharValue} onClick={onClick} status={charStatuses[letter]} />
                ))}
            </div>
            <div className="flex justify-center mb-1">
                {SECOND_ROW.map((letter) => (
                    <Key key={letter} value={letter as CharValue} onClick={onClick} status={charStatuses[letter]} />
                ))}
            </div>
            <div className="flex justify-center">
                <Key width={65.4} value="ENTER" onClick={onClick}>
                    ENTER
                </Key>
                {THIRD_ROW.map((letter) => (
                    <Key key={letter} value={letter as CharValue} onClick={onClick} status={charStatuses[letter]} />
                ))}
                <Key width={65.4} value="DELETE" onClick={onClick}>
                    <BackspaceIcon className="w-6 h-6" />
                </Key>
            </div>
        </div>
    )
}
