import React, { createContext, useContext, useEffect, useState } from 'react'
import { loadBoolean, saveBoolean } from '../lib/localStorage'

interface SettingsContextType {
    isHardMode: boolean
    setHardMode: (value: boolean) => void
    isHighContrast: boolean
    setHighContrast: (value: boolean) => void
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

const HARD_MODE_KEY = 'zborle-hard-mode'
const HIGH_CONTRAST_KEY = 'zborle-high-contrast'

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isHardMode, setHardModeState] = useState(() => loadBoolean(HARD_MODE_KEY, false))
    const [isHighContrast, setHighContrastState] = useState(() => loadBoolean(HIGH_CONTRAST_KEY, false))

    useEffect(() => {
        saveBoolean(HARD_MODE_KEY, isHardMode)
    }, [isHardMode])

    useEffect(() => {
        document.documentElement.classList.toggle('high-contrast', isHighContrast)
        saveBoolean(HIGH_CONTRAST_KEY, isHighContrast)
    }, [isHighContrast])

    return (
        <SettingsContext.Provider
            value={{
                isHardMode,
                setHardMode: setHardModeState,
                isHighContrast,
                setHighContrast: setHighContrastState,
            }}
        >
            {children}
        </SettingsContext.Provider>
    )
}

export const useSettings = (): SettingsContextType => {
    const context = useContext(SettingsContext)
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider')
    }
    return context
}
