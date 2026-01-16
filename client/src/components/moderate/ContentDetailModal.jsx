import { useState } from 'react'
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

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'critical': return 'text-red-500'
            case 'high': return 'text-orange-500'
            case 'medium': return 'text-amber-500'
            case 'low': return 'text-green-500'
            default: return 'text-zinc-500'
        }
    }

    const getVerdictColor = (verdict) => {
        switch (verdict) {
            case 'safe': return 'text-green-500'
            case 'flagged': return 'text-amber-500'
            case 'rejected': return 'text-red-500'
            default: return 'text-zinc-500'
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-zinc-950 border border-white/10 w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl rounded-xl overflow-hidden" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-white/10 bg-zinc-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-white mb-1">{item.name || item.title}</h2>
                        <span className="font-mono text-xs text-text-secondary">{item.characterId || item.storylineId || item.personaId}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${item.moderationStatus === 'pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                            item.moderationStatus === 'approved' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                item.moderationStatus === 'rejected' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                    'bg-orange-500/10 text-orange-500 border-orange-500/20'
                            }`}>
                            {item.moderationStatus}
                        </span>
                        {item.nsfw && (
                            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-500/10 text-red-500 border border-red-500/20 flex items-center gap-2">
                                <Shield size={12} /> NSFW
                            </span>
                        )}
                        <button
                            className="p-2 hover:bg-white/10 rounded-full transition-colors text-text-secondary hover:text-white"
                            onClick={onClose}
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Main Content - Split Layout */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-[400px_1fr] overflow-hidden">

                    {/* LEFT: AI Analysis Panel */}
                    <div className="bg-zinc-900/30 border-r border-white/10 p-6 overflow-y-auto flex flex-col gap-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                                <Bot size={16} /> AI Analysis
                            </h3>
                            <button
                                className="px-3 py-1.5 text-xs font-bold border border-white/10 hover:bg-white/10 rounded flex items-center gap-2 transition-colors"
                                onClick={handleRerunModeration}
                                disabled={rerunning}
                            >
                                <RotateCw size={12} className={rerunning ? "animate-spin" : ""} />
                                {rerunning ? 'Analyzing...' : 'Re-run'}
                            </button>
                        </div>

                        {mod.aiVerdict ? (
                            <>
                                <div className="p-4 bg-zinc-900 border border-white/10 rounded-lg">
                                    <p className="text-sm leading-relaxed text-blue-100/90">{mod.aiSummary || mod.aiReasoning}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-zinc-900 border border-white/10 rounded-lg text-center">
                                        <span className="block text-[10px] uppercase text-text-secondary font-bold tracking-widest mb-1">Verdict</span>
                                        <span className={`block font-bold text-sm ${getVerdictColor(mod.aiVerdict)}`}>
                                            {mod.aiVerdict?.toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="p-3 bg-zinc-900 border border-white/10 rounded-lg text-center">
                                        <span className="block text-[10px] uppercase text-text-secondary font-bold tracking-widest mb-1">Confidence</span>
                                        <span className="block font-bold text-sm text-white">
                                            {Math.round((mod.aiConfidence || 0) * 100)}%
                                        </span>
                                    </div>
                                    <div className="p-3 bg-zinc-900 border border-white/10 rounded-lg text-center">
                                        <span className="block text-[10px] uppercase text-text-secondary font-bold tracking-widest mb-1">Priority</span>
                                        <span className={`block font-bold text-sm ${getPriorityColor(mod.humanReviewPriority)}`}>
                                            {mod.humanReviewPriority?.toUpperCase() || 'N/A'}
                                        </span>
                                    </div>
                                    <div className="p-3 bg-zinc-900 border border-white/10 rounded-lg text-center">
                                        <span className="block text-[10px] uppercase text-text-secondary font-bold tracking-widest mb-1">Action</span>
                                        <span className="block font-bold text-sm text-white">
                                            {mod.recommendedAction?.toUpperCase() || 'N/A'}
                                        </span>
                                    </div>
                                </div>

                                {mod.categories && mod.categories.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Categories Analyzed</h4>
                                        <div className="space-y-1">
                                            {mod.categories.map((cat, i) => (
                                                <div key={i} className={`flex items-center justify-between p-2 rounded text-xs ${cat.flagged ? 'bg-red-500/10 border border-red-500/20' : 'bg-zinc-900/50'}`}>
                                                    <span className={cat.flagged ? 'text-red-400 font-bold' : 'text-text-secondary'}>{cat.category}</span>
                                                    <span className="font-mono text-text-secondary">{Math.round(cat.confidence * 100)}%</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {mod.flaggedPolicies && mod.flaggedPolicies.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <AlertTriangle size={12} className="text-amber-500" /> Policy Violations
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {mod.flaggedPolicies.map((pol, i) => (
                                                <span key={i} className="px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded text-[10px] font-bold uppercase tracking-wider">
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
                            <div className="flex flex-col items-center justify-center py-12 text-center text-text-secondary space-y-4">
                                <Bot size={48} className="opacity-20" />
                                <p className="text-sm">No AI analysis available</p>
                                <button
                                    className="btn-premium py-2 px-4"
                                    onClick={handleRerunModeration}
                                    disabled={rerunning}
                                >
                                    <RotateCw size={14} className={`mr-2 ${rerunning ? "animate-spin" : ""}`} />
                                    {rerunning ? 'Analyzing...' : 'Run AI Analysis'}
                                </button>
                            </div>
                        )}

                        {isPending && (
                            <div className="mt-auto bg-zinc-900 border border-white/10 rounded-lg p-4 space-y-3">
                                <h4 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/10 pb-2">Your Decision</h4>
                                {error && <div className="p-2 bg-red-500/20 text-red-500 text-xs rounded border border-red-500/20">{error}</div>}

                                <input
                                    type="text"
                                    placeholder="Reviewer Name *"
                                    value={reviewerName}
                                    onChange={(e) => setReviewerName(e.target.value)}
                                    className="w-full bg-black border border-white/10 rounded p-2 text-sm text-white focus:border-white transition-colors outline-none"
                                />
                                <input
                                    type="text"
                                    placeholder="Rejection Reason (if rejecting)"
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    className="w-full bg-black border border-white/10 rounded p-2 text-sm text-white focus:border-white transition-colors outline-none"
                                />
                                <textarea
                                    placeholder="Internal Notes (Optional)"
                                    value={reviewNotes}
                                    onChange={(e) => setReviewerNotes(e.target.value)}
                                    className="w-full bg-black border border-white/10 rounded p-2 text-sm text-white focus:border-white transition-colors outline-none resize-none h-20"
                                />

                                <div className="grid grid-cols-3 gap-2 pt-2">
                                    <button
                                        className="flex flex-col items-center justify-center p-2 rounded bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500/20 transition-colors disabled:opacity-50"
                                        onClick={() => handleReview('approved')}
                                        disabled={submitting}
                                    >
                                        <Check size={16} className="mb-1" />
                                        <span className="text-[10px] uppercase font-bold">Approve</span>
                                    </button>
                                    <button
                                        className="flex flex-col items-center justify-center p-2 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 transition-colors disabled:opacity-50"
                                        onClick={() => handleReview('flagged')}
                                        disabled={submitting}
                                    >
                                        <AlertTriangle size={16} className="mb-1" />
                                        <span className="text-[10px] uppercase font-bold">Flag</span>
                                    </button>
                                    <button
                                        className="flex flex-col items-center justify-center p-2 rounded bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-50"
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
                    <div className="flex flex-col overflow-hidden bg-black">
                        <div className="flex border-b border-white/10 px-6">
                            {['details', 'media', 'stats', 'system'].map(tab => (
                                <button
                                    key={tab}
                                    className={`
                                        px-6 py-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors
                                        ${activeTab === tab ? 'text-white border-white' : 'text-text-secondary border-transparent hover:text-white hover:border-white/20'}
                                    `}
                                    onClick={() => setActiveTab(tab)}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-y-auto p-8">
                            {activeTab === 'details' && (
                                <div className="space-y-8 animate-fade-in">
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                        <div className="space-y-1"><span className="block text-xs uppercase text-text-secondary font-bold tracking-widest">User</span><span className="block font-mono text-sm">{item.user}</span></div>
                                        <div className="space-y-1"><span className="block text-xs uppercase text-text-secondary font-bold tracking-widest">Language</span><span className="block font-mono text-sm">{item.languageCode}</span></div>
                                        <div className="space-y-1"><span className="block text-xs uppercase text-text-secondary font-bold tracking-widest">Visibility</span><span className="block font-mono text-sm">{item.visibility}</span></div>
                                        <div className="space-y-1"><span className="block text-xs uppercase text-text-secondary font-bold tracking-widest">NSFW</span><span className={`block font-mono text-sm ${item.nsfw ? 'text-red-500' : 'text-green-500'}`}>{item.nsfw ? 'YES' : 'NO'}</span></div>
                                        <div className="space-y-1"><span className="block text-xs uppercase text-text-secondary font-bold tracking-widest">Advanced</span><span className="block font-mono text-sm">{item.advancedMode ? 'YES' : 'NO'}</span></div>
                                        <div className="space-y-1"><span className="block text-xs uppercase text-text-secondary font-bold tracking-widest">Secret</span><span className="block font-mono text-sm">{item.secretMode ? 'YES' : 'NO'}</span></div>
                                    </div>

                                    <div className="space-y-2">
                                        <h4 className="text-xs font-bold text-text-secondary uppercase tracking-widest flex items-center gap-2 border-b border-white/10 pb-2">
                                            <FileText size={14} /> Description
                                        </h4>
                                        <p className="text-sm leading-relaxed text-text-primary">{item.description || 'No description provided.'}</p>
                                    </div>

                                    {item.descriptionSummary && (
                                        <div className="space-y-2">
                                            <h4 className="text-xs font-bold text-text-secondary uppercase tracking-widest flex items-center gap-2 border-b border-white/10 pb-2">
                                                <Layers size={14} /> Summary
                                            </h4>
                                            <p className="text-sm leading-relaxed text-text-primary">{item.descriptionSummary}</p>
                                        </div>
                                    )}

                                    {item.firstMessage && (
                                        <div className="space-y-2">
                                            <h4 className="text-xs font-bold text-text-secondary uppercase tracking-widest flex items-center gap-2 border-b border-white/10 pb-2">
                                                <MessageSquare size={14} /> First Message
                                            </h4>
                                            <div className="p-4 bg-zinc-900 border border-white/10 rounded-lg text-sm font-mono whitespace-pre-wrap">{item.firstMessage}</div>
                                        </div>
                                    )}

                                    {item.exampleDialogue && (
                                        <div className="space-y-2">
                                            <h4 className="text-xs font-bold text-text-secondary uppercase tracking-widest flex items-center gap-2 border-b border-white/10 pb-2">
                                                <MessageSquare size={14} /> Example Dialogue
                                            </h4>
                                            <div className="p-4 bg-zinc-900 border border-white/10 rounded-lg text-sm font-mono whitespace-pre-wrap">{item.exampleDialogue}</div>
                                        </div>
                                    )}

                                    {item.characters && item.characters.length > 0 && (
                                        <div className="space-y-4">
                                            <h4 className="text-xs font-bold text-text-secondary uppercase tracking-widest flex items-center gap-2 border-b border-white/10 pb-2">
                                                <User size={14} /> Characters ({item.characters.length})
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {item.characters.map((char, i) => (
                                                    <div key={i} className="flex items-center gap-3 p-3 bg-zinc-900 border border-white/10 rounded-lg">
                                                        <img
                                                            src={char.avatar || `https://placehold.co/40x40/1a1a1a/white?text=${char.name?.charAt(0)}`}
                                                            alt=""
                                                            className="w-10 h-10 rounded-full object-cover border border-white/10"
                                                        />
                                                        <div>
                                                            <strong className="block text-sm text-white">{char.name}</strong>
                                                            <span className="text-xs text-text-secondary">{char.role}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {item.tags && item.tags.length > 0 && (
                                        <div className="space-y-3">
                                            <h4 className="text-xs font-bold text-text-secondary uppercase tracking-widest flex items-center gap-2 border-b border-white/10 pb-2">
                                                <Tag size={14} /> Tags
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {item.tags.map((tag, i) => (
                                                    <span key={i} className="px-3 py-1 bg-zinc-900 text-text-secondary border border-white/10 rounded-full text-xs hover:border-white/30 transition-colors cursor-default">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'media' && (
                                <div className="space-y-8 animate-fade-in">
                                    {item.avatar && (
                                        <div>
                                            <h4 className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-4">Avatar</h4>
                                            <img src={item.avatar} alt="Avatar" className="max-w-xs rounded-lg border border-white/10 shadow-lg" />
                                        </div>
                                    )}
                                    {item.cover && (
                                        <div>
                                            <h4 className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-4">Cover Image</h4>
                                            <img src={item.cover} alt="Cover" className="w-full max-w-2xl rounded-lg border border-white/10 shadow-lg" />
                                        </div>
                                    )}
                                    {(!item.avatar && !item.cover) && (
                                        <div className="flex flex-col items-center justify-center py-20 text-text-secondary opacity-50">
                                            <Shield size={48} className="mb-4" />
                                            <p className="font-mono text-sm uppercase">No media assets found</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'stats' && (
                                <div className="grid grid-cols-3 gap-6 animate-fade-in">
                                    <div className="p-6 bg-zinc-900 border border-white/10 rounded-lg text-center group hover:border-white/30 transition-colors">
                                        <Eye size={24} className="mx-auto mb-2 text-text-secondary group-hover:text-white transition-colors" />
                                        <span className="block text-3xl font-bold font-mono text-white mb-1">{item.statistics?.views || 0}</span>
                                        <span className="block text-xs font-bold text-text-secondary uppercase tracking-widest">Views</span>
                                    </div>
                                    <div className="p-6 bg-zinc-900 border border-white/10 rounded-lg text-center group hover:border-white/30 transition-colors">
                                        <ThumbsUp size={24} className="mx-auto mb-2 text-text-secondary group-hover:text-white transition-colors" />
                                        <span className="block text-3xl font-bold font-mono text-white mb-1">{item.statistics?.likes || 0}</span>
                                        <span className="block text-xs font-bold text-text-secondary uppercase tracking-widest">Likes</span>
                                    </div>
                                    <div className="p-6 bg-zinc-900 border border-white/10 rounded-lg text-center group hover:border-white/30 transition-colors">
                                        <Activity size={24} className="mx-auto mb-2 text-text-secondary group-hover:text-white transition-colors" />
                                        <span className="block text-3xl font-bold font-mono text-white mb-1">{item.statistics?.chats || item.statistics?.plays || item.statistics?.uses || 0}</span>
                                        <span className="block text-xs font-bold text-text-secondary uppercase tracking-widest">{type === 'storylines' ? 'Plays' : type === 'personas' ? 'Uses' : 'Chats'}</span>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'system' && (
                                <div className="space-y-4 animate-fade-in font-mono text-sm">
                                    <div className="grid grid-cols-[120px_1fr] gap-4 p-3 border-b border-white/10 hover:bg-white/5 transition-colors">
                                        <span className="text-text-secondary">ID</span>
                                        <span className="text-white select-all">{item.characterId || item.storylineId || item.personaId}</span>
                                    </div>
                                    <div className="grid grid-cols-[120px_1fr] gap-4 p-3 border-b border-white/10 hover:bg-white/5 transition-colors">
                                        <span className="text-text-secondary">DB_ID</span>
                                        <span className="text-white select-all">{item._id}</span>
                                    </div>
                                    <div className="grid grid-cols-[120px_1fr] gap-4 p-3 border-b border-white/10 hover:bg-white/5 transition-colors">
                                        <span className="text-text-secondary">Version</span>
                                        <span className="text-white">{item.version || 1}</span>
                                    </div>
                                    <div className="grid grid-cols-[120px_1fr] gap-4 p-3 border-b border-white/10 hover:bg-white/5 transition-colors">
                                        <span className="text-text-secondary">Created</span>
                                        <span className="text-white flex items-center gap-2"><Calendar size={14} /> {new Date(item.createdAt).toLocaleString()}</span>
                                    </div>
                                    <div className="grid grid-cols-[120px_1fr] gap-4 p-3 border-b border-white/10 hover:bg-white/5 transition-colors">
                                        <span className="text-text-secondary">Updated</span>
                                        <span className="text-white flex items-center gap-2"><Calendar size={14} /> {new Date(item.updatedAt).toLocaleString()}</span>
                                    </div>
                                    {item.reviewedBy && (
                                        <>
                                            <div className="grid grid-cols-[120px_1fr] gap-4 p-3 border-b border-white/10 hover:bg-white/5 transition-colors">
                                                <span className="text-text-secondary">Reviewed By</span>
                                                <span className="text-amber-500 font-bold">{item.reviewedBy}</span>
                                            </div>
                                            <div className="grid grid-cols-[120px_1fr] gap-4 p-3 border-b border-white/10 hover:bg-white/5 transition-colors">
                                                <span className="text-text-secondary">Review Date</span>
                                                <span className="text-white flex items-center gap-2"><Calendar size={14} /> {new Date(item.reviewedAt).toLocaleString()}</span>
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
}

export default ContentDetailModal