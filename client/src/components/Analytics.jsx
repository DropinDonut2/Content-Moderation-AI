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

            const byVerdict = logs.reduce((acc, log) => {
                acc[log.verdict] = (acc[log.verdict] || 0) + 1
                return acc
            }, {})

            const byCategory = logs.reduce((acc, log) => {
                if (log.category) acc[log.category] = (acc[log.category] || 0) + 1
                return acc
            }, {})

            const avgConfidence = logs.length > 0
                ? logs.reduce((sum, log) => sum + log.confidence, 0) / logs.length
                : 0

            setStats({ byVerdict, byCategory, total: logs.length, avgConfidence })
        } catch (error) {
            console.error('Failed to fetch analytics:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-10 h-10 border-4 border-accent-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        )
    }

    const maxVerdictCount = Math.max(...Object.values(stats.byVerdict), 1)
    const maxCategoryCount = Math.max(...Object.values(stats.byCategory), 1)

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold text-white mb-2">Detailed Analytics</h2>
                    <p className="text-text-secondary">Deep dive into moderation statistics</p>
                </div>
            </div>

            {/* Top Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="card-premium p-6 flex flex-col items-center justify-center text-center">
                    <div className="text-text-secondary text-xs uppercase font-bold tracking-wider mb-2">Total Processed</div>
                    <div className="text-4xl font-bold text-white">{stats.total}</div>
                </div>
                <div className="card-premium p-6 flex flex-col items-center justify-center text-center">
                    <div className="text-text-secondary text-xs uppercase font-bold tracking-wider mb-2">Avg Confidence</div>
                    <div className="text-4xl font-bold text-accent-primary">{(stats.avgConfidence * 100).toFixed(1)}%</div>
                </div>
                <div className="card-premium p-6 flex flex-col items-center justify-center text-center border-green-500/20 bg-green-500/5">
                    <div className="text-green-400/80 text-xs uppercase font-bold tracking-wider mb-2">Safe Rate</div>
                    <div className="text-4xl font-bold text-green-400">
                        {stats.total > 0 ? ((stats.byVerdict.safe || 0) / stats.total * 100).toFixed(1) : 0}%
                    </div>
                </div>
                <div className="card-premium p-6 flex flex-col items-center justify-center text-center border-red-500/20 bg-red-500/5">
                    <div className="text-red-400/80 text-xs uppercase font-bold tracking-wider mb-2">Rejection Rate</div>
                    <div className="text-4xl font-bold text-red-400">
                        {stats.total > 0 ? ((stats.byVerdict.rejected || 0) / stats.total * 100).toFixed(1) : 0}%
                    </div>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Verdicts */}
                <div className="card-premium p-6">
                    <h3 className="text-lg font-bold text-white mb-6">Verdict Distribution</h3>
                    <div className="space-y-4">
                        {Object.entries(stats.byVerdict).map(([verdict, count]) => (
                            <div key={verdict}>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-text-primary capitalize font-medium">{verdict}</span>
                                    <span className="text-text-secondary">{count} ({((count / stats.total) * 100).toFixed(1)}%)</span>
                                </div>
                                <div className="h-2 bg-bg-secondary rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${verdict === 'safe' ? 'bg-green-500' :
                                                verdict === 'flagged' ? 'bg-amber-500' : 'bg-red-500'
                                            }`}
                                        style={{ width: `${(count / maxVerdictCount) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                        {Object.keys(stats.byVerdict).length === 0 && (
                            <div className="text-center text-text-secondary py-10">No data available</div>
                        )}
                    </div>
                </div>

                {/* Categories */}
                <div className="card-premium p-6">
                    <h3 className="text-lg font-bold text-white mb-6">Top Violations</h3>
                    <div className="space-y-4">
                        {Object.entries(stats.byCategory).map(([category, count]) => (
                            <div key={category}>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-text-primary capitalize font-medium">{category.replace('_', ' ')}</span>
                                    <span className="text-text-secondary">{count}</span>
                                </div>
                                <div className="h-2 bg-bg-secondary rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-accent-primary rounded-full transition-all duration-500"
                                        style={{ width: `${(count / maxCategoryCount) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                        {Object.keys(stats.byCategory).length === 0 && (
                            <div className="text-center text-text-secondary py-10">No violations detected</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Analytics
