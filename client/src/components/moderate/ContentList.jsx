function ContentList({ type, items, loading, onItemClick }) {
    if (loading) {
        return <div className="loading-container"><div className="spinner"></div></div>
    }

    if (!items || items.length === 0) {
        return (
            <div className="empty-state card">
                <div className="icon">📭</div>
                <p>No {type} found with current filters</p>
            </div>
        )
    }

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return { bg: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b' }
            case 'approved': return { bg: 'rgba(34, 197, 94, 0.2)', color: '#22c55e' }
            case 'flagged': return { bg: 'rgba(249, 115, 22, 0.2)', color: '#f97316' }
            case 'rejected': return { bg: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }
            default: return { bg: 'rgba(107, 114, 128, 0.2)', color: '#6b7280' }
        }
    }

    const getPriorityBadge = (priority) => {
        if (!priority) return null
        const colors = {
            critical: '#ef4444',
            high: '#f97316',
            medium: '#f59e0b',
            low: '#22c55e'
        }
        return (
            <span className="priority-badge" style={{ borderColor: colors[priority], color: colors[priority] }}>
                {priority}
            </span>
        )
    }

    return (
        <div className="content-list">
            {items.map(item => {
                const id = item.characterId || item.storylineId || item.personaId || item._id
                const name = item.name || item.title
                const mod = item.moderationResult || {}
                const statusStyle = getStatusColor(item.moderationStatus)

                return (
                    <div key={id} className="content-item" onClick={() => onItemClick(item)}>
                        {/* Left: Avatar/Cover */}
                        <div className="item-visual">
                            <img 
                                src={item.avatar || item.cover || `https://placehold.co/60x60/7c3aed/white?text=${name?.charAt(0)}`}
                                alt={name}
                            />
                        </div>

                        {/* Middle: Info */}
                        <div className="item-info">
                            <div className="item-header">
                                <h3>{name}</h3>
                                <span className="item-id">{id}</span>
                            </div>
                            <p className="item-user">by {item.user}</p>
                            
                            {/* AI Summary if available */}
                            {mod.aiSummary && (
                                <p className="ai-summary">🤖 {mod.aiSummary}</p>
                            )}
                            
                            <div className="item-tags">
                                {item.tags?.slice(0, 3).map((tag, i) => (
                                    <span key={i} className="mini-tag">{tag}</span>
                                ))}
                                {item.tags?.length > 3 && <span className="mini-tag">+{item.tags.length - 3}</span>}
                            </div>
                        </div>

                        {/* Right: Status & Actions */}
                        <div className="item-status">
                            <span className="status-badge" style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}>
                                {item.moderationStatus}
                            </span>
                            
                            {item.nsfw && <span className="nsfw-badge">🔞 NSFW</span>}
                            
                            {mod.humanReviewPriority && getPriorityBadge(mod.humanReviewPriority)}
                            
                            {mod.aiVerdict && (
                                <span className="ai-verdict">
                                    AI: {mod.aiVerdict} ({Math.round((mod.aiConfidence || 0) * 100)}%)
                                </span>
                            )}
                            
                            <span className="view-btn">View →</span>
                        </div>
                    </div>
                )
            })}

            <style>{`
                .content-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }

                .content-item {
                    display: grid;
                    grid-template-columns: 60px 1fr auto;
                    gap: 1rem;
                    padding: 1rem;
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius);
                    cursor: pointer;
                    transition: var(--transition);
                    align-items: center;
                }

                .content-item:hover {
                    border-color: var(--accent-primary);
                    transform: translateX(4px);
                }

                .item-visual img {
                    width: 60px;
                    height: 60px;
                    border-radius: 8px;
                    object-fit: cover;
                }

                .item-info {
                    min-width: 0;
                }

                .item-header {
                    display: flex;
                    align-items: baseline;
                    gap: 0.75rem;
                    margin-bottom: 0.25rem;
                }

                .item-header h3 {
                    margin: 0;
                    font-size: 1rem;
                    font-weight: 600;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .item-id {
                    font-family: monospace;
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                }

                .item-user {
                    margin: 0 0 0.5rem 0;
                    font-size: 0.8125rem;
                    color: var(--text-secondary);
                }

                .ai-summary {
                    margin: 0 0 0.5rem 0;
                    font-size: 0.8125rem;
                    color: var(--text-primary);
                    background: var(--bg-secondary);
                    padding: 0.5rem 0.75rem;
                    border-radius: 6px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .item-tags {
                    display: flex;
                    gap: 0.375rem;
                    flex-wrap: wrap;
                }

                .mini-tag {
                    background: var(--bg-secondary);
                    padding: 0.25rem 0.5rem;
                    border-radius: 4px;
                    font-size: 0.6875rem;
                    color: var(--text-secondary);
                }

                .item-status {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                    gap: 0.5rem;
                    min-width: 120px;
                }

                .status-badge {
                    padding: 0.375rem 0.75rem;
                    border-radius: 9999px;
                    font-size: 0.6875rem;
                    font-weight: 600;
                    text-transform: uppercase;
                }

                .nsfw-badge {
                    background: rgba(239, 68, 68, 0.2);
                    color: #ef4444;
                    padding: 0.25rem 0.5rem;
                    border-radius: 4px;
                    font-size: 0.6875rem;
                }

                .priority-badge {
                    border: 1px solid;
                    padding: 0.25rem 0.5rem;
                    border-radius: 4px;
                    font-size: 0.6875rem;
                    font-weight: 600;
                    text-transform: uppercase;
                }

                .ai-verdict {
                    font-size: 0.6875rem;
                    color: var(--text-secondary);
                }

                .view-btn {
                    color: var(--accent-primary);
                    font-size: 0.8125rem;
                    font-weight: 500;
                }

                @media (max-width: 768px) {
                    .content-item {
                        grid-template-columns: 50px 1fr;
                    }
                    .item-status {
                        grid-column: 1 / -1;
                        flex-direction: row;
                        flex-wrap: wrap;
                        justify-content: flex-start;
                    }
                }
            `}</style>
        </div>
    )
}

export default ContentList