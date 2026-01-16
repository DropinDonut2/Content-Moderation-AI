import { useState, useEffect } from 'react'
import { getLogs, reviewLog, getCharacters, getStorylines, getPersonas, reviewCharacter, reviewStoryline, reviewPersona } from '../services/api'
import { 
    Inbox, User, BookOpen, Drama, FileText, Clock, Filter,
    CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp,
    Activity, Bot
} from 'lucide-react'

function Activities() {
    const [activities, setActivities] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('pending')
    const [typeFilter, setTypeFilter] = useState('all')
    const [expandedId, setExpandedId] = useState(null)

    useEffect(() => {
        fetchAllActivities()
    }, [filter, typeFilter])

    const fetchAllActivities = async () => {
        setLoading(true)
        try {
            const allItems = []

            // Fetch based on type filter
            const shouldFetchContent = typeFilter === 'all' || typeFilter === 'content'
            const shouldFetchLogs = typeFilter === 'all' || typeFilter === 'logs'

            if (shouldFetchContent) {
                // Fetch Characters
                try {
                    const charRes = await getCharacters({ 
                        status: filter === 'all' ? undefined : filter,
                        limit: 50 
                    })
                    charRes.data?.forEach(item => {
                        allItems.push({
                            ...item,
                            _activityType: 'character',
                            _activityId: item.characterId || item._id,
                            _activityName: item.name,
                            _activityStatus: item.moderationStatus,
                            _activityDate: item.updatedAt || item.createdAt,
                            _activityUser: item.user
                        })
                    })
                } catch (e) { console.log('Characters fetch skipped') }

                // Fetch Storylines
                try {
                    const storyRes = await getStorylines({ 
                        status: filter === 'all' ? undefined : filter,
                        limit: 50 
                    })
                    storyRes.data?.forEach(item => {
                        allItems.push({
                            ...item,
                            _activityType: 'storyline',
                            _activityId: item.storylineId || item._id,
                            _activityName: item.title,
                            _activityStatus: item.moderationStatus,
                            _activityDate: item.updatedAt || item.createdAt,
                            _activityUser: item.user
                        })
                    })
                } catch (e) { console.log('Storylines fetch skipped') }

                // Fetch Personas
                try {
                    const personaRes = await getPersonas({ 
                        status: filter === 'all' ? undefined : filter,
                        limit: 50 
                    })
                    personaRes.data?.forEach(item => {
                        allItems.push({
                            ...item,
                            _activityType: 'persona',
                            _activityId: item.personaId || item._id,
                            _activityName: item.name,
                            _activityStatus: item.moderationStatus,
                            _activityDate: item.updatedAt || item.createdAt,
                            _activityUser: item.user
                        })
                    })
                } catch (e) { console.log('Personas fetch skipped') }
            }

            if (shouldFetchLogs) {
                // Fetch Moderation Logs
                try {
                    const logsRes = await getLogs({ 
                        reviewStatus: filter === 'all' ? undefined : filter,
                        limit: 50 
                    })
                    logsRes.data?.forEach(item => {
                        allItems.push({
                            ...item,
                            _activityType: 'log',
                            _activityId: item._id,
                            _activityName: item.contentId,
                            _activityStatus: item.reviewStatus,
                            _activityDate: item.createdAt,
                            _activityUser: 'System'
                        })
                    })
                } catch (e) { console.log('Logs fetch skipped') }
            }

            // Sort by date (newest first)
            allItems.sort((a, b) => new Date(b._activityDate) - new Date(a._activityDate))

            setActivities(allItems)
        } catch (error) {
            console.error('Failed to fetch activities:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleReview = async (item, action) => {
        try {
            if (item._activityType === 'log') {
                await reviewLog(item._id, { reviewStatus: action, reviewedBy: 'admin' })
            } else if (item._activityType === 'character') {
                await reviewCharacter(item._activityId, { status: action, reviewedBy: 'admin' })
            } else if (item._activityType === 'storyline') {
                await reviewStoryline(item._activityId, { status: action, reviewedBy: 'admin' })
            } else if (item._activityType === 'persona') {
                await reviewPersona(item._activityId, { status: action, reviewedBy: 'admin' })
            }
            
            // Remove from list or update status
            if (filter === 'pending') {
                setActivities(prev => prev.filter(a => a._activityId !== item._activityId))
            } else {
                setActivities(prev => prev.map(a => 
                    a._activityId === item._activityId 
                        ? { ...a, _activityStatus: action }
                        : a
                ))
            }
        } catch (error) {
            console.error('Review failed:', error)
            alert('Review failed')
        }
    }

    const getTypeIcon = (type) => {
        switch (type) {
            case 'character': return <User size={14} />
            case 'storyline': return <BookOpen size={14} />
            case 'persona': return <Drama size={14} />
            case 'log': return <FileText size={14} />
            default: return <Activity size={14} />
        }
    }

    const getStatusStyle = (status) => {
        switch (status) {
            case 'approved': return { bg: 'var(--safe-bg)', color: 'var(--safe-text)', border: 'var(--safe-border)' }
            case 'rejected': return { bg: 'var(--rejected-bg)', color: 'var(--rejected-text)', border: 'var(--rejected-border)' }
            case 'flagged': return { bg: 'var(--flagged-bg)', color: 'var(--flagged-text)', border: 'var(--flagged-border)' }
            default: return { bg: 'var(--flagged-bg)', color: 'var(--flagged-text)', border: 'var(--flagged-border)' }
        }
    }

    const statusTabs = [
        { id: 'pending', label: 'Pending' },
        { id: 'all', label: 'All' },
        { id: 'approved', label: 'Approved' },
        { id: 'rejected', label: 'Rejected' }
    ]

    const typeTabs = [
        { id: 'all', label: 'All Types' },
        { id: 'content', label: 'Content Only' },
        { id: 'logs', label: 'Logs Only' }
    ]

    const pendingCount = activities.filter(a => 
        a._activityStatus === 'pending' || a._activityStatus === 'flagged'
    ).length

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
                        Activities
                    </h2>
                    <p className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                        // UNIFIED_MODERATION_FEED
                    </p>
                </div>
                {filter === 'pending' && (
                    <div 
                        className="px-4 py-2 font-mono text-sm font-bold"
                        style={{ 
                            backgroundColor: pendingCount > 0 ? 'var(--flagged-bg)' : 'var(--safe-bg)',
                            color: pendingCount > 0 ? 'var(--flagged-text)' : 'var(--safe-text)',
                            border: `1px solid ${pendingCount > 0 ? 'var(--flagged-border)' : 'var(--safe-border)'}`
                        }}
                    >
                        {pendingCount} PENDING
                    </div>
                )}
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Status Tabs */}
                <div 
                    className="flex flex-wrap gap-2 p-1 rounded-lg"
                    style={{ 
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)'
                    }}
                >
                    {statusTabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setFilter(tab.id)}
                            className="px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all rounded-md"
                            style={{
                                backgroundColor: filter === tab.id ? 'var(--accent-primary)' : 'transparent',
                                color: filter === tab.id ? 'var(--bg-primary)' : 'var(--text-secondary)'
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Type Filter */}
                <div className="flex gap-2">
                    {typeTabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setTypeFilter(tab.id)}
                            className="px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all"
                            style={{
                                backgroundColor: typeFilter === tab.id ? 'var(--bg-secondary)' : 'transparent',
                                color: typeFilter === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                                border: `1px solid ${typeFilter === tab.id ? 'var(--border-hover)' : 'var(--border-color)'}`
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Activity List */}
            {loading ? (
                <div 
                    className="flex items-center justify-center py-20"
                    style={{ border: '1px dashed var(--border-color)' }}
                >
                    <div className="spinner"></div>
                </div>
            ) : activities.length === 0 ? (
                <div 
                    className="flex flex-col items-center justify-center py-20"
                    style={{ 
                        border: '1px dashed var(--border-color)',
                        backgroundColor: 'var(--bg-hover)'
                    }}
                >
                    <Inbox size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                    <p 
                        className="font-bold uppercase tracking-widest"
                        style={{ color: 'var(--text-primary)' }}
                    >
                        No Activities Found
                    </p>
                    <p 
                        className="text-xs font-mono mt-2"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        No items match the current filters.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {activities.map(item => {
                        const statusStyle = getStatusStyle(item._activityStatus)
                        const isExpanded = expandedId === item._activityId
                        const isPending = item._activityStatus === 'pending' || item._activityStatus === 'flagged'

                        return (
                            <div
                                key={`${item._activityType}-${item._activityId}`}
                                className="transition-all"
                                style={{ 
                                    backgroundColor: 'var(--bg-card)',
                                    border: '1px solid var(--border-color)'
                                }}
                            >
                                {/* Main Row */}
                                <div 
                                    className="p-4 flex items-center gap-4 cursor-pointer"
                                    onClick={() => setExpandedId(isExpanded ? null : item._activityId)}
                                >
                                    {/* Type Icon */}
                                    <div 
                                        className="w-10 h-10 flex items-center justify-center rounded"
                                        style={{ 
                                            backgroundColor: 'var(--bg-secondary)',
                                            color: 'var(--text-secondary)'
                                        }}
                                    >
                                        {getTypeIcon(item._activityType)}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span 
                                                className="font-bold truncate"
                                                style={{ color: 'var(--text-primary)' }}
                                            >
                                                {item._activityName}
                                            </span>
                                            <span 
                                                className="text-[10px] uppercase px-2 py-0.5 rounded"
                                                style={{ 
                                                    backgroundColor: 'var(--bg-hover)',
                                                    color: 'var(--text-secondary)'
                                                }}
                                            >
                                                {item._activityType}
                                            </span>
                                        </div>
                                        <div 
                                            className="text-xs font-mono"
                                            style={{ color: 'var(--text-secondary)' }}
                                        >
                                            by {item._activityUser} • {new Date(item._activityDate).toLocaleString()}
                                        </div>
                                    </div>

                                    {/* Status */}
                                    <span 
                                        className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full"
                                        style={{ 
                                            backgroundColor: statusStyle.bg,
                                            color: statusStyle.color,
                                            border: `1px solid ${statusStyle.border}`
                                        }}
                                    >
                                        {item._activityStatus}
                                    </span>

                                    {/* Expand Icon */}
                                    <div style={{ color: 'var(--text-secondary)' }}>
                                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </div>
                                </div>

                                {/* Expanded Content */}
                                {isExpanded && (
                                    <div 
                                        className="px-4 pb-4 pt-2 space-y-4"
                                        style={{ borderTop: '1px solid var(--border-color)' }}
                                    >
                                        {/* Content Preview */}
                                        {(item.content || item.description || item.firstMessage) && (
                                            <div 
                                                className="p-3 rounded text-sm font-mono leading-relaxed max-h-40 overflow-y-auto"
                                                style={{ 
                                                    backgroundColor: 'var(--bg-secondary)',
                                                    color: 'var(--text-primary)',
                                                    border: '1px solid var(--border-color)'
                                                }}
                                            >
                                                {item.content || item.description || item.firstMessage}
                                            </div>
                                        )}

                                        {/* AI Info for Logs */}
                                        {item._activityType === 'log' && item.reasoning && (
                                            <div 
                                                className="flex items-start gap-2 p-3 rounded"
                                                style={{ 
                                                    backgroundColor: 'var(--bg-secondary)',
                                                    border: '1px solid var(--border-color)'
                                                }}
                                            >
                                                <Bot size={16} style={{ color: 'var(--text-secondary)', marginTop: '2px' }} />
                                                <div>
                                                    <span 
                                                        className="text-xs font-bold uppercase"
                                                        style={{ color: 'var(--text-secondary)' }}
                                                    >
                                                        AI Reasoning
                                                    </span>
                                                    <p 
                                                        className="text-sm mt-1"
                                                        style={{ color: 'var(--text-primary)' }}
                                                    >
                                                        {item.reasoning}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Moderation Result for Content */}
                                        {item.moderationResult?.aiSummary && (
                                            <div 
                                                className="flex items-start gap-2 p-3 rounded"
                                                style={{ 
                                                    backgroundColor: 'var(--bg-secondary)',
                                                    border: '1px solid var(--border-color)'
                                                }}
                                            >
                                                <Bot size={16} style={{ color: 'var(--text-secondary)', marginTop: '2px' }} />
                                                <div>
                                                    <span 
                                                        className="text-xs font-bold uppercase"
                                                        style={{ color: 'var(--text-secondary)' }}
                                                    >
                                                        AI Summary
                                                    </span>
                                                    <p 
                                                        className="text-sm mt-1"
                                                        style={{ color: 'var(--text-primary)' }}
                                                    >
                                                        {item.moderationResult.aiSummary}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Action Buttons */}
                                        {isPending && (
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleReview(item, 'approved') }}
                                                    className="action-approve flex-1 py-2"
                                                >
                                                    <CheckCircle2 size={14} className="inline mr-2" />
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleReview(item, 'rejected') }}
                                                    className="action-reject flex-1 py-2"
                                                >
                                                    <XCircle size={14} className="inline mr-2" />
                                                    Reject
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleReview(item, 'ignored') }}
                                                    className="action-skip px-4 py-2"
                                                >
                                                    Skip
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export default Activities