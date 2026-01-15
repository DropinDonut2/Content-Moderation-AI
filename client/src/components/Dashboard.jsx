import { useState, useEffect } from 'react'
import { getLogs } from '../services/api'

function Dashboard() {
    const [stats, setStats] = useState({
        total: 0,
        safe: 0,
        flagged: 0,
        rejected: 0,
        pending: 0
    })
    const [recentLogs, setRecentLogs] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const response = await getLogs({ limit: 10 })
            const logs = response.data

            // Calculate stats
            const total = response.pagination?.total || logs.length
            const safe = logs.filter(l => l.verdict === 'safe').length
            const flagged = logs.filter(l => l.verdict === 'flagged').length
            const rejected = logs.filter(l => l.verdict === 'rejected').length
            const pending = logs.filter(l => l.reviewStatus === 'pending').length

            setStats({ total, safe, flagged, rejected, pending })
            setRecentLogs(logs)
        } catch (error) {
            console.error('Failed to fetch data:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
            </div>
        )
    }

    return (
        <div className="dashboard">
            <div className="page-header">
                <h2>Dashboard</h2>
                <p>Overview of content moderation activity</p>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="label">Total Moderated</div>
                    <div className="value">{stats.total}</div>
                </div>
                <div className="stat-card success">
                    <div className="label">Safe Content</div>
                    <div className="value">{stats.safe}</div>
                </div>
                <div className="stat-card warning">
                    <div className="label">Flagged</div>
                    <div className="value">{stats.flagged}</div>
                </div>
                <div className="stat-card danger">
                    <div className="label">Rejected</div>
                    <div className="value">{stats.rejected}</div>
                </div>
            </div>

            <div className="card">
                <h3 style={{ marginBottom: '1rem' }}>Recent Activity</h3>
                {recentLogs.length === 0 ? (
                    <div className="empty-state">
                        <div className="icon">📭</div>
                        <p>No moderation logs yet</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Content ID</th>
                                    <th>Type</th>
                                    <th>Verdict</th>
                                    <th>Confidence</th>
                                    <th>Category</th>
                                    <th>Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentLogs.map(log => (
                                    <tr key={log._id}>
                                        <td>{log.contentId}</td>
                                        <td>{log.contentType}</td>
                                        <td><span className={`badge ${log.verdict}`}>{log.verdict}</span></td>
                                        <td>{(log.confidence * 100).toFixed(0)}%</td>
                                        <td>{log.category || '-'}</td>
                                        <td>{new Date(log.createdAt).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

export default Dashboard
