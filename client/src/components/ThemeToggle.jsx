import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

function ThemeToggle({ showLabel = false }) {
    const { isDarkMode, toggleTheme } = useTheme()

    return (
        <button
            onClick={toggleTheme}
            className="flex items-center gap-2 p-2 rounded hover:bg-white/10 transition-colors"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
            {isDarkMode ? (
                <Sun size={18} className="text-yellow-400" />
            ) : (
                <Moon size={18} className="text-blue-400" />
            )}
            {showLabel && (
                <span className="text-xs uppercase tracking-wider">
                    {isDarkMode ? 'Light' : 'Dark'}
                </span>
            )}
        </button>
    )
}

export default ThemeToggle