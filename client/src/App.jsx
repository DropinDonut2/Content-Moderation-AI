import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import Dashboard from './components/Dashboard'
import ReviewQueue from './components/ReviewQueue'
import PolicyManager from './components/PolicyManager'
import Analytics from './components/Analytics'
import Moderate from './pages/Moderate'
import { LayoutDashboard, Shield, ClipboardList, PenTool, BarChart3, User } from 'lucide-react'

function App() {
    return (
        <div className="flex min-h-screen bg-bg-primary text-text-primary font-mono selection:bg-white selection:text-black">
            <Sidebar />
            <main className="flex-1 transition-all duration-300 ml-64 border-l border-white/10">
                <div className="layout-container min-h-screen">
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/moderate" element={<Moderate />} />
                        <Route path="/review" element={<ReviewQueue />} />
                        <Route path="/policies" element={<PolicyManager />} />
                        <Route path="/analytics" element={<Analytics />} />
                    </Routes>
                </div>
            </main>
        </div>
    )
}

function Sidebar() {
    const location = useLocation();

    const navItems = [
        { to: "/", icon: <LayoutDashboard size={18} />, label: "Dashboard" },
        { to: "/moderate", icon: <PenTool size={18} />, label: "Moderate" },
        { to: "/review", icon: <ClipboardList size={18} />, label: "Queue" },
        { to: "/policies", icon: <Shield size={18} />, label: "Policies" },
        { to: "/analytics", icon: <BarChart3 size={18} />, label: "Analytics" },
    ];

    return (
        <nav className="fixed w-64 h-full bg-black flex flex-col z-50">
            <div className="p-6 border-b border-white/10">
                <h1 className="text-xl font-bold text-white flex items-center gap-3 uppercase tracking-tighter">
                    <div className="w-6 h-6 bg-white text-black flex items-center justify-center text-sm font-black">M</div>
                    Moderate System
                </h1>
            </div>

            <ul className="flex flex-col gap-px px-0 pt-4">
                {navItems.map((item) => (
                    <li key={item.to}>
                        <NavLink
                            to={item.to}
                            end={item.to === "/"}
                            className={({ isActive }) => `
                flex items-center gap-4 px-6 py-4 transition-all duration-200 border-l-2
                ${isActive
                                    ? 'bg-white text-black border-l-black font-bold'
                                    : 'text-text-secondary hover:text-white border-l-transparent hover:bg-white/5'
                                }
              `}
                        >
                            <span className="opacity-80">{item.icon}</span>
                            <span className="text-sm tracking-widest uppercase">{item.label}</span>
                        </NavLink>
                    </li>
                ))}
            </ul>

            <div className="mt-auto p-6 border-t border-white/10">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/10 flex items-center justify-center text-white">
                        <User size={16} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-white uppercase tracking-wider">Admin User</span>
                        <span className="text-[10px] text-text-secondary font-mono">WORKSPACE_A</span>
                    </div>
                </div>
            </div>
        </nav>
    );
}

export default App
