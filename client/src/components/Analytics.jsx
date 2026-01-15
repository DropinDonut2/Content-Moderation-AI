import { useState, useEffect } from 'react'
import { getLogs } from '../services/api'

function Analytics() {
    const [stats, setStats] = useState({
        byVerdict: {},
        byCategory: {},
        total: 0,
        avgConfidence: 0
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchAnalytics()
    }, [])

    const fetchAnalytics = async () => {
        try {
            const response = await getLogs({ limit: 1000 })
            const logs = response.data

            // Calculate stats
            const byVerdict = logs.reduce((acc, log) => {
                acc[log.verdict] = (acc[log.verdict] || 0) + 1
                return acc
            }, {})

            const byCategory = logs.reduce((acc, log) => {
                if (log.category) {
                    acc[log.category] = (acc[log.category] || 0) + 1
                }
                return acc
            }, {})

            const avgConfidence = logs.length > 0
                ? logs.reduce((sum, log) => sum + log.confidence, 0) / logs.length
                : 0

            setStats({
                byVerdict,
                byCategory,
                total: logs.length,
                avgConfidence
            })
        } catch (error) {
            console.error('Failed to fetch analytics:', error)
        } finally {
            setLoading(false)
        }
    }

    const getBarWidth = (count, max) => `${(count / max) * 100}%`

    if (loading) {
        return <div className="loading-container"><div className="spinner"></div></div>
    }

    const maxVerdictCount = Math.max(...Object.values(stats.byVerdict), 1)
    const maxCategoryCount = Math.max(...Object.values(stats.byCategory), 1)

    return (
        <div className="analytics">
            <div className="page-header">
                <h2>Analytics</h2>
                <p>Content moderation statistics and insights</p>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="label">Total Moderated</div>
                    <div className="value">{stats.total}</div>
                </div>
                <div className="stat-card">
                    <div className="label">Avg Confidence</div>
                    <div className="value">{(stats.avgConfidence * 100).toFixed(1)}%</div>
                </div>
                <div className="stat-card success">
                    <div className="label">Safe Rate</div>
                    <div className="value">
                        {stats.total > 0 ? ((stats.byVerdict.safe || 0) / stats.total * 100).toFixed(1) : 0}%
                    </div>
                </div>
                <div className="stat-card danger">
                    <div className="label">Rejection Rate</div>
                    <div className="value">
                        {stats.total > 0 ? ((stats.byVerdict.rejected || 0) / stats.total * 100).toFixed(1) : 0}%
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="card">
                    <h3 style={{ marginBottom: '1.5rem' }}>Verdicts</h3>
                    {Object.entries(stats.byVerdict).map(([verdict, count]) => (
                        <div key={verdict} style={{ marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                <span style={{ textTransform: 'capitalize' }}>{verdict}</span>
                                <span>{count}</span>
                            </div>
                            <div style={{
                                height: '8px',
                                background: 'var(--bg-secondary)',
                                borderRadius: '4px',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    width: getBarWidth(count, maxVerdictCount),
                                    height: '100%',
                                    background: verdict === 'safe' ? 'var(--success)' : verdict === 'flagged' ? 'var(--warning)' : 'var(--danger)',
                                    borderRadius: '4px',
                                    transition: 'width 0.3s ease'
                                }} />
                            </div>
                        </div>
                    ))}
                    {Object.keys(stats.byVerdict).length === 0 && (
                        <div className="empty-state">No data available</div>
                    )}
                </div>

                <div className="card">
                    <h3 style={{ marginBottom: '1.5rem' }}>Categories</h3>
                    {Object.entries(stats.byCategory).map(([category, count]) => (
                        <div key={category} style={{ marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                <span>{category.replace('_', ' ')}</span>
                                <span>{count}</span>
                            </div>
                            <div style={{
                                height: '8px',
                                background: 'var(--bg-secondary)',
                                borderRadius: '4px',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    width: getBarWidth(count, maxCategoryCount),
                                    height: '100%',
                                    background: 'var(--accent-gradient)',
                                    borderRadius: '4px',
                                    transition: 'width 0.3s ease'
                                }} />
                            </div>
                        </div>
                    ))}
                    {Object.keys(stats.byCategory).length === 0 && (
                        <div className="empty-state">No violations detected</div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Analytics
