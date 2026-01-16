import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
    const [isDarkMode, setIsDarkMode] = useState(() => {
        // Check localStorage first
        const saved = localStorage.getItem('theme')
        if (saved) return saved === 'dark'
        // Default to dark mode
        return true
    })

    useEffect(() => {
        // Save to localStorage
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light')
        
        // Apply to document
        if (isDarkMode) {
            document.documentElement.classList.remove('light-mode')
        } else {
            document.documentElement.classList.add('light-mode')
        }
    }, [isDarkMode])

    const toggleTheme = () => setIsDarkMode(prev => !prev)

    return (
        <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    const context = useContext(ThemeContext)
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider')
    }
    return context
}