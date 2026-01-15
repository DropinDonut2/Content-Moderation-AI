import { Routes, Route, NavLink } from 'react-router-dom'
import Dashboard from './components/Dashboard'
import ReviewQueue from './components/ReviewQueue'
import PolicyManager from './components/PolicyManager'
import Analytics from './components/Analytics'

function App() {
    return (
        <div className="app">
            <nav className="sidebar">
                <div className="logo">
                    <h1>ModerateAI</h1>
                </div>
                <ul className="nav-links">
                    <li>
                        <NavLink to="/" end>
                            <span className="icon">📊</span>
                            Dashboard
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/review">
                            <span className="icon">📋</span>
                            Review Queue
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/policies">
                            <span className="icon">📜</span>
                            Policies
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/analytics">
                            <span className="icon">📈</span>
                            Analytics
                        </NavLink>
                    </li>
                </ul>
            </nav>
            <main className="content">
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/review" element={<ReviewQueue />} />
                    <Route path="/policies" element={<PolicyManager />} />
                    <Route path="/analytics" element={<Analytics />} />
                </Routes>
            </main>
        </div>
    )
}

export default App
