import { useState, useEffect } from 'react'
import { Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom'
import Dashboard from './components/Dashboard'
import Activities from './components/Activities'
import PolicyManager from './components/PolicyManager'
import Moderate from './pages/Moderate'
import Analytics from './components/Analytics'
import SubmitContent from './pages/SubmitContent'
import ThemeToggle from './components/ThemeToggle'
import { useTheme } from './context/ThemeContext'
import { 
    LayoutDashboard, Shield, ClipboardList, PenTool, BarChart3, User, 
    ChevronLeft, ChevronRight, PlusCircle, Keyboard, X, Activity
} from 'lucide-react'

function App() {
    const [isCollapsed, setIsCollapsed] = useState(() => {
        const saved = localStorage.getItem('sidebarCollapsed')
        return saved ? JSON.parse(saved) : false
    })
    const [showShortcuts, setShowShortcuts] = useState(false)
    const navigate = useNavigate()

    // Save sidebar state
    useEffect(() => {
        localStorage.setItem('sidebarCollapsed', JSON.stringify(isCollapsed))
    }, [isCollapsed])

    // Keyboard shortcuts for moderators
    useEffect(() => {
        const handleKeydown = (e) => {
            // Don't trigger if typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
            
            // Alt + key shortcuts
            if (e.altKey) {
                switch (e.key) {
                    case 'd':
                        e.preventDefault()
                        navigate('/')
                        break
                    case 'm':
                        e.preventDefault()
                        navigate('/moderate')
                        break
                    case 'q':
                        e.preventDefault()
                        navigate('/review')
                        break
                    case 'p':
                        e.preventDefault()
                        navigate('/policies')
                        break
                    case 'a':
                        e.preventDefault()
                        navigate('/analytics')
                        break
                    case 's':
                        e.preventDefault()
                        navigate('/submit')
                        break
                    case 'b':
                        e.preventDefault()
                        setIsCollapsed(prev => !prev)
                        break
                }
            }
            
            // ? to show shortcuts
            if (e.key === '?' && !e.ctrlKey && !e.altKey) {
                e.preventDefault()
                setShowShortcuts(prev => !prev)
            }
            
            // Escape to close shortcuts modal
            if (e.key === 'Escape') {
                setShowShortcuts(false)
            }
        }

        window.addEventListener('keydown', handleKeydown)
        return () => window.removeEventListener('keydown', handleKeydown)
    }, [navigate])

    return (
        <div className="flex min-h-screen font-mono" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            <Sidebar isCollapsed={isCollapsed} toggleCollapse={() => setIsCollapsed(!isCollapsed)} />
            <main 
                className={`flex-1 transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'}`}
                style={{ borderLeft: '1px solid var(--border-color)' }}
            >
                <div className="layout-container min-h-screen animate-fade-in">
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/moderate" element={<Moderate />} />
                        <Route path="/submit" element={<SubmitContent />} />
                        <Route path="/review" element={<Activities />} />
                        <Route path="/policies" element={<PolicyManager />} />
                        <Route path="/analytics" element={<Analytics />} />
                    </Routes>
                </div>
            </main>

            {/* Keyboard Shortcuts Modal */}
            {showShortcuts && (
                <KeyboardShortcutsModal onClose={() => setShowShortcuts(false)} />
            )}

            {/* Floating Shortcuts Button */}
            <button
                onClick={() => setShowShortcuts(true)}
                className="fixed bottom-6 right-6 p-3 rounded-full shadow-lg transition-all hover:scale-110 no-print"
                style={{ 
                    backgroundColor: 'var(--bg-card)', 
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)'
                }}
                title="Keyboard Shortcuts (?)"
            >
                <Keyboard size={20} />
            </button>
        </div>
    )
}

