import { Switch } from '@headlessui/react'
import classnames from 'classnames'
import { BaseModal } from './BaseModal'
import { useSettings } from '../../contexts/SettingsContext'
import { useTheme } from '../../contexts/ThemeContext'
import { useSound } from '../../contexts/SoundContext'

type Props = {
    isOpen: boolean
    handleClose: () => void
    /** Hard mode can't be switched on halfway through a daily game */
    isHardModeLocked: boolean
    onHardModeLocked: () => void
}

type RowProps = {
    label: string
    description: string
    checked: boolean
    onChange: (value: boolean) => void
    disabled?: boolean
}

const SettingRow = ({ label, description, checked, onChange, disabled = false }: RowProps) => (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-slate-200 dark:border-slate-700 last:border-b-0">
        <div className="text-left">
            <p className="font-semibold text-slate-800 dark:text-slate-100">{label}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
        </div>
        <Switch
            checked={checked}
            onChange={onChange}
            aria-label={label}
            className={classnames(
                'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400',
                checked ? 'bg-tile-correct' : 'bg-slate-300 dark:bg-slate-600',
                { 'opacity-50': disabled },
            )}
        >
            <span
                aria-hidden="true"
                className={classnames(
                    'pointer-events-none inline-block h-5 w-5 mt-0.5 rounded-full bg-white shadow transform transition duration-200',
                    checked ? 'translate-x-[22px]' : 'translate-x-0.5',
                )}
            />
        </Switch>
    </div>
)

export const SettingsModal = ({ isOpen, handleClose, isHardModeLocked, onHardModeLocked }: Props) => {
    const { isHardMode, setHardMode, isHighContrast, setHighContrast } = useSettings()
    const { theme, setTheme } = useTheme()
    const { soundEnabled, setSoundEnabled } = useSound()

    return (
        <BaseModal title="Поставки" isOpen={isOpen} handleClose={handleClose}>
            <div className="mt-4">
                <SettingRow
                    label="Тежок режим"
                    description="Откриените букви мора да се користат во следните обиди"
                    checked={isHardMode}
                    disabled={isHardModeLocked}
                    onChange={(value) => (isHardModeLocked ? onHardModeLocked() : setHardMode(value))}
                />
                <SettingRow
                    label="Висок контраст"
                    description="Портокалова и сина наместо зелена и жолта, полесно за далтонисти"
                    checked={isHighContrast}
                    onChange={setHighContrast}
                />
                <SettingRow
                    label="Темна тема"
                    description="Темни бои, попријатни навечер"
                    checked={theme === 'dark'}
                    onChange={(value) => setTheme(value ? 'dark' : 'light')}
                />
                <SettingRow
                    label="Звук"
                    description="Кратки звуци при пишување и на крајот од играта"
                    checked={soundEnabled}
                    onChange={setSoundEnabled}
                />
            </div>
        </BaseModal>
    )
}
