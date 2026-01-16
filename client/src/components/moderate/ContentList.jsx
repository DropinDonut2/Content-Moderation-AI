import { Archive, Bot } from 'lucide-react'

function ContentList({ type, items, loading, onItemClick }) {
    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            </div>
        )
    }

    if (!items || items.length === 0) {
        return (
            <div className="card-premium p-12 flex flex-col items-center text-center text-text-secondary">
                <Archive size={48} className="mb-4 opacity-50" />
                <p className="font-mono text-sm uppercase tracking-wide">No {type} found with current filters</p>
            </div>
        )
    }

    const getStatusStyle = (status) => {
        switch (status) {
            case 'pending': return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
            case 'approved': return 'bg-green-500/10 text-green-500 border-green-500/20'
            case 'flagged': return 'bg-orange-500/10 text-orange-500 border-orange-500/20'
            case 'rejected': return 'bg-red-500/10 text-red-500 border-red-500/20'
            default: return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
        }
    }

    const getPriorityStyle = (priority) => {
        if (!priority) return null
        switch (priority) {
            case 'critical': return 'text-red-500 border-red-500'
            case 'high': return 'text-orange-500 border-orange-500'
            case 'medium': return 'text-amber-500 border-amber-500'
            case 'low': return 'text-green-500 border-green-500'
            default: return 'text-zinc-500 border-zinc-500'
        }
    }

    return (
        <div className="flex flex-col gap-3">
            {items.map(item => {
                const id = item.characterId || item.storylineId || item.personaId || item._id
                const name = item.name || item.title
                const mod = item.moderationResult || {}
                const statusClass = getStatusStyle(item.moderationStatus)
                const priorityClass = getPriorityStyle(mod.humanReviewPriority)

                return (
                    <div
                        key={id}
                        onClick={() => onItemClick(item)}
                        className="group relative flex flex-col md:flex-row gap-4 p-4 bg-zinc-900/40 border border-white/5 hover:border-white/20 hover:bg-zinc-900/60 rounded-lg cursor-pointer transition-all duration-200"
                    >
                        {/* Left: Avatar/Cover */}
                        <div className="shrink-0">
                            <img
                                src={item.avatar || item.cover || `https://placehold.co/60x60/1a1a1a/white?text=${name?.charAt(0)}`}
                                alt={name}
                                className="w-16 h-16 rounded-md object-cover border border-white/5 bg-zinc-800"
                            />
                        </div>

                        {/* Middle: Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-3 mb-1">
                                <h3 className="text-white font-bold truncate pr-2 group-hover:text-blue-400 transition-colors">{name}</h3>
                                <span className="font-mono text-xs text-text-secondary hidden sm:inline-block">{id}</span>
                            </div>
                            <p className="text-xs text-text-secondary mb-2">by <span className="text-white">{item.user}</span></p>

                            {/* AI Summary if available */}
                            {mod.aiSummary && (
                                <div className="flex items-start gap-2 bg-black/40 p-2 rounded border border-white/5 mb-2">
                                    <Bot size={14} className="mt-0.5 text-text-secondary shrink-0" />
                                    <p className="text-xs text-text-primary line-clamp-1">{mod.aiSummary}</p>
                                </div>
                            )}

                            <div className="flex flex-wrap gap-1.5">
                                {item.tags?.slice(0, 3).map((tag, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-white/5 rounded text-[10px] text-text-secondary border border-white/5 uppercase tracking-wide">
                                        {tag}
                                    </span>
                                ))}
                                {item.tags?.length > 3 && (
                                    <span className="px-2 py-0.5 bg-white/5 rounded text-[10px] text-text-secondary border border-white/5 uppercase tracking-wide">
                                        +{item.tags.length - 3}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Right: Status & Actions */}
                        <div className="flex flex-row md:flex-col items-center md:items-end gap-2 md:min-w-[140px] pl-0 md:pl-4 md:border-l md:border-white/5">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusClass}`}>
                                {item.moderationStatus}
                            </span>

                            {item.nsfw && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-500 border border-red-500/20">
                                    NSFW
                                </span>
                            )}

                            {priorityClass && (
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${priorityClass}`}>
                                    {mod.humanReviewPriority} Priority
                                </span>
                            )}

                            {mod.aiVerdict && (
                                <span className="text-[10px] font-mono text-text-secondary mt-auto">
                                    AI: {mod.aiVerdict} ({Math.round((mod.aiConfidence || 0) * 100)}%)
                                </span>
                            )}

                            <span className="hidden md:inline-flex text-xs font-bold text-white items-center opacity-0 group-hover:opacity-100 transition-opacity mt-2">
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