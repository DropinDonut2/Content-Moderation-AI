import { useState } from 'react'
import { reviewCharacter, reviewStoryline, reviewPersona, rerunModeration } from '../../services/api'

function ContentDetailModal({ type, item, onClose, onReviewComplete }) {
    const [activeTab, setActiveTab] = useState('details')
    const [reviewerName, setReviewerName] = useState('')
    const [reviewNotes, setReviewNotes] = useState('')
    const [rejectionReason, setRejectionReason] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [rerunning, setRerunning] = useState(false)
    const [error, setError] = useState('')

    const handleReview = async (status) => {
        if (!reviewerName.trim()) {
            setError('Please enter your name')
            return
        }
        if (status === 'rejected' && !rejectionReason.trim()) {
            setError('Please provide a rejection reason')
            return
        }

        setSubmitting(true)
        setError('')

        try {
            const reviewData = {
                status,
                reviewedBy: reviewerName.trim(),
                reviewNotes: reviewNotes.trim(),
                ...(status === 'rejected' && { rejectionReason: rejectionReason.trim() })
            }
            const id = item.characterId || item.storylineId || item.personaId || item._id

            switch (type) {
                case 'characters': await reviewCharacter(id, reviewData); break
                case 'storylines': await reviewStoryline(id, reviewData); break
                case 'personas': await reviewPersona(id, reviewData); break
            }
            onReviewComplete()
        } catch (err) {
            setError(err.message || 'Failed to submit review')
        } finally {
            setSubmitting(false)
        }
    }

    const handleRerunModeration = async () => {
        setRerunning(true)
        try {
            const id = item.characterId || item.storylineId || item.personaId || item._id
            await rerunModeration(type, id)
            onReviewComplete()
        } catch (err) {
            setError('Failed to re-run moderation')
        } finally {
            setRerunning(false)
        }
    }

    const mod = item.moderationResult || {}
    const isPending = item.moderationStatus === 'pending' || item.moderationStatus === 'flagged'

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'critical': return '#ef4444'
            case 'high': return '#f97316'
            case 'medium': return '#f59e0b'
            case 'low': return '#22c55e'
            default: return '#6b7280'
        }
    }

    const getVerdictColor = (verdict) => {
        switch (verdict) {
            case 'safe': return '#22c55e'
            case 'flagged': return '#f59e0b'
            case 'rejected': return '#ef4444'
            default: return '#6b7280'
        }
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content review-modal" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="modal-header">
                    <div className="header-left">
                        <h2>{item.name || item.title}</h2>
                        <span className="content-id">{item.characterId || item.storylineId || item.personaId}</span>
                    </div>
                    <div className="header-right">
                        <span className={`status-badge status-${item.moderationStatus}`}>
                            {item.moderationStatus}
                        </span>
                        {item.nsfw && <span className="nsfw-tag">🔞 NSFW</span>}
                        <button className="close-btn" onClick={onClose}>×</button>
                    </div>
                </div>

                {/* Main Content - Split Layout */}
                <div className="modal-body split-layout">
                    
                    {/* LEFT: AI Analysis Panel - Always Visible */}
                    <div className="ai-panel">
                        <div className="ai-panel-header">
                            <h3>🤖 AI Analysis</h3>
                            <button 
                                className="btn-small btn-secondary"
                                onClick={handleRerunModeration}
                                disabled={rerunning}
                            >
                                {rerunning ? '⏳' : '🔄'} Re-run
                            </button>
                        </div>

                        {mod.aiVerdict ? (
                            <>
                                {/* Quick Summary */}
                                <div className="ai-summary-box">
                                    <p className="ai-summary">{mod.aiSummary || mod.aiReasoning}</p>
                                </div>

                                {/* Verdict & Priority */}
                                <div className="ai-metrics">
                                    <div className="metric">
                                        <span className="label">Verdict</span>
                                        <span className="value" style={{ color: getVerdictColor(mod.aiVerdict) }}>
                                            {mod.aiVerdict?.toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="metric">
                                        <span className="label">Confidence</span>
                                        <span className="value">{Math.round((mod.aiConfidence || 0) * 100)}%</span>
                                    </div>
                                    <div className="metric">
                                        <span className="label">Priority</span>
                                        <span className="value" style={{ color: getPriorityColor(mod.humanReviewPriority) }}>
                                            {mod.humanReviewPriority?.toUpperCase() || 'N/A'}
                                        </span>
                                    </div>
                                    <div className="metric">
                                        <span className="label">Recommendation</span>
                                        <span className="value">{mod.recommendedAction?.toUpperCase() || 'N/A'}</span>
                                    </div>
                                </div>

                                {/* Categories Detected */}
                                {mod.categories && mod.categories.length > 0 && (
                                    <div className="ai-categories">
                                        <h4>Categories Analyzed</h4>
                                        {mod.categories.map((cat, i) => (
                                            <div key={i} className={`category-row ${cat.flagged ? 'flagged' : ''}`}>
                                                <span className="cat-name">{cat.category}</span>
                                                <span className="cat-conf">{Math.round(cat.confidence * 100)}%</span>
                                                {cat.flagged && <span className="cat-flag">⚠️</span>}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Flagged Policies */}
                                {mod.flaggedPolicies && mod.flaggedPolicies.length > 0 && (
                                    <div className="flagged-policies">
                                        <h4>⚠️ Policy Violations</h4>
                                        <div className="policy-tags">
                                            {mod.flaggedPolicies.map((pol, i) => (
                                                <span key={i} className="policy-tag">{pol}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Full Reasoning */}
                                <div className="ai-reasoning">
                                    <h4>Full Analysis</h4>
                                    <p>{mod.aiReasoning}</p>
                                </div>
                            </>
                        ) : (
                            <div className="no-analysis">
                                <p>No AI analysis available</p>
                                <button className="btn btn-primary" onClick={handleRerunModeration} disabled={rerunning}>
                                    {rerunning ? 'Analyzing...' : '🤖 Run AI Analysis'}
                                </button>
                            </div>
                        )}

                        {/* Review Actions */}
                        {isPending && (
                            <div className="review-actions-panel">
                                <h4>Your Decision</h4>
                                {error && <div className="error-msg">{error}</div>}
                                
                                <input
                                    type="text"
                                    placeholder="Your name *"
                                    value={reviewerName}
                                    onChange={(e) => setReviewerName(e.target.value)}
                                    className="review-input"
                                />
                                <input
                                    type="text"
                                    placeholder="Rejection reason (required if rejecting)"
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    className="review-input"
                                />
                                <textarea
                                    placeholder="Notes (optional)"
                                    value={reviewNotes}
                                    onChange={(e) => setReviewNotes(e.target.value)}
                                    className="review-input"
                                    rows={2}
                                />
                                
                                <div className="action-buttons">
                                    <button className="btn btn-success" onClick={() => handleReview('approved')} disabled={submitting}>
                                        ✓ Approve
                                    </button>
                                    <button className="btn btn-warning" onClick={() => handleReview('flagged')} disabled={submitting}>
                                        ⚠️ Flag
                                    </button>
                                    <button className="btn btn-danger" onClick={() => handleReview('rejected')} disabled={submitting}>
                                        ✗ Reject
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* RIGHT: Content Details */}
                    <div className="content-panel">
                        <div className="content-tabs">
                            {['details', 'media', 'stats', 'system'].map(tab => (
                                <button
                                    key={tab}
                                    className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                                    onClick={() => setActiveTab(tab)}
                                >
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </button>
                            ))}
                        </div>

                        <div className="content-body">
                            {activeTab === 'details' && (
                                <div className="details-content">
                                    <div className="info-grid">
                                        <div className="info-item"><span className="label">User</span><span className="value">{item.user}</span></div>
                                        <div className="info-item"><span className="label">Language</span><span className="value">{item.languageCode}</span></div>
                                        <div className="info-item"><span className="label">Visibility</span><span className="value">{item.visibility}</span></div>
                                        <div className="info-item"><span className="label">NSFW</span><span className="value">{item.nsfw ? 'Yes' : 'No'}</span></div>
                                        <div className="info-item"><span className="label">Advanced Mode</span><span className="value">{item.advancedMode ? 'Yes' : 'No'}</span></div>
                                        <div className="info-item"><span className="label">Secret Mode</span><span className="value">{item.secretMode ? 'Yes' : 'No'}</span></div>
                                    </div>

                                    <div className="text-section">
                                        <h4>Description</h4>
                                        <p>{item.description || 'No description'}</p>
                                    </div>

                                    {item.descriptionSummary && (
                                        <div className="text-section">
                                            <h4>Summary</h4>
                                            <p>{item.descriptionSummary}</p>
                                        </div>
                                    )}

                                    {item.firstMessage && (
                                        <div className="text-section">
                                            <h4>First Message</h4>
                                            <div className="message-box">{item.firstMessage}</div>
                                        </div>
                                    )}

                                    {item.exampleDialogue && (
                                        <div className="text-section">
                                            <h4>Example Dialogue</h4>
                                            <div className="message-box">{item.exampleDialogue}</div>
                                        </div>
                                    )}

                                    {item.characters && item.characters.length > 0 && (
                                        <div className="text-section">
                                            <h4>Characters ({item.characters.length})</h4>
                                            <div className="character-list">
                                                {item.characters.map((char, i) => (
                                                    <div key={i} className="char-item">
                                                        <img src={char.avatar || `https://placehold.co/40x40/7c3aed/white?text=${char.name?.charAt(0)}`} alt="" />
                                                        <div><strong>{char.name}</strong><span>{char.role}</span></div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {item.tags && item.tags.length > 0 && (
                                        <div className="text-section">
                                            <h4>Tags</h4>
                                            <div className="tags-list">
                                                {item.tags.map((tag, i) => (<span key={i} className="tag">{tag}</span>))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'media' && (
                                <div className="media-content">
                                    {item.avatar && (<div className="media-item"><h4>Avatar</h4><img src={item.avatar} alt="Avatar" className="preview-img" /></div>)}
                                    {item.cover && (<div className="media-item"><h4>Cover</h4><img src={item.cover} alt="Cover" className="preview-img cover" /></div>)}
                                    {(!item.avatar && !item.cover) && <p className="empty">No media uploaded</p>}
                                </div>
                            )}

                            {activeTab === 'stats' && (
                                <div className="stats-content">
                                    <div className="stat-grid">
                                        <div className="stat-box"><span className="stat-value">{item.statistics?.views || 0}</span><span className="stat-label">Views</span></div>
                                        <div className="stat-box"><span className="stat-value">{item.statistics?.likes || 0}</span><span className="stat-label">Likes</span></div>
                                        <div className="stat-box"><span className="stat-value">{item.statistics?.chats || item.statistics?.plays || item.statistics?.uses || 0}</span><span className="stat-label">{type === 'storylines' ? 'Plays' : type === 'personas' ? 'Uses' : 'Chats'}</span></div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'system' && (
                                <div className="system-content">
                                    <div className="info-grid">
                                        <div className="info-item"><span className="label">ID</span><span className="value mono">{item.characterId || item.storylineId || item.personaId}</span></div>
                                        <div className="info-item"><span className="label">Database ID</span><span className="value mono">{item._id}</span></div>
                                        <div className="info-item"><span className="label">Version</span><span className="value">{item.version || 1}</span></div>
                                        <div className="info-item"><span className="label">Created</span><span className="value">{new Date(item.createdAt).toLocaleString()}</span></div>
                                        <div className="info-item"><span className="label">Updated</span><span className="value">{new Date(item.updatedAt).toLocaleString()}</span></div>
                                        {item.reviewedBy && (<><div className="info-item"><span className="label">Reviewed By</span><span className="value">{item.reviewedBy}</span></div><div className="info-item"><span className="label">Reviewed At</span><span className="value">{new Date(item.reviewedAt).toLocaleString()}</span></div></>)}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <style>{`
                    .review-modal { max-width: 1200px; width: 95%; max-height: 90vh; display: flex; flex-direction: column; }
                    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem; border-bottom: 1px solid var(--border-color); }
                    .header-left h2 { margin: 0; font-size: 1.25rem; }
                    .content-id { color: var(--text-secondary); font-size: 0.875rem; font-family: monospace; }
                    .header-right { display: flex; align-items: center; gap: 0.75rem; }
                    .status-badge { padding: 0.375rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; }
                    .status-pending { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
                    .status-approved { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
                    .status-flagged { background: rgba(249, 115, 22, 0.2); color: #f97316; }
                    .status-rejected { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
                    .nsfw-tag { background: rgba(239, 68, 68, 0.2); color: #ef4444; padding: 0.375rem 0.75rem; border-radius: 4px; font-size: 0.75rem; }
                    .close-btn { background: none; border: none; font-size: 1.5rem; color: var(--text-secondary); cursor: pointer; padding: 0 0.5rem; }
                    .split-layout { display: grid; grid-template-columns: 380px 1fr; flex: 1; overflow: hidden; }
                    .ai-panel { background: var(--bg-secondary); border-right: 1px solid var(--border-color); padding: 1.25rem; overflow-y: auto; display: flex; flex-direction: column; gap: 1rem; }
                    .ai-panel-header { display: flex; justify-content: space-between; align-items: center; }
                    .ai-panel-header h3 { margin: 0; font-size: 1rem; }
                    .btn-small { padding: 0.375rem 0.75rem; font-size: 0.75rem; border-radius: 6px; cursor: pointer; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary); }
                    .ai-summary-box { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem; }
                    .ai-summary { margin: 0; font-size: 0.9375rem; line-height: 1.5; }
                    .ai-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
                    .metric { background: var(--bg-card); padding: 0.75rem; border-radius: 8px; text-align: center; }
                    .metric .label { display: block; font-size: 0.6875rem; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 0.25rem; }
                    .metric .value { font-weight: 700; font-size: 0.875rem; }
                    .ai-categories h4, .flagged-policies h4, .ai-reasoning h4 { font-size: 0.8125rem; color: var(--text-secondary); margin: 0 0 0.5rem 0; }
                    .category-row { display: flex; align-items: center; padding: 0.5rem 0.75rem; background: var(--bg-card); border-radius: 6px; margin-bottom: 0.375rem; font-size: 0.8125rem; }
                    .category-row.flagged { background: rgba(239, 68, 68, 0.15); }
                    .cat-name { flex: 1; }
                    .cat-conf { color: var(--text-secondary); margin-right: 0.5rem; }
                    .policy-tags { display: flex; flex-wrap: wrap; gap: 0.5rem; }
                    .policy-tag { background: rgba(239, 68, 68, 0.2); color: #ef4444; padding: 0.375rem 0.75rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
                    .ai-reasoning { background: var(--bg-card); padding: 1rem; border-radius: 8px; }
                    .ai-reasoning p { margin: 0; font-size: 0.875rem; line-height: 1.6; }
                    .no-analysis { text-align: center; padding: 2rem; color: var(--text-secondary); }
                    .review-actions-panel { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem; margin-top: auto; }
                    .review-actions-panel h4 { margin: 0 0 0.75rem 0; font-size: 0.875rem; }
                    .review-input { width: 100%; padding: 0.625rem; margin-bottom: 0.5rem; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 6px; color: var(--text-primary); font-size: 0.875rem; box-sizing: border-box; }
                    .action-buttons { display: flex; gap: 0.5rem; margin-top: 0.75rem; }
                    .action-buttons .btn { flex: 1; padding: 0.625rem; font-size: 0.8125rem; }
                    .btn-warning { background: #f59e0b; color: black; border: none; }
                    .error-msg { background: rgba(239, 68, 68, 0.2); color: #ef4444; padding: 0.5rem; border-radius: 6px; margin-bottom: 0.75rem; font-size: 0.8125rem; }
                    .content-panel { display: flex; flex-direction: column; overflow: hidden; }
                    .content-tabs { display: flex; gap: 0; border-bottom: 1px solid var(--border-color); padding: 0 1rem; }
                    .content-tabs .tab-btn { padding: 0.875rem 1.25rem; background: none; border: none; color: var(--text-secondary); cursor: pointer; border-bottom: 2px solid transparent; font-size: 0.875rem; }
                    .content-tabs .tab-btn.active { color: var(--accent-primary); border-bottom-color: var(--accent-primary); }
                    .content-body { padding: 1.25rem; overflow-y: auto; flex: 1; }
                    .info-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
                    .info-item .label { display: block; font-size: 0.6875rem; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 0.25rem; }
                    .info-item .value { font-weight: 500; }
                    .info-item .value.mono { font-family: monospace; font-size: 0.75rem; }
                    .text-section { margin-bottom: 1.5rem; }
                    .text-section h4 { font-size: 0.8125rem; color: var(--text-secondary); margin: 0 0 0.5rem 0; }
                    .text-section p { margin: 0; line-height: 1.6; }
                    .message-box { background: var(--bg-secondary); padding: 1rem; border-radius: 8px; white-space: pre-wrap; line-height: 1.6; font-size: 0.9375rem; }
                    .character-list { display: flex; flex-direction: column; gap: 0.5rem; }
                    .char-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; background: var(--bg-secondary); border-radius: 8px; }
                    .char-item img { width: 40px; height: 40px; border-radius: 50%; }
                    .char-item span { display: block; font-size: 0.75rem; color: var(--text-secondary); }
                    .tags-list { display: flex; flex-wrap: wrap; gap: 0.5rem; }
                    .tag { background: var(--bg-secondary); padding: 0.375rem 0.75rem; border-radius: 9999px; font-size: 0.8125rem; }
                    .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
                    .stat-box { background: var(--bg-secondary); padding: 1.5rem; border-radius: 8px; text-align: center; }
                    .stat-value { display: block; font-size: 2rem; font-weight: 700; }
                    .stat-label { display: block; font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; }
                    .preview-img { max-width: 200px; border-radius: 8px; }
                    .preview-img.cover { max-width: 100%; }
                    .empty { color: var(--text-secondary); text-align: center; padding: 2rem; }
                    @media (max-width: 900px) { .split-layout { grid-template-columns: 1fr; } .ai-panel { border-right: none; border-bottom: 1px solid var(--border-color); max-height: 50vh; } }
                `}</style>
            </div>
        </div>
    )
}

export default ContentDetailModal