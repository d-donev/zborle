import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { ThemeProvider } from './contexts/ThemeContext'
import { SoundProvider } from './contexts/SoundContext'
import { SettingsProvider } from './contexts/SettingsContext'

const root = createRoot(document.getElementById('root')!)

root.render(
    <StrictMode>
        <ThemeProvider>
            <SettingsProvider>
                <SoundProvider>
                    <App />
                </SoundProvider>
            </SettingsProvider>
        </ThemeProvider>
    </StrictMode>,
)
