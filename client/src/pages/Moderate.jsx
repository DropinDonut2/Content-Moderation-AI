import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import ContentList from '../components/moderate/ContentList'
import ContentDetailModal from '../components/moderate/ContentDetailModal'
import { getCharacters, getStorylines, getPersonas, getContentStats } from '../services/api'
import { User, BookOpen, Drama, AlertTriangle, CheckCircle2, XCircle, Clock, Filter, Archive } from 'lucide-react'

function Moderate() {
    const [activeTab, setActiveTab] = useState('characters')
    const [content, setContent] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedItem, setSelectedItem] = useState(null)
    const [stats, setStats] = useState(null)
    const [filters, setFilters] = useState({
        status: 'pending',
        nsfw: ''
    })
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        pages: 0
    })

    const tabs = [
        { id: 'characters', label: 'Characters', icon: <User size={16} /> },
        { id: 'storylines', label: 'Storylines', icon: <BookOpen size={16} /> },
        { id: 'personas', label: 'Personas', icon: <Drama size={16} /> }
    ]

    // Socket.io connection logic remains same...
    useEffect(() => {
        const socket = io('http://localhost:5001') // Updated port to 5001

        socket.on('connect', () => {
            console.log('🔌 Connected to server')
        })

        // Listen for new content
        socket.on('newContent', (data) => {
            console.log('📥 New content received:', data)
            fetchContent()
            fetchStats()
        })

        socket.on('contentUpdated', () => { fetchContent(); fetchStats() })
        socket.on('contentReviewed', () => { fetchContent(); fetchStats() })

        return () => {
            socket.disconnect()
        }
    }, [activeTab, filters])

    useEffect(() => {
        fetchContent()
        fetchStats()
    }, [activeTab, filters, pagination.page])

    const fetchContent = async () => {
        setLoading(true)
        try {
            const params = {
                page: pagination.page,
                limit: pagination.limit,
                ...(filters.status && filters.status !== 'all' && { status: filters.status }),
                ...(filters.nsfw && { nsfw: filters.nsfw })
            }

            let response
            switch (activeTab) {
                case 'characters': response = await getCharacters(params); break
                case 'storylines': response = await getStorylines(params); break
                case 'personas': response = await getPersonas(params); break
            }

            setContent(response.data)
            setPagination(prev => ({
                ...prev,
                total: response.pagination.total,
                pages: response.pagination.pages
            }))
        } catch (error) {
            console.error('Failed to fetch content:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchStats = async () => {
        try {
            const response = await getContentStats()
            setStats(response.data)
        } catch (error) {
            console.error('Failed to fetch stats:', error)
        }
    }

    const handleTabChange = (tabId) => {
        setActiveTab(tabId)
        setPagination(prev => ({ ...prev, page: 1 }))
        setSelectedItem(null)
    }

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }))
        setPagination(prev => ({ ...prev, page: 1 }))
    }

    const handleReviewComplete = () => {
        setSelectedItem(null)
        fetchContent()
        fetchStats()
    }

    const getTabStats = (tabId) => {
        if (!stats) return { pending: 0, total: 0 }
        return stats[tabId] || { pending: 0, total: 0 }
    }

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            {/* Header */}
            <div className="flex justify-between items-end border-b border-white/10 pb-6">
                <div>
                    <h2 className="text-3xl font-bold text-white mb-2 uppercase tracking-tighter">Content Moderation</h2>
                    <p className="text-text-secondary font-mono text-xs">// REVIEW_AND_MODERATE_ENTITIES</p>
                </div>
            </div>

            {/* Stats Overview */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="card-premium p-4">
                        <div className="text-[10px] uppercase text-text-secondary font-bold tracking-widest mb-1">Characters Pending</div>
                        <div className="text-2xl font-bold text-amber-500 font-mono">
                            {stats.characters?.pending || 0}
                        </div>
                    </div>
                    <div className="card-premium p-4">
                        <div className="text-[10px] uppercase text-text-secondary font-bold tracking-widest mb-1">Storylines Pending</div>
                        <div className="text-2xl font-bold text-amber-500 font-mono">
                            {stats.storylines?.pending || 0}
                        </div>
                    </div>
                    <div className="card-premium p-4">
                        <div className="text-[10px] uppercase text-text-secondary font-bold tracking-widest mb-1">Personas Pending</div>
                        <div className="text-2xl font-bold text-amber-500 font-mono">
                            {stats.personas?.pending || 0}
                        </div>
                    </div>
                    <div className="card-premium p-4 border-red-500/20 bg-red-500/5">
                        <div className="text-[10px] uppercase text-red-400 font-bold tracking-widest mb-1">Total Impact</div>
                        <div className="text-2xl font-bold text-red-500 font-mono">
                            {(stats.characters?.pending || 0) +
                                (stats.storylines?.pending || 0) +
                                (stats.personas?.pending || 0)}
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs & Filters */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Tabs */}
                <div className="flex gap-2 p-1 bg-zinc-900/50 border border-white/10 rounded-lg">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`
                                flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all uppercase tracking-wider
                                ${activeTab === tab.id
                                    ? 'bg-white text-black shadow-sm'
                                    : 'text-text-secondary hover:text-white hover:bg-white/5'
                                }
                            `}
                            onClick={() => handleTabChange(tab.id)}
                        >
                            {tab.icon}
                            {tab.label}
                            {stats && getTabStats(tab.id).pending > 0 && (
                                <span className={`
                                    ml-1 px-1.5 py-0.5 rounded text-[10px] font-mono
                                    ${activeTab === tab.id ? 'bg-black text-white' : 'bg-amber-500 text-black'}
                                `}>
                                    {getTabStats(tab.id).pending}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Filters */}
                <div className="flex gap-4">
                    <div className="relative group">
                        <select
                            value={filters.status}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                            className="input-premium appearance-none pl-10 pr-8 py-2 text-xs uppercase"
                        >
                            <option value="pending">Pending</option>
                            <option value="flagged">Flagged</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="all">All Status</option>
                        </select>
                        <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                    </div>

                    <div className="relative group">
                        <select
                            value={filters.nsfw}
                            onChange={(e) => handleFilterChange('nsfw', e.target.value)}
                            className="input-premium appearance-none pl-10 pr-8 py-2 text-xs uppercase"
                        >
                            <option value="">All Content</option>
                            <option value="false">SFW Only</option>
                            <option value="true">NSFW Only</option>
                        </select>
                        <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                    </div>
                </div>
            </div>

            {/* Content List */}
            <ContentList
                type={activeTab}
                items={content}
                loading={loading}
                onItemClick={(item) => setSelectedItem(item)}
            />

            {/* Pagination */}
            {pagination.pages > 1 && (
                <div className="flex justify-center items-center gap-4 pt-6 border-t border-white/10">
                    <button
                        className="px-4 py-2 text-xs font-bold uppercase tracking-widest border border-white/10 hover:bg-white hover:text-black transition-colors disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-white"
                        disabled={pagination.page <= 1}
                        onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                    >
                        Previous
                    </button>
                    <span className="text-xs font-mono text-text-secondary">
                        PAGE {pagination.page} / {pagination.pages}
                    </span>
                    <button
                        className="px-4 py-2 text-xs font-bold uppercase tracking-widest border border-white/10 hover:bg-white hover:text-black transition-colors disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-white"
                        disabled={pagination.page >= pagination.pages}
                        onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                    >
                        Next
                    </button>
                </div>
            )}

            {/* Detail Modal */}
            {selectedItem && (
                <ContentDetailModal
                    type={activeTab}
                    item={selectedItem}
                    onClose={() => setSelectedItem(null)}
                    onReviewComplete={handleReviewComplete}
                />
            )}
        </div>
    )
}

export default Moderate