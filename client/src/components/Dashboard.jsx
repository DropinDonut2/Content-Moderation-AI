import { useState, useEffect } from 'react'
import { getAnalyticsOverview, getAnalyticsTimeSeries, getAnalyticsCategories } from '../services/api'
import StatsCard from './StatsCard'
import VerdictPieChart from './charts/VerdictPieChart'
import VolumeLineChart from './charts/VolumeLineChart'
import CategoryBarChart from './charts/CategoryBarChart'
import { BarChart2, Calendar, Clock, AlertCircle, Activity, ShieldCheck, ShieldAlert, CheckCircle2 } from 'lucide-react'

function Dashboard() {
    const [overview, setOverview] = useState(null)
    const [timeSeries, setTimeSeries] = useState([])
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const [overviewRes, timeSeriesRes, categoriesRes] = await Promise.all([
                getAnalyticsOverview(),
                getAnalyticsTimeSeries(30),
                getAnalyticsCategories()
            ])

            setOverview(overviewRes.data)
            setTimeSeries(timeSeriesRes.data)
            setCategories(categoriesRes.data)
        } catch (error) {
            console.error('Failed to fetch analytics:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-8 h-8 border-2 border-white border-t-transparent animate-spin"></div>
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            <div className="flex justify-between items-end border-b border-white/10 pb-6">
                <div>
                    <h2 className="text-3xl font-bold text-white mb-1 uppercase tracking-tighter">Command Center</h2>
                    <p className="text-text-secondary font-mono text-xs">// SYSTEM_STATUS: ONLINE</p>
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
                    title="Review Queue"
                    value={overview?.pendingReviewCount || 0}
                    icon={<AlertCircle size={20} />}
                    color={overview?.pendingReviewCount > 0 ? "warning" : "default"}
                    subtitle="PENDING ACTIONS"
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Volume Chart */}
                <div className="lg:col-span-2 card-premium p-6">
                    <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Traffic Analysis</h3>
                        <select className="bg-black border border-white/20 text-white text-xs font-mono px-2 py-1 outline-none uppercase">
                            <option>30 Days</option>
                            <option>7 Days</option>
                        </select>
                    </div>
                    <VolumeLineChart data={timeSeries} />
                </div>

                {/* Verdict Distribution */}
                <div className="card-premium p-6">
                    <h3 className="text-sm font-bold text-white mb-6 border-b border-white/10 pb-4 uppercase tracking-wider">Verdict Ratio</h3>
                    <div className="relative">
                        <VerdictPieChart data={overview?.verdictBreakdown || {}} />
                        {/* Center Text Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center bg-black p-2 border border-white/10">
                                <div className="text-xl font-bold text-white font-mono">{overview?.totalModerated || 0}</div>
                                <div className="text-[10px] text-text-secondary uppercase tracking-widest">Total</div>
                            </div>
                        </div>
                    </div>

                    {/* Custom Legend */}
                    <div className="mt-6 space-y-3 font-mono text-xs">
                        <div className="flex justify-between items-center bg-white/5 p-2 border border-white/5">
                            <div className="flex items-center gap-2 text-green-400">
                                <CheckCircle2 size={12} />
                                <span className="uppercase">Safe</span>
                            </div>
                            <span className="font-bold text-white">{overview?.verdictBreakdown?.safe || 0}</span>
                        </div>
                        <div className="flex justify-between items-center bg-white/5 p-2 border border-white/5">
                            <div className="flex items-center gap-2 text-amber-400">
                                <AlertCircle size={12} />
                                <span className="uppercase">Flagged</span>
                            </div>
                            <span className="font-bold text-white">{overview?.verdictBreakdown?.flagged || 0}</span>
                        </div>
                        <div className="flex justify-between items-center bg-white/5 p-2 border border-white/5">
                            <div className="flex items-center gap-2 text-red-500">
                                <ShieldAlert size={12} />
                                <span className="uppercase">Rejected</span>
                            </div>
                            <span className="font-bold text-white">{overview?.verdictBreakdown?.rejected || 0}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Category Breakdown & Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 card-premium p-6">
                    <h3 className="text-sm font-bold text-white mb-6 border-b border-white/10 pb-4 uppercase tracking-wider">Violation Categories</h3>
                    <CategoryBarChart data={categories} />
                </div>

                <div className="card-premium p-6 flex flex-col">
                    <h3 className="text-sm font-bold text-white mb-6 border-b border-white/10 pb-4 uppercase tracking-wider">System Health</h3>

                    <div className="space-y-4 flex-1">
                        <div className="p-4 bg-black border border-white/10">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-text-secondary uppercase font-bold">Avg Confidence</span>
                                <span className="text-white font-mono font-bold">{(overview?.avgConfidence * 100 || 0).toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-white/10 h-1">
                                <div
                                    className="h-full bg-white"
                                    style={{ width: `${(overview?.avgConfidence * 100) || 0}%` }}
                                ></div>
                            </div>
                        </div>

                        <div className="p-4 bg-black border border-white/10">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-text-secondary uppercase font-bold">Safe Rate</span>
                                <span className="text-green-400 font-mono font-bold">
                                    {overview?.totalModerated > 0
                                        ? ((overview.verdictBreakdown.safe / overview.totalModerated) * 100).toFixed(1)
                                        : 0}%
                                </span>
                            </div>
                            <div className="w-full bg-white/10 h-1">
                                <div
                                    className="h-full bg-green-500"
                                    style={{
                                        width: `${overview?.totalModerated > 0 ? (overview.verdictBreakdown.safe / overview.totalModerated) * 100 : 0}%`
                                    }}
                                ></div>
                            </div>
                        </div>

                        <div className="p-4 bg-black border border-white/10">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-text-secondary uppercase font-bold">Rejection Rate</span>
                                <span className="text-red-500 font-mono font-bold">
                                    {overview?.totalModerated > 0
                                        ? ((overview.verdictBreakdown.rejected / overview.totalModerated) * 100).toFixed(1)
                                        : 0}%
                                </span>
                            </div>
                            <div className="w-full bg-white/10 h-1">
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
