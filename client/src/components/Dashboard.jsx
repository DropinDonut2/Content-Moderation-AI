import { useState, useEffect } from 'react'
import { getAnalyticsOverview, getAnalyticsTimeSeries, getAnalyticsCategories, getContentStats } from '../services/api'
import StatsCard from './StatsCard'
import VerdictPieChart from './charts/VerdictPieChart'
import VolumeLineChart from './charts/VolumeLineChart'
import CategoryBarChart from './charts/CategoryBarChart'
import { BarChart2, Calendar, Clock, AlertCircle, Activity, ShieldCheck, ShieldAlert, CheckCircle2 } from 'lucide-react'

function Dashboard() {
    const [overview, setOverview] = useState(null)
    const [timeSeries, setTimeSeries] = useState([])
    const [categories, setCategories] = useState([])
    const [contentStats, setContentStats] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const [overviewRes, timeSeriesRes, categoriesRes] = await Promise.all([
                getAnalyticsOverview(),
                getAnalyticsTimeSeries({ days: 30 }),
                getAnalyticsCategories()
            ])

            setOverview(overviewRes.data)
            setTimeSeries(timeSeriesRes.data)
            setCategories(categoriesRes.data)

            // Fetch content stats for real pending counts
            try {
                const statsRes = await getContentStats()
                setContentStats(statsRes.data)
            } catch (e) {
                console.log('Content stats not available')
            }
        } catch (error) {
            console.error('Failed to fetch analytics:', error)
        } finally {
            setLoading(false)
        }
    }

    // Calculate total pending from all content types
    const getTotalPending = () => {
        if (!contentStats) return overview?.pendingReviewCount || 0
        
        const charactersPending = contentStats.characters?.pending || 0
        const storylinesPending = contentStats.storylines?.pending || 0
        const personasPending = contentStats.personas?.pending || 0
        const logsPending = overview?.pendingReviewCount || 0
        
        return charactersPending + storylinesPending + personasPending + logsPending
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="spinner"></div>
            </div>
        )
    }

    const totalPending = getTotalPending()

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            {/* Header */}
            <div 
                className="flex justify-between items-end pb-6"
                style={{ borderBottom: '1px solid var(--border-color)' }}
            >
                <div>
                    <h2 
                        className="text-3xl font-bold mb-1 uppercase tracking-tighter"
                        style={{ color: 'var(--text-primary)' }}
                    >
                        Command Center
                    </h2>
                    <p className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                        // SYSTEM_STATUS: ONLINE
                    </p>
                </div>
                <div className="flex gap-2">
                    <span className="px-3 py-1 bg-green-500 text-black text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                        <Activity size={12} /> Live
                    </span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard
                    title="Total Processed"
                    value={overview?.totalModerated?.toLocaleString() || 0}
                    icon={<BarChart2 size={20} />}
                    subtitle="ALL TIME VOLUME"
                />
                <StatsCard
                    title="Today"
                    value={overview?.todayCount?.toLocaleString() || 0}
                    icon={<Calendar size={20} />}
                    subtitle={`${overview?.weekCount || 0} THIS WEEK`}
                />
                <StatsCard
                    title="Latency"
                    value={`${overview?.avgResponseTime || 0}ms`}
                    icon={<Clock size={20} />}
                    subtitle="AVG RESPONSE TIME"
                />
                <StatsCard
                    title="Activities"
                    value={totalPending}
                    icon={<AlertCircle size={20} />}
                    color={totalPending > 0 ? "warning" : "default"}
                    subtitle="PENDING REVIEW"
                />
            </div>

            {/* Pending Breakdown (only show if there's content stats) */}
            {contentStats && totalPending > 0 && (
                <div 
                    className="p-4"
                    style={{ 
                        backgroundColor: 'var(--flagged-bg)', 
                        border: '1px solid var(--flagged-border)' 
                    }}
                >
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                            <AlertCircle size={16} style={{ color: 'var(--flagged-text)' }} />
                            <span 
                                className="text-sm font-bold uppercase"
                                style={{ color: 'var(--flagged-text)' }}
                            >
                                Pending Review Breakdown
                            </span>
                        </div>
                        <div className="flex gap-6 text-sm font-mono">
                            {contentStats.characters?.pending > 0 && (
                                <span style={{ color: 'var(--text-primary)' }}>
                                    <strong>{contentStats.characters.pending}</strong> Characters
                                </span>
                            )}
                            {contentStats.storylines?.pending > 0 && (
                                <span style={{ color: 'var(--text-primary)' }}>
                                    <strong>{contentStats.storylines.pending}</strong> Storylines
                                </span>
                            )}
                            {contentStats.personas?.pending > 0 && (
                                <span style={{ color: 'var(--text-primary)' }}>
                                    <strong>{contentStats.personas.pending}</strong> Personas
                                </span>
                            )}
                            {(overview?.pendingReviewCount || 0) > 0 && (
                                <span style={{ color: 'var(--text-primary)' }}>
                                    <strong>{overview.pendingReviewCount}</strong> Logs
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Volume Chart */}
                <div 
                    className="lg:col-span-2 p-6"
                    style={{ 
                        backgroundColor: 'var(--bg-card)', 
                        border: '1px solid var(--border-color)' 
                    }}
                >
                    <div 
                        className="flex justify-between items-center mb-6 pb-4"
                        style={{ borderBottom: '1px solid var(--border-color)' }}
                    >
                        <h3 
                            className="text-sm font-bold uppercase tracking-wider"
                            style={{ color: 'var(--text-primary)' }}
                        >
                            Traffic Analysis
                        </h3>
                        <select 
                            className="text-xs font-mono px-2 py-1 outline-none uppercase"
                            style={{ 
                                backgroundColor: 'var(--bg-secondary)', 
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-primary)'
                            }}
                        >
                            <option>30 Days</option>
                            <option>7 Days</option>
                        </select>
                    </div>
                    <VolumeLineChart data={timeSeries} />
                </div>

                {/* Verdict Distribution */}
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
                        Verdict Ratio
                    </h3>
                    <div className="relative">
                        <VerdictPieChart data={overview?.verdictBreakdown || {}} />
                        {/* Center Text Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div 
                                className="text-center p-2"
                                style={{ 
                                    backgroundColor: 'var(--bg-card)', 
                                    border: '1px solid var(--border-color)' 
                                }}
                            >
                                <div 
                                    className="text-xl font-bold font-mono"
                                    style={{ color: 'var(--text-primary)' }}
                                >
                                    {overview?.totalModerated || 0}
                                </div>
                                <div 
                                    className="text-[10px] uppercase tracking-widest"
                                    style={{ color: 'var(--text-secondary)' }}
                                >
                                    Total
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="mt-6 space-y-2 text-xs">
                        <div 
                            className="flex items-center justify-between p-2"
                            style={{ 
                                backgroundColor: 'var(--bg-hover)', 
                                border: '1px solid var(--border-color)' 
                            }}
                        >
                            <div className="flex items-center gap-2" style={{ color: 'var(--safe-text)' }}>
                                <ShieldCheck size={12} />
                                <span className="uppercase">Safe</span>
                            </div>
                            <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
                                {overview?.verdictBreakdown?.safe || 0}
                            </span>
                        </div>
                        <div 
                            className="flex items-center justify-between p-2"
                            style={{ 
                                backgroundColor: 'var(--bg-hover)', 
                                border: '1px solid var(--border-color)' 
                            }}
                        >
                            <div className="flex items-center gap-2" style={{ color: 'var(--flagged-text)' }}>
                                <CheckCircle2 size={12} />
                                <span className="uppercase">Flagged</span>
                            </div>
                            <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
                                {overview?.verdictBreakdown?.flagged || 0}
                            </span>
                        </div>
                        <div 
                            className="flex items-center justify-between p-2"
                            style={{ 
                                backgroundColor: 'var(--bg-hover)', 
                                border: '1px solid var(--border-color)' 
                            }}
                        >
                            <div className="flex items-center gap-2" style={{ color: 'var(--rejected-text)' }}>
                                <ShieldAlert size={12} />
                                <span className="uppercase">Rejected</span>
                            </div>
                            <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
                                {overview?.verdictBreakdown?.rejected || 0}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Category Breakdown & Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div 
                    className="lg:col-span-2 p-6"
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
                    <CategoryBarChart data={categories} />
                </div>

                <div 
                    className="p-6 flex flex-col"
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
                        System Health
                    </h3>

                    <div className="space-y-4 flex-1">
                        {/* Avg Confidence */}
                        <div 
                            className="p-4"
                            style={{ 
                                backgroundColor: 'var(--bg-secondary)', 
                                border: '1px solid var(--border-color)' 
                            }}
                        >
                            <div className="flex justify-between items-center mb-2">
                                <span 
                                    className="text-xs uppercase font-bold"
                                    style={{ color: 'var(--text-secondary)' }}
                                >
                                    Avg Confidence
                                </span>
                                <span 
                                    className="font-mono font-bold"
                                    style={{ color: 'var(--text-primary)' }}
                                >
                                    {(overview?.avgConfidence * 100 || 0).toFixed(1)}%
                                </span>
                            </div>
                            <div 
                                className="w-full h-1"
                                style={{ backgroundColor: 'var(--border-color)' }}
                            >
                                <div
                                    className="h-full"
                                    style={{ 
                                        width: `${(overview?.avgConfidence * 100) || 0}%`,
                                        backgroundColor: 'var(--accent-primary)'
                                    }}
                                ></div>
                            </div>
                        </div>

                        {/* Safe Rate */}
                        <div 
                            className="p-4"
                            style={{ 
                                backgroundColor: 'var(--bg-secondary)', 
                                border: '1px solid var(--border-color)' 
                            }}
                        >
                            <div className="flex justify-between items-center mb-2">
                                <span 
                                    className="text-xs uppercase font-bold"
                                    style={{ color: 'var(--text-secondary)' }}
                                >
                                    Safe Rate
                                </span>
                                <span 
                                    className="font-mono font-bold"
                                    style={{ color: 'var(--safe-text)' }}
                                >
                                    {overview?.totalModerated > 0
                                        ? ((overview.verdictBreakdown.safe / overview.totalModerated) * 100).toFixed(1)
                                        : 0}%
                                </span>
                            </div>
                            <div 
                                className="w-full h-1"
                                style={{ backgroundColor: 'var(--border-color)' }}
                            >
                                <div
                                    className="h-full bg-green-500"
                                    style={{
                                        width: `${overview?.totalModerated > 0 ? (overview.verdictBreakdown.safe / overview.totalModerated) * 100 : 0}%`
                                    }}
                                ></div>
                            </div>
                        </div>

                        {/* Rejection Rate */}
                        <div 
                            className="p-4"
                            style={{ 
                                backgroundColor: 'var(--bg-secondary)', 
                                border: '1px solid var(--border-color)' 
                            }}
                        >
                            <div className="flex justify-between items-center mb-2">
                                <span 
                                    className="text-xs uppercase font-bold"
                                    style={{ color: 'var(--text-secondary)' }}
                                >
                                    Rejection Rate
                                </span>
                                <span 
                                    className="font-mono font-bold"
                                    style={{ color: 'var(--rejected-text)' }}
                                >
                                    {overview?.totalModerated > 0
                                        ? ((overview.verdictBreakdown.rejected / overview.totalModerated) * 100).toFixed(1)
                                        : 0}%
                                </span>
                            </div>
                            <div 
                                className="w-full h-1"
                                style={{ backgroundColor: 'var(--border-color)' }}
                            >
                                <div
                                    className="h-full bg-red-500"
                                    style={{
                                        width: `${overview?.totalModerated > 0 ? (overview.verdictBreakdown.rejected / overview.totalModerated) * 100 : 0}%`
                                    }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Dashboard