function Sidebar({ isCollapsed, toggleCollapse }) {
    const location = useLocation()

    const navItems = [
        { to: "/", icon: <LayoutDashboard size={18} />, label: "Dashboard", shortcut: "Alt+D" },
        { to: "/submit", icon: <PlusCircle size={18} />, label: "Submit", shortcut: "Alt+S" },
        { to: "/moderate", icon: <PenTool size={18} />, label: "Moderate", shortcut: "Alt+M" },
        { to: "/review", icon: <ClipboardList size={18} />, label: "Activities", shortcut: "Alt+Q" },
        { to: "/policies", icon: <Shield size={18} />, label: "Policies", shortcut: "Alt+P" },
        { to: "/analytics", icon: <BarChart3 size={18} />, label: "Analytics", shortcut: "Alt+A" },
    ]

    return (
        <nav 
            className={`fixed h-full flex flex-col z-50 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'} group`}
            style={{ 
                backgroundColor: 'var(--sidebar-bg)',
                borderRight: '1px solid var(--border-color)'
            }}
        >
            {/* Floating Toggle Button */}
            <button
                onClick={toggleCollapse}
                className="absolute -right-3 top-8 w-6 h-6 rounded-full flex items-center justify-center transition-all z-50 shadow-sm hover:scale-110"
                style={{
                    backgroundColor: 'var(--sidebar-bg)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--sidebar-text)'
                }}
                title={isCollapsed ? "Expand (Alt+B)" : "Collapse (Alt+B)"}
            >
                {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
            </button>

            {/* Header */}
            <div 
                className={`p-6 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} h-[73px]`}
                style={{ borderBottom: '1px solid var(--border-color)' }}
            >
                {!isCollapsed && (
                    <h1 className="text-xl font-bold text-white flex items-center gap-3 uppercase tracking-tighter whitespace-nowrap overflow-hidden">
                        <div className="w-6 h-6 bg-white text-black flex items-center justify-center text-sm font-black">M</div>
                        Moderate
                    </h1>
                )}
                {isCollapsed && (
                    <div className="w-8 h-8 bg-white text-black flex items-center justify-center text-sm font-black font-mono">M</div>
                )}
            </div>

            {/* Navigation */}
            <ul className="flex flex-col gap-px px-0 pt-4 cursor-pointer flex-1">
                {navItems.map((item) => (
                    <li key={item.to} title={isCollapsed ? `${item.label} (${item.shortcut})` : item.shortcut}>
                        <NavLink
                            to={item.to}
                            end={item.to === "/"}
                            className={({ isActive }) => `
                                flex items-center gap-4 px-6 py-4 transition-all duration-200 border-l-2
                                ${isActive
                                    ? 'bg-white text-black border-l-black font-bold'
                                    : 'text-zinc-400 hover:text-white border-l-transparent hover:bg-white/5'
                                }
                                ${isCollapsed ? 'justify-center px-2' : ''}
                            `}
                        >
                            <span className="opacity-80">{item.icon}</span>
                            {!isCollapsed && (
                                <div className="flex justify-between items-center flex-1">
                                    <span className="text-sm tracking-widest uppercase whitespace-nowrap">{item.label}</span>
                                    <span className="text-[10px] text-zinc-600 font-mono">{item.shortcut.replace('Alt+', '')}</span>
                                </div>
                            )}
                        </NavLink>
                    </li>
                ))}
            </ul>

            {/* Footer */}
            <div style={{ borderTop: '1px solid var(--border-color)' }}>
                <div className={`p-4 transition-all duration-300 ${isCollapsed ? 'flex flex-col items-center gap-4' : 'flex items-center justify-between'}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white/10 flex items-center justify-center text-white shrink-0 rounded">
                            <User size={16} />
                        </div>
                        {!isCollapsed && (
                            <div className="flex flex-col overflow-hidden">
                                <span className="text-xs font-bold text-white uppercase tracking-wider truncate">Admin</span>
                                <span className="text-[10px] text-zinc-500 font-mono truncate">WORKSPACE_A</span>
                            </div>
                        )}
                    </div>
                    <ThemeToggle showLabel={!isCollapsed} />
                </div>
            </div>
        </nav>
    )
}

function KeyboardShortcutsModal({ onClose }) {
    const shortcuts = [
        { category: 'Navigation', items: [
            { keys: 'Alt + D', action: 'Go to Dashboard' },
            { keys: 'Alt + S', action: 'Go to Submit Content' },
            { keys: 'Alt + M', action: 'Go to Moderate' },
            { keys: 'Alt + Q', action: 'Go to Activities' },
            { keys: 'Alt + P', action: 'Go to Policies' },
            { keys: 'Alt + A', action: 'Go to Analytics' },
        ]},
        { category: 'Interface', items: [
            { keys: 'Alt + B', action: 'Toggle Sidebar' },
            { keys: '?', action: 'Show/Hide Shortcuts' },
            { keys: 'Esc', action: 'Close Modal' },
        ]},
        { category: 'Review Activities', items: [
            { keys: 'A', action: 'Approve Current Item' },
            { keys: 'R', action: 'Reject Current Item' },
            { keys: 'S', action: 'Skip Current Item' },
            { keys: '↑ / ↓', action: 'Navigate Items' },
        ]},
    ]

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div 
                className="modal-content w-full max-w-lg p-6" 
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold uppercase tracking-wider flex items-center gap-2">
                        <Keyboard size={20} />
                        Keyboard Shortcuts
                    </h2>
                    <button 
                        onClick={onClose}
                        className="p-1 hover:bg-white/10 rounded transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-6">
                    {shortcuts.map(section => (
                        <div key={section.category}>
                            <h3 
                                className="text-xs uppercase tracking-wider mb-3 pb-2"
                                style={{ 
                                    color: 'var(--text-secondary)',
                                    borderBottom: '1px solid var(--border-color)'
                                }}
                            >
                                {section.category}
                            </h3>
                            <div className="space-y-2">
                                {section.items.map(shortcut => (
                                    <div 
                                        key={shortcut.keys} 
                                        className="flex justify-between items-center py-1"
                                    >
                                        <span style={{ color: 'var(--text-secondary)' }}>
                                            {shortcut.action}
                                        </span>
                                        <kbd 
                                            className="px-2 py-1 text-xs font-mono rounded"
                                            style={{ 
                                                backgroundColor: 'var(--bg-secondary)',
                                                border: '1px solid var(--border-color)'
                                            }}
                                        >
                                            {shortcut.keys}
                                        </kbd>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div 
                    className="mt-6 pt-4 text-center text-xs"
                    style={{ 
                        borderTop: '1px solid var(--border-color)',
                        color: 'var(--text-muted)'
                    }}
                >
                    Press <kbd className="px-1 rounded" style={{ backgroundColor: 'var(--bg-secondary)' }}>?</kbd> anywhere to toggle this panel
                </div>
            </div>
        </div>
    )
}

export default App