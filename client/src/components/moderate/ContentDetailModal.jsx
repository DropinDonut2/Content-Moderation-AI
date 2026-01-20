import { useState } from 'react'
import { createPortal } from 'react-dom'
import SuggestionsPanel from './SuggestionsPanel'
import { reviewCharacter, reviewStoryline, reviewPersona, rerunModeration } from '../../services/api'
import {
    X, AlertTriangle, Shield, Check, XCircle, RotateCw, Bot,
    MessageSquare, User, Tag, Eye, ThumbsUp, Activity,
    Calendar, Layers, FileText
} from 'lucide-react'

function ContentDetailModal({ type, item, onClose, onReviewComplete }) {
    const [activeTab, setActiveTab] = useState('details')
    const [reviewerName, setReviewerName] = useState('')
    const [reviewNotes, setReviewerNotes] = useState('')
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

    const getStatusStyle = (status) => {
        switch (status) {
            case 'pending': return { bg: 'var(--flagged-bg)', color: 'var(--flagged-text)', border: 'var(--flagged-border)' }
            case 'approved': return { bg: 'var(--safe-bg)', color: 'var(--safe-text)', border: 'var(--safe-border)' }
            case 'flagged': return { bg: 'var(--flagged-bg)', color: 'var(--flagged-text)', border: 'var(--flagged-border)' }
            case 'rejected': return { bg: 'var(--rejected-bg)', color: 'var(--rejected-text)', border: 'var(--rejected-border)' }
            default: return { bg: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: 'var(--border-color)' }
        }
    }

    const statusStyle = getStatusStyle(item.moderationStatus)

    const modalContent = (
        <div 
            className="fixed inset-0 flex items-center justify-center p-4"
            style={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.85)', 
                backdropFilter: 'blur(4px)',
                zIndex: 99999
            }}
            onClick={onClose}
        >
            <div 
                className="w-full max-w-6xl h-[92vh] flex flex-col shadow-2xl rounded-xl overflow-hidden"
                style={{ 
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)'
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div 
                    className="flex justify-between items-center px-6 py-4 shrink-0"
                    style={{ 
                        borderBottom: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-secondary)'
                    }}
                >
                    <div>
                        <h2 
                            className="text-xl font-bold"
                            style={{ color: 'var(--text-primary)' }}
                        >
                            {item.name || item.title}
                        </h2>
                        <span 
                            className="font-mono text-xs"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            {item.characterId || item.storylineId || item.personaId}
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span 
                            className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
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
                                className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2"
                                style={{ 
                                    backgroundColor: 'var(--rejected-bg)',
                                    color: 'var(--rejected-text)',
                                    border: '1px solid var(--rejected-border)'
                                }}
                            >
                                <Shield size={12} /> NSFW
                            </span>
                        )}
                        <button
                            className="p-2 rounded-full transition-colors"
                            style={{ color: 'var(--text-secondary)' }}
                            onClick={onClose}
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Main Content - Split Layout */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-[380px_1fr] overflow-hidden min-h-0">

                    {/* LEFT: AI Analysis Panel */}
                    <div 
                        className="p-5 overflow-y-auto flex flex-col gap-4"
                        style={{ 
                            backgroundColor: 'var(--bg-secondary)',
                            borderRight: '1px solid var(--border-color)'
                        }}
                    >
                        <div className="flex justify-between items-center">
                            <h3 
                                className="text-sm font-bold uppercase tracking-wider flex items-center gap-2"
                                style={{ color: 'var(--text-primary)' }}
                            >
                                <Bot size={16} /> AI Analysis
                            </h3>
                            <button
                                className="px-3 py-1.5 text-xs font-bold rounded flex items-center gap-2 transition-colors"
                                style={{ 
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--text-primary)',
                                    backgroundColor: 'transparent'
                                }}
                                onClick={handleRerunModeration}
                                disabled={rerunning}
                            >
                                <RotateCw size={12} className={rerunning ? "animate-spin" : ""} />
                                {rerunning ? 'Running...' : 'Re-run'}
                            </button>
                        </div>

                        {mod.aiVerdict ? (
                            <>
                                <div 
                                    className="p-3 rounded-lg"
                                    style={{ 
                                        backgroundColor: 'var(--bg-card)',
                                        border: '1px solid var(--border-color)'
                                    }}
                                >
                                    <p 
                                        className="text-sm leading-relaxed"
                                        style={{ color: 'var(--text-primary)' }}
                                    >
                                        {mod.aiSummary || mod.aiReasoning}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div 
                                        className="p-3 rounded-lg text-center"
                                        style={{ 
                                            backgroundColor: 'var(--bg-card)',
                                            border: '1px solid var(--border-color)'
                                        }}
                                    >
                                        <span 
                                            className="block text-[10px] uppercase font-bold tracking-widest mb-1"
                                            style={{ color: 'var(--text-secondary)' }}
                                        >
                                            Verdict
                                        </span>
                                        <span 
                                            className="block font-bold text-sm"
                                            style={{ color: getStatusStyle(mod.aiVerdict).color }}
                                        >
                                            {mod.aiVerdict?.toUpperCase()}
                                        </span>
                                    </div>
                                    <div 
                                        className="p-3 rounded-lg text-center"
                                        style={{ 
                                            backgroundColor: 'var(--bg-card)',
                                            border: '1px solid var(--border-color)'
                                        }}
                                    >
                                        <span 
                                            className="block text-[10px] uppercase font-bold tracking-widest mb-1"
                                            style={{ color: 'var(--text-secondary)' }}
                                        >
                                            Confidence
                                        </span>
                                        <span 
                                            className="block font-bold text-sm"
                                            style={{ color: 'var(--text-primary)' }}
                                        >
                                            {Math.round((mod.aiConfidence || 0) * 100)}%
                                        </span>
                                    </div>
                                </div>

                                {mod.flaggedPolicies && mod.flaggedPolicies.length > 0 && (
                                    <div>
                                        <h4 
                                            className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2"
                                            style={{ color: 'var(--text-secondary)' }}
                                        >
                                            <AlertTriangle size={12} style={{ color: 'var(--flagged-text)' }} /> Policy Violations
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {mod.flaggedPolicies.map((pol, i) => (
                                                <span 
                                                    key={i} 
                                                    className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider"
                                                    style={{ 
                                                        backgroundColor: 'var(--rejected-bg)',
                                                        color: 'var(--rejected-text)',
                                                        border: '1px solid var(--rejected-border)'
                                                    }}
                                                >
                                                    {pol}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {mod.offendingSnippet && (
                                    <div className="mb-6 animate-fade-in">
                                        <h4 className="text-xs font-bold text-red-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <AlertTriangle size={12} />
                                            Flagged Segment
                                        </h4>
                                        <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-lg text-xs font-mono text-red-200/90 italic border-l-2 border-l-red-500/50">
                                            "{mod.offendingSnippet}"
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Full Analysis</h4>
                                    <div className="p-4 bg-zinc-950 border border-white/10 rounded-lg text-xs font-mono text-text-secondary leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                                        {mod.aiReasoning}
                                    </div>
                                </div>
                   
                            </>
                        ) : (
                            <div 
                                className="flex flex-col items-center justify-center py-8 text-center space-y-4"
                                style={{ color: 'var(--text-secondary)' }}
                            >
                                <Bot size={40} className="opacity-20" />
                                <p className="text-sm">No AI analysis available</p>
                                <button
                                    className="btn-primary-new py-2 px-4"
                                    onClick={handleRerunModeration}
                                    disabled={rerunning}
                                >
                                    <RotateCw size={14} className={`mr-2 ${rerunning ? "animate-spin" : ""}`} />
                                    {rerunning ? 'Analyzing...' : 'Run AI Analysis'}
                                </button>
                            </div>
                        )}

                        {/* Review Panel */}
                        {isPending && (
                            <div 
                                className="mt-auto rounded-lg p-4 space-y-3"
                                style={{ 
                                    backgroundColor: 'var(--bg-card)',
                                    border: '1px solid var(--border-color)'
                                }}
                            >
                                <h4 
                                    className="text-sm font-bold uppercase tracking-wider pb-2"
                                    style={{ 
                                        color: 'var(--text-primary)',
                                        borderBottom: '1px solid var(--border-color)'
                                    }}
                                >
                                    Your Decision
                                </h4>
                                
                                {error && (
                                    <div 
                                        className="p-2 text-xs rounded"
                                        style={{ 
                                            backgroundColor: 'var(--rejected-bg)',
                                            color: 'var(--rejected-text)',
                                            border: '1px solid var(--rejected-border)'
                                        }}
                                    >
                                        {error}
                                    </div>
                                )}

                                <input
                                    type="text"
                                    placeholder="Reviewer Name *"
                                    value={reviewerName}
                                    onChange={(e) => setReviewerName(e.target.value)}
                                    className="input-premium text-sm"
                                />
                                <input
                                    type="text"
                                    placeholder="Rejection Reason (if rejecting)"
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    className="input-premium text-sm"
                                />
                                <textarea
                                    placeholder="Internal Notes (Optional)"
                                    value={reviewNotes}
                                    onChange={(e) => setReviewerNotes(e.target.value)}
                                    className="input-premium text-sm resize-none h-16"
                                />

                                <div className="grid grid-cols-3 gap-2 pt-2">
                                    <button
                                        className="action-approve flex flex-col items-center justify-center p-2 rounded disabled:opacity-50"
                                        onClick={() => handleReview('approved')}
                                        disabled={submitting}
                                    >
                                        <Check size={16} className="mb-1" />
                                        <span className="text-[10px] uppercase font-bold">Approve</span>
                                    </button>
                                    <button
                                        className="flex flex-col items-center justify-center p-2 rounded transition-colors disabled:opacity-50"
                                        style={{ 
                                            backgroundColor: 'var(--flagged-bg)',
                                            color: 'var(--flagged-text)',
                                            border: '1px solid var(--flagged-border)'
                                        }}
                                        onClick={() => handleReview('flagged')}
                                        disabled={submitting}
                                    >
                                        <AlertTriangle size={16} className="mb-1" />
                                        <span className="text-[10px] uppercase font-bold">Flag</span>
                                    </button>
                                    <button
                                        className="action-reject flex flex-col items-center justify-center p-2 rounded disabled:opacity-50"
                                        onClick={() => handleReview('rejected')}
                                        disabled={submitting}
                                    >
                                        <XCircle size={16} className="mb-1" />
                                        <span className="text-[10px] uppercase font-bold">Reject</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* RIGHT: Content Details */}
                    <div 
                        className="flex flex-col overflow-hidden min-h-0"
                        style={{ backgroundColor: 'var(--bg-card)' }}
                    >
                        {/* Tabs */}
                        <div 
                            className="flex px-6 shrink-0"
                            style={{ borderBottom: '1px solid var(--border-color)' }}
                        >
                            {['details', 'media', 'stats', 'system'].map(tab => (
                                <button
                                    key={tab}
                                    className="px-5 py-3 text-sm font-bold uppercase tracking-wider transition-colors"
                                    style={{
                                        color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
                                        borderBottom: activeTab === tab ? '2px solid var(--accent-primary)' : '2px solid transparent'
                                    }}
                                    onClick={() => setActiveTab(tab)}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {activeTab === 'details' && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        <div className="space-y-1">
                                            <span 
                                                className="block text-xs uppercase font-bold tracking-widest"
                                                style={{ color: 'var(--text-secondary)' }}
                                            >
                                                User
                                            </span>
                                            <span 
                                                className="block font-mono text-sm"
                                                style={{ color: 'var(--text-primary)' }}
                                            >
                                                {item.user}
                                            </span>
                                        </div>
                                        <div className="space-y-1">
                                            <span 
                                                className="block text-xs uppercase font-bold tracking-widest"
                                                style={{ color: 'var(--text-secondary)' }}
                                            >
                                                Visibility
                                            </span>
                                            <span 
                                                className="block font-mono text-sm"
                                                style={{ color: 'var(--text-primary)' }}
                                            >
                                                {item.visibility}
                                            </span>
                                        </div>
                                        <div className="space-y-1">
                                            <span 
                                                className="block text-xs uppercase font-bold tracking-widest"
                                                style={{ color: 'var(--text-secondary)' }}
                                            >
                                                NSFW
                                            </span>
                                            <span 
                                                className="block font-mono text-sm"
                                                style={{ color: item.nsfw ? 'var(--rejected-text)' : 'var(--safe-text)' }}
                                            >
                                                {item.nsfw ? 'YES' : 'NO'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <h4 
                                            className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 pb-2"
                                            style={{ 
                                                color: 'var(--text-secondary)',
                                                borderBottom: '1px solid var(--border-color)'
                                            }}
                                        >
                                            <FileText size={14} /> Description
                                        </h4>
                                        <p 
                                            className="text-sm leading-relaxed"
                                            style={{ color: 'var(--text-primary)' }}
                                        >
                                            {item.description || 'No description provided.'}
                                        </p>
                                    </div>

                                    {item.firstMessage && (
                                        <div className="space-y-2">
                                            <h4 
                                                className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 pb-2"
                                                style={{ 
                                                    color: 'var(--text-secondary)',
                                                    borderBottom: '1px solid var(--border-color)'
                                                }}
                                            >
                                                <MessageSquare size={14} /> First Message
                                            </h4>
                                            <div 
                                                className="p-3 rounded-lg text-sm font-mono whitespace-pre-wrap"
                                                style={{ 
                                                    backgroundColor: 'var(--bg-secondary)',
                                                    border: '1px solid var(--border-color)',
                                                    color: 'var(--text-primary)'
                                                }}
                                            >
                                                {item.firstMessage}
                                            </div>
                                        </div>
                                    )}

                                    {item.tags && item.tags.length > 0 && (
                                        <div className="space-y-2">
                                            <h4 
                                                className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 pb-2"
                                                style={{ 
                                                    color: 'var(--text-secondary)',
                                                    borderBottom: '1px solid var(--border-color)'
                                                }}
                                            >
                                                <Tag size={14} /> Tags
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {item.tags.map((tag, i) => (
                                                    <span 
                                                        key={i} 
                                                        className="px-3 py-1 rounded-full text-xs"
                                                        style={{ 
                                                            backgroundColor: 'var(--bg-secondary)',
                                                            color: 'var(--text-secondary)',
                                                            border: '1px solid var(--border-color)'
                                                        }}
                                                    >
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'media' && (
                                <div className="space-y-6 animate-fade-in">
                                    {item.avatar && (
                                        <div>
                                            <h4 
                                                className="text-xs font-bold uppercase tracking-widest mb-3"
                                                style={{ color: 'var(--text-secondary)' }}
                                            >
                                                Avatar
                                            </h4>
                                            <img 
                                                src={item.avatar} 
                                                alt="Avatar" 
                                                className="max-w-xs rounded-lg shadow-lg"
                                                style={{ border: '1px solid var(--border-color)' }}
                                            />
                                        </div>
                                    )}
                                    {item.cover && (
                                        <div>
                                            <h4 
                                                className="text-xs font-bold uppercase tracking-widest mb-3"
                                                style={{ color: 'var(--text-secondary)' }}
                                            >
                                                Cover Image
                                            </h4>
                                            <img 
                                                src={item.cover} 
                                                alt="Cover" 
                                                className="w-full max-w-2xl rounded-lg shadow-lg"
                                                style={{ border: '1px solid var(--border-color)' }}
                                            />
                                        </div>
                                    )}
                                    {(!item.avatar && !item.cover) && (
                                        <div 
                                            className="flex flex-col items-center justify-center py-16 opacity-50"
                                            style={{ color: 'var(--text-secondary)' }}
                                        >
                                            <Shield size={40} className="mb-3" />
                                            <p className="font-mono text-sm uppercase">No media assets found</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'stats' && (
                                <div className="grid grid-cols-3 gap-4 animate-fade-in">
                                    <div 
                                        className="p-5 rounded-lg text-center"
                                        style={{ 
                                            backgroundColor: 'var(--bg-secondary)',
                                            border: '1px solid var(--border-color)'
                                        }}
                                    >
                                        <Eye size={22} className="mx-auto mb-2" style={{ color: 'var(--text-secondary)' }} />
                                        <span 
                                            className="block text-2xl font-bold font-mono mb-1"
                                            style={{ color: 'var(--text-primary)' }}
                                        >
                                            {item.statistics?.views || 0}
                                        </span>
                                        <span 
                                            className="block text-xs font-bold uppercase tracking-widest"
                                            style={{ color: 'var(--text-secondary)' }}
                                        >
                                            Views
                                        </span>
                                    </div>
                                    <div 
                                        className="p-5 rounded-lg text-center"
                                        style={{ 
                                            backgroundColor: 'var(--bg-secondary)',
                                            border: '1px solid var(--border-color)'
                                        }}
                                    >
                                        <ThumbsUp size={22} className="mx-auto mb-2" style={{ color: 'var(--text-secondary)' }} />
                                        <span 
                                            className="block text-2xl font-bold font-mono mb-1"
                                            style={{ color: 'var(--text-primary)' }}
                                        >
                                            {item.statistics?.likes || 0}
                                        </span>
                                        <span 
                                            className="block text-xs font-bold uppercase tracking-widest"
                                            style={{ color: 'var(--text-secondary)' }}
                                        >
                                            Likes
                                        </span>
                                    </div>
                                    <div 
                                        className="p-5 rounded-lg text-center"
                                        style={{ 
                                            backgroundColor: 'var(--bg-secondary)',
                                            border: '1px solid var(--border-color)'
                                        }}
                                    >
                                        <Activity size={22} className="mx-auto mb-2" style={{ color: 'var(--text-secondary)' }} />
                                        <span 
                                            className="block text-2xl font-bold font-mono mb-1"
                                            style={{ color: 'var(--text-primary)' }}
                                        >
                                            {item.statistics?.chats || item.statistics?.plays || item.statistics?.uses || 0}
                                        </span>
                                        <span 
                                            className="block text-xs font-bold uppercase tracking-widest"
                                            style={{ color: 'var(--text-secondary)' }}
                                        >
                                            {type === 'storylines' ? 'Plays' : type === 'personas' ? 'Uses' : 'Chats'}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'system' && (
                                <div className="space-y-0 animate-fade-in font-mono text-sm">
                                    {[
                                        { label: 'ID', value: item.characterId || item.storylineId || item.personaId },
                                        { label: 'DB_ID', value: item._id },
                                        { label: 'Version', value: item.version || 1 },
                                        { label: 'Created', value: new Date(item.createdAt).toLocaleString() },
                                        { label: 'Updated', value: new Date(item.updatedAt).toLocaleString() },
                                    ].map((row, i) => (
                                        <div 
                                            key={i}
                                            className="grid grid-cols-[120px_1fr] gap-4 p-3 transition-colors"
                                            style={{ borderBottom: '1px solid var(--border-color)' }}
                                        >
                                            <span style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
                                            <span style={{ color: 'var(--text-primary)' }}>{row.value}</span>
                                        </div>
                                    ))}
                                    {item.reviewedBy && (
                                        <>
                                            <div 
                                                className="grid grid-cols-[120px_1fr] gap-4 p-3"
                                                style={{ borderBottom: '1px solid var(--border-color)' }}
                                            >
                                                <span style={{ color: 'var(--text-secondary)' }}>Reviewed By</span>
                                                <span style={{ color: 'var(--flagged-text)', fontWeight: 'bold' }}>{item.reviewedBy}</span>
                                            </div>
                                            <div 
                                                className="grid grid-cols-[120px_1fr] gap-4 p-3"
                                                style={{ borderBottom: '1px solid var(--border-color)' }}
                                            >
                                                <span style={{ color: 'var(--text-secondary)' }}>Review Date</span>
                                                <span style={{ color: 'var(--text-primary)' }}>{new Date(item.reviewedAt).toLocaleString()}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )

    return createPortal(modalContent, document.body)
}

export default ContentDetailModal