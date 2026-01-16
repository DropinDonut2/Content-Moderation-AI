import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import ContentList from '../components/moderate/ContentList'
import ContentDetailModal from '../components/moderate/ContentDetailModal'
import { getCharacters, getStorylines, getPersonas, getContentStats } from '../services/api'

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
        { id: 'characters', label: 'Characters', icon: '👤' },
        { id: 'storylines', label: 'Storylines', icon: '📖' },
        { id: 'personas', label: 'Personas', icon: '🎭' }
    ]

    // Socket.io connection
    useEffect(() => {
        const socket = io('http://localhost:5000')

        socket.on('connect', () => {
            console.log('🔌 Connected to server')
        })

        // Listen for new content
        socket.on('newContent', (data) => {
            console.log('📥 New content received:', data)
            fetchContent()
            fetchStats()
        })

        // Listen for content updates
        socket.on('contentUpdated', (data) => {
            console.log('🔄 Content updated:', data)
            fetchContent()
            fetchStats()
        })

        // Listen for reviews
        socket.on('contentReviewed', (data) => {
            console.log('✅ Content reviewed:', data)
            fetchContent()
            fetchStats()
        })

        return () => {
            socket.disconnect()
        }
    }, [activeTab, filters])

    // Fetch content when tab, filters, or page changes
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
                case 'characters':
                    response = await getCharacters(params)
                    break
                case 'storylines':
                    response = await getStorylines(params)
                    break
                case 'personas':
                    response = await getPersonas(params)
                    break
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

    const handleItemClick = (item) => {
        setSelectedItem(item)
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
        <div className="moderate-page">
            <div className="page-header">
                <h2>Content Moderation</h2>
                <p>Review and moderate characters, storylines, and personas</p>
            </div>

            {/* Stats Overview */}
            {stats && (
                <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
                    <div className="stat-card">
                        <div className="label">Characters Pending</div>
                        <div className="value" style={{ color: 'var(--warning)' }}>
                            {stats.characters?.pending || 0}
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="label">Storylines Pending</div>
                        <div className="value" style={{ color: 'var(--warning)' }}>
                            {stats.storylines?.pending || 0}
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="label">Personas Pending</div>
                        <div className="value" style={{ color: 'var(--warning)' }}>
                            {stats.personas?.pending || 0}
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="label">Total Pending</div>
                        <div className="value" style={{ color: 'var(--danger)' }}>
                            {(stats.characters?.pending || 0) + 
                             (stats.storylines?.pending || 0) + 
                             (stats.personas?.pending || 0)}
                        </div>
                    </div>
                </div>
            )}

            {/* Content Type Tabs */}
            <div className="content-tabs">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => handleTabChange(tab.id)}
                    >
                        <span className="tab-icon">{tab.icon}</span>
                        <span className="tab-label">{tab.label}</span>
                        {stats && (
                            <span className="tab-badge">
                                {getTabStats(tab.id).pending}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Filters */}
            <div className="filters-bar">
                <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                    <option value="pending">⏳ Pending</option>
                    <option value="flagged">⚠️ Flagged</option>
                    <option value="approved">✅ Approved</option>
                    <option value="rejected">❌ Rejected</option>
                    <option value="all">All Status</option>
                </select>

                <select
                    value={filters.nsfw}
                    onChange={(e) => handleFilterChange('nsfw', e.target.value)}
                >
                    <option value="">All Content</option>
                    <option value="false">SFW Only</option>
                    <option value="true">NSFW Only</option>
                </select>

                <span className="results-count">
                    {pagination.total} results
                </span>
            </div>

            {/* Content List */}
            <ContentList
                type={activeTab}
                items={content}
                loading={loading}
                onItemClick={handleItemClick}
            />

            {/* Pagination */}
            {pagination.pages > 1 && (
                <div className="pagination">
                    <button
                        className="btn btn-secondary"
                        disabled={pagination.page <= 1}
                        onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                    >
                        ← Previous
                    </button>
                    <span>Page {pagination.page} of {pagination.pages}</span>
                    <button
                        className="btn btn-secondary"
                        disabled={pagination.page >= pagination.pages}
                        onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                    >
                        Next →
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

            <style>{`
                .content-tabs {
                    display: flex;
                    gap: 0.5rem;
                    margin-bottom: 1.5rem;
                    border-bottom: 1px solid var(--border-color);
                    padding-bottom: 1rem;
                }

                .tab-btn {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.75rem 1.25rem;
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius);
                    color: var(--text-secondary);
                    cursor: pointer;
                    transition: var(--transition);
                }

                .tab-btn:hover {
                    border-color: var(--accent-primary);
                    color: var(--text-primary);
                }

                .tab-btn.active {
                    background: var(--accent-gradient);
                    border-color: transparent;
                    color: white;
                }

                .tab-icon {
                    font-size: 1.25rem;
                }

                .tab-badge {
                    background: rgba(255,255,255,0.2);
                    padding: 0.125rem 0.5rem;
                    border-radius: 9999px;
                    font-size: 0.75rem;
                    font-weight: 600;
                }

                .tab-btn:not(.active) .tab-badge {
                    background: var(--warning);
                    color: black;
                }

                .filters-bar {
                    display: flex;
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                    align-items: center;
                }

                .filters-bar select {
                    padding: 0.625rem 1rem;
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius);
                    color: var(--text-primary);
                    cursor: pointer;
                }

                .results-count {
                    margin-left: auto;
                    color: var(--text-secondary);
                    font-size: 0.875rem;
                }

                .pagination {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 1rem;
                    margin-top: 2rem;
                }
            `}</style>
        </div>
    )
}

export default Moderate