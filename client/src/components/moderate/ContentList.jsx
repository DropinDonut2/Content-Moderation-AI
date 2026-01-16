import { Archive, Bot } from 'lucide-react'

function ContentList({ type, items, loading, onItemClick }) {
    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="spinner"></div>
            </div>
        )
    }

    if (!items || items.length === 0) {
        return (
            <div 
                className="p-12 flex flex-col items-center text-center"
                style={{ 
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)'
                }}
            >
                <Archive size={48} className="mb-4 opacity-50" style={{ color: 'var(--text-muted)' }} />
                <p 
                    className="font-mono text-sm uppercase tracking-wide"
                    style={{ color: 'var(--text-secondary)' }}
                >
                    No {type} found with current filters
                </p>
            </div>
        )
    }

    const getStatusStyle = (status) => {
        switch (status) {
            case 'pending': return { bg: 'var(--flagged-bg)', color: 'var(--flagged-text)', border: 'var(--flagged-border)' }
            case 'approved': return { bg: 'var(--safe-bg)', color: 'var(--safe-text)', border: 'var(--safe-border)' }
            case 'flagged': return { bg: 'var(--flagged-bg)', color: 'var(--flagged-text)', border: 'var(--flagged-border)' }
            case 'rejected': return { bg: 'var(--rejected-bg)', color: 'var(--rejected-text)', border: 'var(--rejected-border)' }
            default: return { bg: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: 'var(--border-color)' }
        }
    }

    const getPriorityStyle = (priority) => {
        if (!priority) return null
        switch (priority) {
            case 'critical': return { color: 'var(--rejected-text)', border: 'var(--rejected-border)' }
            case 'high': return { color: '#f97316', border: 'rgba(249, 115, 22, 0.3)' }
            case 'medium': return { color: 'var(--flagged-text)', border: 'var(--flagged-border)' }
            case 'low': return { color: 'var(--safe-text)', border: 'var(--safe-border)' }
            default: return { color: 'var(--text-secondary)', border: 'var(--border-color)' }
        }
    }

    return (
        <div className="flex flex-col gap-3">
            {items.map(item => {
                const id = item.characterId || item.storylineId || item.personaId || item._id
                const name = item.name || item.title
                const mod = item.moderationResult || {}
                const statusStyle = getStatusStyle(item.moderationStatus)
                const priorityStyle = getPriorityStyle(mod.humanReviewPriority)

                return (
                    <div
                        key={id}
                        onClick={() => onItemClick(item)}
                        className="group relative flex flex-col md:flex-row gap-4 p-4 rounded-lg cursor-pointer transition-all duration-200"
                        style={{ 
                            backgroundColor: 'var(--bg-card)',
                            border: '1px solid var(--border-color)'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--border-hover)'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                    >
                        {/* Left: Avatar/Cover */}
                        <div className="shrink-0">
                            <img
                                src={item.avatar || item.cover || `https://placehold.co/60x60/1a1a1a/white?text=${name?.charAt(0)}`}
                                alt={name}
                                className="w-16 h-16 rounded-md object-cover"
                                style={{ 
                                    border: '1px solid var(--border-color)',
                                    backgroundColor: 'var(--bg-secondary)'
                                }}
                            />
                        </div>

                        {/* Middle: Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-3 mb-1">
                                <h3 
                                    className="font-bold truncate pr-2 transition-colors"
                                    style={{ color: 'var(--text-primary)' }}
                                >
                                    {name}
                                </h3>
                                <span 
                                    className="font-mono text-xs hidden sm:inline-block"
                                    style={{ color: 'var(--text-secondary)' }}
                                >
                                    {id}
                                </span>
                            </div>
                            <p 
                                className="text-xs mb-2"
                                style={{ color: 'var(--text-secondary)' }}
                            >
                                by <span style={{ color: 'var(--text-primary)' }}>{item.user}</span>
                            </p>

                            {/* AI Summary if available */}
                            {mod.aiSummary && (
                                <div 
                                    className="flex items-start gap-2 p-2 rounded mb-2"
                                    style={{ 
                                        backgroundColor: 'var(--bg-secondary)',
                                        border: '1px solid var(--border-color)'
                                    }}
                                >
                                    <Bot size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--text-secondary)' }} />
                                    <p 
                                        className="text-xs line-clamp-1"
                                        style={{ color: 'var(--text-primary)' }}
                                    >
                                        {mod.aiSummary}
                                    </p>
                                </div>
                            )}

                            <div className="flex flex-wrap gap-1.5">
                                {item.tags?.slice(0, 3).map((tag, i) => (
                                    <span 
                                        key={i} 
                                        className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wide"
                                        style={{ 
                                            backgroundColor: 'var(--bg-hover)',
                                            color: 'var(--text-secondary)',
                                            border: '1px solid var(--border-color)'
                                        }}
                                    >
                                        {tag}
                                    </span>
                                ))}
                                {item.tags?.length > 3 && (
                                    <span 
                                        className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wide"
                                        style={{ 
                                            backgroundColor: 'var(--bg-hover)',
                                            color: 'var(--text-secondary)',
                                            border: '1px solid var(--border-color)'
                                        }}
                                    >
                                        +{item.tags.length - 3}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Right: Status & Actions */}
                        <div 
                            className="flex flex-row md:flex-col items-center md:items-end gap-2 md:min-w-[140px] pl-0 md:pl-4"
                            style={{ borderLeft: 'none' }}
                        >
                            <span 
                                className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                                style={{ 
                                    backgroundColor: statusStyle.bg,
                                    color: statusStyle.color,
                                    border: `1px solid ${statusStyle.border}`
                                }}
                            >
                                {item.moderationStatus}
                            </span>

                            {item.nsfw && (
                                <span 
                                    className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                                    style={{ 
                                        backgroundColor: 'var(--rejected-bg)',
                                        color: 'var(--rejected-text)',
                                        border: '1px solid var(--rejected-border)'
                                    }}
                                >
                                    NSFW
                                </span>
                            )}

                            {priorityStyle && (
                                <span 
                                    className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                                    style={{ 
                                        color: priorityStyle.color,
                                        border: `1px solid ${priorityStyle.border}`,
                                        backgroundColor: 'transparent'
                                    }}
                                >
                                    {mod.humanReviewPriority} Priority
                                </span>
                            )}

                            {mod.aiVerdict && (
                                <span 
                                    className="text-[10px] font-mono mt-auto"
                                    style={{ color: 'var(--text-secondary)' }}
                                >
                                    AI: {mod.aiVerdict} ({Math.round((mod.aiConfidence || 0) * 100)}%)
                                </span>
                            )}

                            <span 
                                className="hidden md:inline-flex text-xs font-bold items-center opacity-0 group-hover:opacity-100 transition-opacity mt-2"
                                style={{ color: 'var(--accent-secondary)' }}
                            >
                                Review detail →
                            </span>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

export default ContentList