import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { ThemeProvider } from './contexts/ThemeContext'
import { SoundProvider } from './contexts/SoundContext'
import { SettingsProvider } from './contexts/SettingsContext'
import { UpdatePrompt } from './components/ui/UpdatePrompt'

const root = createRoot(document.getElementById('root')!)

root.render(
    <StrictMode>
        <ThemeProvider>
            <SettingsProvider>
                <SoundProvider>
                    <App />
                    <UpdatePrompt />
                </SoundProvider>
            </SettingsProvider>
        </ThemeProvider>
    </StrictMode>,
)
