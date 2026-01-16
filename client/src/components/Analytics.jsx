import { useState, useEffect } from 'react'
import { getLogs } from '../services/api'
import { TrendingUp, Shield, CheckCircle2, XCircle } from 'lucide-react'

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

    const getVerdictColor = (verdict) => {
        switch (verdict) {
            case 'safe': return 'var(--safe-text)'
            case 'flagged': return 'var(--flagged-text)'
            case 'rejected': return 'var(--rejected-text)'
            default: return 'var(--text-secondary)'
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="spinner"></div>
            </div>
        )
    }

    const maxVerdictCount = Math.max(...Object.values(stats.byVerdict), 1)
    const maxCategoryCount = Math.max(...Object.values(stats.byCategory), 1)

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            {/* Header */}
            <div 
                className="flex justify-between items-end pb-6"
                style={{ borderBottom: '1px solid var(--border-color)' }}
            >
                <div>
                    <h2 
                        className="text-3xl font-bold mb-2 uppercase tracking-tighter"
                        style={{ color: 'var(--text-primary)' }}
                    >
                        Analytics
                    </h2>
                    <p className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                        // CONTENT_MODERATION_INSIGHTS
                    </p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div 
                    className="p-6 transition-all"
                    style={{ 
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-color)'
                    }}
                >
                    <div className="flex justify-between items-start mb-4">
                        <span 
                            className="text-xs font-bold uppercase tracking-wider"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            Total Moderated
                        </span>
                        <TrendingUp size={20} style={{ color: 'var(--text-secondary)' }} />
                    </div>
                    <div 
                        className="text-3xl font-bold font-mono"
                        style={{ color: 'var(--text-primary)' }}
                    >
                        {stats.total}
                    </div>
                </div>

                <div 
                    className="p-6 transition-all"
                    style={{ 
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-color)'
                    }}
                >
                    <div className="flex justify-between items-start mb-4">
                        <span 
                            className="text-xs font-bold uppercase tracking-wider"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            Avg Confidence
                        </span>
                        <Shield size={20} style={{ color: 'var(--text-secondary)' }} />
                    </div>
                    <div 
                        className="text-3xl font-bold font-mono"
                        style={{ color: 'var(--text-primary)' }}
                    >
                        {(stats.avgConfidence * 100).toFixed(1)}%
                    </div>
                </div>

                <div 
                    className="p-6 transition-all"
                    style={{ 
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-color)'
                    }}
                >
                    <div className="flex justify-between items-start mb-4">
                        <span 
                            className="text-xs font-bold uppercase tracking-wider"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            Safe Rate
                        </span>
                        <CheckCircle2 size={20} style={{ color: 'var(--safe-text)' }} />
                    </div>
                    <div 
                        className="text-3xl font-bold font-mono"
                        style={{ color: 'var(--safe-text)' }}
                    >
                        {stats.total > 0 ? ((stats.byVerdict.safe || 0) / stats.total * 100).toFixed(1) : 0}%
                    </div>
                </div>

                <div 
                    className="p-6 transition-all"
                    style={{ 
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-color)'
                    }}
                >
                    <div className="flex justify-between items-start mb-4">
                        <span 
                            className="text-xs font-bold uppercase tracking-wider"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            Rejection Rate
                        </span>
                        <XCircle size={20} style={{ color: 'var(--rejected-text)' }} />
                    </div>
                    <div 
                        className="text-3xl font-bold font-mono"
                        style={{ color: 'var(--rejected-text)' }}
                    >
                        {stats.total > 0 ? ((stats.byVerdict.rejected || 0) / stats.total * 100).toFixed(1) : 0}%
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Verdicts */}
                <div 
                    className="p-6"
                    style={{ 
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-color)'
                    }}
                >
                    <h3 
                        className="text-sm font-bold mb-6 pb-4 uppercase tracking-wider"
                        style={{ 
                            color: 'var(--text-primary)',
                            borderBottom: '1px solid var(--border-color)'
                        }}
                    >
                        Verdicts Distribution
                    </h3>
                    
                    {Object.entries(stats.byVerdict).length > 0 ? (
                        <div className="space-y-4">
                            {Object.entries(stats.byVerdict).map(([verdict, count]) => (
                                <div key={verdict}>
                                    <div className="flex justify-between mb-2">
                                        <span 
                                            className="capitalize text-sm font-medium"
                                            style={{ color: 'var(--text-primary)' }}
                                        >
                                            {verdict}
                                        </span>
                                        <span 
                                            className="font-mono text-sm font-bold"
                                            style={{ color: getVerdictColor(verdict) }}
                                        >
                                            {count}
                                        </span>
                                    </div>
                                    <div 
                                        className="h-2 rounded overflow-hidden"
                                        style={{ backgroundColor: 'var(--bg-secondary)' }}
                                    >
                                        <div 
                                            className="h-full rounded transition-all duration-300"
                                            style={{ 
                                                width: getBarWidth(count, maxVerdictCount),
                                                backgroundColor: getVerdictColor(verdict)
                                            }} 
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div 
                            className="text-center py-8"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            No data available
                        </div>
                    )}
                </div>

                {/* Categories */}
                <div 
                    className="p-6"
                    style={{ 
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-color)'
                    }}
                >
                    <h3 
                        className="text-sm font-bold mb-6 pb-4 uppercase tracking-wider"
                        style={{ 
                            color: 'var(--text-primary)',
                            borderBottom: '1px solid var(--border-color)'
                        }}
                    >
                        Violation Categories
                    </h3>
                    
                    {Object.entries(stats.byCategory).length > 0 ? (
                        <div className="space-y-4">
                            {Object.entries(stats.byCategory).map(([category, count]) => (
                                <div key={category}>
                                    <div className="flex justify-between mb-2">
                                        <span 
                                            className="text-sm font-medium"
                                            style={{ color: 'var(--text-primary)' }}
                                        >
                                            {category.replace('_', ' ')}
                                        </span>
                                        <span 
                                            className="font-mono text-sm font-bold"
                                            style={{ color: 'var(--text-primary)' }}
                                        >
                                            {count}
                                        </span>
                                    </div>
                                    <div 
                                        className="h-2 rounded overflow-hidden"
                                        style={{ backgroundColor: 'var(--bg-secondary)' }}
                                    >
                                        <div 
                                            className="h-full rounded transition-all duration-300"
                                            style={{ 
                                                width: getBarWidth(count, maxCategoryCount),
                                                backgroundColor: 'var(--flagged-text)'
                                            }} 
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div 
                            className="text-center py-8"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            No violations detected
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Analytics