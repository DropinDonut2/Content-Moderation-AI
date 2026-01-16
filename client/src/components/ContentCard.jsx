import { useState } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp, User, Layout, FileText, Bot, BookOpen, Theater } from 'lucide-react'

function ContentCard({ log, onReview }) {
    const [expanded, setExpanded] = useState(false)

    const getVerdictStyle = (verdict) => {
        switch (verdict) {
            case 'safe':
                return { 
                    borderColor: 'var(--safe-border)', 
                    color: 'var(--safe-text)',
                    bg: 'var(--safe-bg)',
                    icon: <CheckCircle2 size={16} />
                }
            case 'rejected':
                return { 
                    borderColor: 'var(--rejected-border)', 
                    color: 'var(--rejected-text)',
                    bg: 'var(--rejected-bg)',
                    icon: <XCircle size={16} />
                }
            default:
                return { 
                    borderColor: 'var(--flagged-border)', 
                    color: 'var(--flagged-text)',
                    bg: 'var(--flagged-bg)',
                    icon: <AlertTriangle size={16} />
                }
        }
    }

    const verdictStyle = getVerdictStyle(log.verdict)

    const getTypeIcon = (type) => {
        switch (type) {
            case 'character': return <User size={14} />
            case 'storyline': return <BookOpen size={14} />
            case 'bot': return <Bot size={14} />
            default: return <FileText size={14} />
        }
    }

    return (
        <div 
            className="border-l-4 transition-all duration-200 hover:translate-y-[-2px]"
            style={{ 
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderLeftWidth: '4px',
                borderLeftColor: verdictStyle.borderColor
            }}
        >
            <div className="p-4 flex flex-col gap-4">
                {/* Header Row */}
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <span 
                            className="flex items-center gap-2 px-2 py-1 font-mono text-xs uppercase tracking-wider font-bold"
                            style={{ 
                                backgroundColor: verdictStyle.bg,
                                color: verdictStyle.color,
                                border: `1px solid ${verdictStyle.borderColor}`
                            }}
                        >
                            {verdictStyle.icon} {log.verdict}
                        </span>
                        <span 
                            className="font-mono text-xs"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            ID: {log.contentId || log._id.slice(-8)}
                        </span>
                    </div>
                    <div 
                        className="text-xs font-mono"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        {new Date(log.createdAt).toLocaleString()}
                    </div>
                </div>

                {/* Content Preview */}
                <div>
                    <div 
                        className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        {getTypeIcon(log.contentType)} {log.contentType} Content
                    </div>
                    <div 
                        className={`text-sm font-mono leading-relaxed p-3 ${expanded ? '' : 'line-clamp-3'}`}
                        style={{ 
                            backgroundColor: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)'
                        }}
                    >
                        {log.content}
                    </div>
                </div>

                {/* Toggle Expand */}
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-xs uppercase font-bold tracking-widest flex items-center gap-1 self-start transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                >
                    {expanded ? (
                        <>Less <ChevronUp size={12} /></>
                    ) : (
                        <>More <ChevronDown size={12} /></>
                    )}
                </button>

                {/* AI Insight Section */}
                <div 
                    className="pt-3 grid grid-cols-1 md:grid-cols-2 gap-4"
                    style={{ borderTop: '1px solid var(--border-color)' }}
                >
                    <div>
                        <span 
                            className="block text-[10px] uppercase font-bold mb-1"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            Confidence Score
                        </span>
                        <div 
                            className="w-full h-1.5 mb-1"
                            style={{ backgroundColor: 'var(--border-color)' }}
                        >
                            <div
                                className="h-full"
                                style={{ 
                                    width: `${log.confidence * 100}%`,
                                    backgroundColor: verdictStyle.color
                                }}
                            ></div>
                        </div>
                        <span 
                            className="text-xs font-mono"
                            style={{ color: 'var(--text-primary)' }}
                        >
                            {(log.confidence * 100).toFixed(1)}%
                        </span>
                    </div>

                    {log.policyViolated && (
                        <div>
                            <span 
                                className="block text-[10px] uppercase font-bold mb-1"
                                style={{ color: 'var(--text-secondary)' }}
                            >
                                Violation
                            </span>
                            <span 
                                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold uppercase"
                                style={{ 
                                    backgroundColor: 'var(--rejected-bg)',
                                    color: 'var(--rejected-text)',
                                    border: '1px solid var(--rejected-border)'
                                }}
                            >
                                <AlertTriangle size={10} /> {log.policyViolated.title}
                            </span>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                {log.reviewStatus === 'pending' && (
                    <div 
                        className="flex gap-3 mt-2 pt-4"
                        style={{ borderTop: '1px solid var(--border-color)' }}
                    >
                        <button
                            onClick={() => onReview(log._id, 'approved')}
                            className="action-approve flex-1 py-2"
                        >
                            Approve
                        </button>
                        <button
                            onClick={() => onReview(log._id, 'rejected')}
                            className="action-reject flex-1 py-2"
                        >
                            Reject
                        </button>
                        <button
                            onClick={() => onReview(log._id, 'ignored')}
                            className="action-skip px-4 py-2"
                        >
                            Ignore
                        </button>
                    </div>
                )}

                {log.reviewStatus !== 'pending' && (
                    <div 
                        className="mt-2 pt-2 text-xs font-mono uppercase"
                        style={{ 
                            borderTop: '1px solid var(--border-color)',
                            color: 'var(--text-secondary)'
                        }}
                    >
                        Review Status: <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{log.reviewStatus}</span>
                    </div>
                )}
            </div>
        </div>
    )
}

export default ContentCard