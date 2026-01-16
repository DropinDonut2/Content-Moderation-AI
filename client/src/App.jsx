import { useState } from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import Dashboard from './components/Dashboard'
import ReviewQueue from './components/ReviewQueue'
import PolicyManager from './components/PolicyManager'
import Moderate from './pages/Moderate'
import Analytics from './components/Analytics'
import SubmitContent from './pages/SubmitContent'
import ThemeToggle from './components/ThemeToggle'
import { LayoutDashboard, Shield, ClipboardList, PenTool, BarChart3, User, ChevronLeft, ChevronRight, PlusCircle } from 'lucide-react'

function App() {
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <div className="flex min-h-screen bg-bg-primary text-text-primary font-mono selection:bg-white selection:text-black">
            <Sidebar isCollapsed={isCollapsed} toggleCollapse={() => setIsCollapsed(!isCollapsed)} />
            <main className={`flex-1 transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'} border-l border-white/10`}>
                <div className="layout-container min-h-screen">
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/moderate" element={<Moderate />} />
                        <Route path="/submit" element={<SubmitContent />} />
                        <Route path="/review" element={<ReviewQueue />} />
                        <Route path="/policies" element={<PolicyManager />} />
                        <Route path="/analytics" element={<Analytics />} />
                    </Routes>
                </div>
            </main>
        </div>
    )
}

function Sidebar({ isCollapsed, toggleCollapse }) {
    const location = useLocation();

    const navItems = [
        { to: "/", icon: <LayoutDashboard size={18} />, label: "Dashboard" },
        { to: "/submit", icon: <PlusCircle size={18} />, label: "Submit Content" },
        { to: "/moderate", icon: <PenTool size={18} />, label: "Moderate" },
        { to: "/review", icon: <ClipboardList size={18} />, label: "Queue" },
        { to: "/policies", icon: <Shield size={18} />, label: "Policies" },
        { to: "/analytics", icon: <BarChart3 size={18} />, label: "Analytics" },
    ];

    return (
        <nav className={`fixed h-full bg-black flex flex-col z-50 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'} border-r border-white/10 group`}>

            {/* Floating Toggle Button */}
            <button
                onClick={toggleCollapse}
                className="absolute -right-3 top-8 w-6 h-6 bg-black border border-white/10 rounded-full flex items-center justify-center text-text-secondary hover:text-white hover:border-white hover:bg-zinc-900 transition-all z-50 shadow-sm"
                title={isCollapsed ? "Expand" : "Collapse"}
            >
                {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
            </button>

            {/* Header */}
            <div className={`p-6 border-b border-white/10 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} h-[73px]`}>
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
            <ul className="flex flex-col gap-px px-0 pt-4 cursor-pointer">
                {navItems.map((item) => (
                    <li key={item.to} title={isCollapsed ? item.label : ''}>
                        <NavLink
                            to={item.to}
                            end={item.to === "/"}
                            className={({ isActive }) => `
                                flex items-center gap-4 px-6 py-4 transition-all duration-200 border-l-2
                                ${isActive
                                    ? 'bg-white text-black border-l-black font-bold'
                                    : 'text-text-secondary hover:text-white border-l-transparent hover:bg-white/5'
                                }
                                ${isCollapsed ? 'justify-center px-2' : ''}
                            `}
                        >
                            <span className="opacity-80">{item.icon}</span>
                            {!isCollapsed && <span className="text-sm tracking-widest uppercase whitespace-nowrap">{item.label}</span>}
                        </NavLink>
                    </li>
                ))}
            </ul>

            {/* Footer */}
            <div className="mt-auto border-t border-white/10">
                <div className={`p-6 transition-all duration-300 ${isCollapsed ? 'flex flex-col items-center gap-4' : 'flex items-center justify-between'}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white/10 flex items-center justify-center text-white shrink-0">
                            <User size={16} />
                        </div>
                        {!isCollapsed && (
                            <div className="flex flex-col overflow-hidden">
                                <span className="text-xs font-bold text-white uppercase tracking-wider truncate">Admin</span>
                                <span className="text-[10px] text-text-secondary font-mono truncate">WORKSPACE_A</span>
                            </div>
                        )}
                    </div>
                    <ThemeToggle />
                </div>
            </div>
        </nav>
    );
}

export default App
