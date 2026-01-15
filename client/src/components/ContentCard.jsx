import { useState } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp, User, Layout, FileText, Bot } from 'lucide-react'

function ContentCard({ log, onReview }) {
    const [expanded, setExpanded] = useState(false)

    const verdictConfig = {
        safe: { color: 'text-green-400', border: 'border-l-green-500', icon: <CheckCircle2 size={16} /> },
        flagged: { color: 'text-amber-400', border: 'border-l-amber-500', icon: <AlertTriangle size={16} /> },
        rejected: { color: 'text-red-500', border: 'border-l-red-500', icon: <XCircle size={16} /> }
    }

    const config = verdictConfig[log.verdict] || verdictConfig['flagged']

    const getTypeIcon = (type) => {
        switch (type) {
            case 'character': return <User size={14} />
            case 'storyline': return <BookOpen size={14} />
            case 'bot': return <Bot size={14} />
            default: return <FileText size={14} />
        }
    }

    return (
        <div className={`card-premium border-l-4 ${config.border}`}>
            <div className="p-4 flex flex-col gap-4">
                {/* Header Row */}
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <span className={`flex items-center gap-2 px-2 py-1 bg-white/5 border border-white/10 font-mono text-xs uppercase tracking-wider font-bold ${config.color}`}>
                            {config.icon} {log.verdict}
                        </span>
                        <span className="font-mono text-xs text-text-secondary">
                            ID: {log.contentId || log._id.slice(-8)}
                        </span>
                    </div>
                    <div className="text-xs text-text-secondary font-mono">
                        {new Date(log.createdAt).toLocaleString()}
                    </div>
                </div>

                {/* Content Preview */}
                <div>
                    <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider text-text-secondary">
                        {getTypeIcon(log.contentType)} {log.contentType} Content
                    </div>
                    <div className={`text-sm font-mono text-text-primary leading-relaxed bg-black p-3 border border-white/10 ${expanded ? '' : 'line-clamp-3'}`}>
                        {log.content}
                    </div>
                </div>

                {/* Toggle Expand */}
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-xs uppercase font-bold tracking-widest text-text-secondary hover:text-white flex items-center gap-1 self-start"
                >
                    {expanded ? (
                        <>Less <ChevronUp size={12} /></>
                    ) : (
                        <>More <ChevronDown size={12} /></>
                    )}
                </button>

                {/* AI Insight Section */}
                <div className="pt-3 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <span className="block text-[10px] uppercase font-bold text-text-secondary mb-1">Confidence Score</span>
                        <div className="w-full bg-white/10 h-1.5 mb-1">
                            <div
                                className={`h-full ${log.verdict === 'safe' ? 'bg-green-500' : log.verdict === 'rejected' ? 'bg-red-500' : 'bg-amber-500'}`}
                                style={{ width: `${log.confidence * 100}%` }}
                            ></div>
                        </div>
                        <span className="text-xs font-mono text-white">{(log.confidence * 100).toFixed(1)}%</span>
                    </div>

                    {log.policyViolated && (
                        <div>
                            <span className="block text-[10px] uppercase font-bold text-text-secondary mb-1">Violation</span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/10 text-red-500 text-xs font-bold uppercase border border-red-500/20">
                                <AlertTriangle size={10} /> {log.policyViolated.title}
                            </span>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                {log.reviewStatus === 'pending' && (
                    <div className="flex gap-3 mt-2 pt-4 border-t border-white/10">
                        <button
                            onClick={() => onReview(log._id, 'approved')}
                            className="flex-1 py-2 bg-green-500 text-black font-bold text-xs uppercase hover:bg-green-400 transition-colors"
                        >
                            Approve
                        </button>
                        <button
                            onClick={() => onReview(log._id, 'rejected')}
                            className="flex-1 py-2 bg-red-500 text-black font-bold text-xs uppercase hover:bg-red-400 transition-colors"
                        >
                            Reject
                        </button>
                        <button
                            onClick={() => onReview(log._id, 'ignored')}
                            className="px-4 py-2 border border-white/10 text-text-secondary hover:text-white hover:bg-white/5 font-bold text-xs uppercase transition-colors"
                        >
                            Ignore
                        </button>
                    </div>
                )}

                {log.reviewStatus !== 'pending' && (
                    <div className="mt-2 pt-2 border-t border-white/10 text-xs font-mono text-text-secondary uppercase">
                        Review Status: <span className="text-white font-bold">{log.reviewStatus}</span>
                    </div>
                )}
            </div>
        </div>
    )
}

export default ContentCard
