import { useState, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import SuggestionsPanel from './SuggestionsPanel'
import { reviewCharacter, reviewStoryline, reviewPersona, rerunModeration } from '../../services/api'
import {
    X, AlertTriangle, Shield, Check, XCircle, RotateCw, Bot,
    MessageSquare, User, Tag, Eye, ThumbsUp, Activity,
    Calendar, Layers, FileText, Users, UserCircle, ChevronDown, ChevronUp,
    ZoomIn, ImageIcon, AlertOctagon, AlertCircle, Info, FileWarning, CheckCircle2
} from 'lucide-react'

/**
 * Helper component to render text with highlighted flagged segments
 */
const HighlightedText = ({ text, highlights, fieldName }) => {
    if (!text || !highlights || highlights.length === 0) {
        return <span>{text}</span>
    }

    // Normalize function to handle multiple languages and character variations
    const normalize = (str) => {
        if (!str) return ''
        return str
            .toLowerCase()
            // Normalize Unicode (handles composed vs decomposed characters)
            .normalize('NFKC')
            // Remove accents from Latin characters: é→e, ã→a, ñ→n
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            // Smart quotes → straight quotes
            .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
            .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
            // Full-width characters → half-width (Japanese/Chinese)
            .replace(/[\uFF01-\uFF5E]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
            // Japanese special characters
            .replace(/\u3000/g, ' ')      // Ideographic space → normal space
            .replace(/[・]/g, '·')         // Katakana middle dot
            // Normalize whitespace
            .replace(/\s+/g, ' ')
            .trim()
    }

    // Filter highlights for this specific field
    const fieldHighlights = highlights.filter(h => 
        h.field?.toLowerCase() === fieldName?.toLowerCase() ||
        h.field?.toLowerCase().includes(fieldName?.toLowerCase()) ||
        fieldName?.toLowerCase().includes(h.field?.toLowerCase())
    )

    if (fieldHighlights.length === 0) {
        return <span>{text}</span>
    }

    // Build highlighted text
    let result = []
    let keyIndex = 0
    let lastIndex = 0

    // Normalize the full text for searching
    const normalizedFullText = normalize(text)

    // Sort by position in normalized text
    const sortedHighlights = fieldHighlights
        .map(h => {
            const normalizedQuote = normalize(h.quote)
            const position = normalizedFullText.indexOf(normalizedQuote)
            return { ...h, normalizedQuote, position }
        })
        .filter(h => h.position !== -1)
        .sort((a, b) => a.position - b.position)

    // For each highlight, find it in the original text
    sortedHighlights.forEach((highlight) => {
        const quote = highlight.quote
        if (!quote) return

        const normalizedQuote = normalize(quote)
        
        // Try exact match first
        let startIndex = text.toLowerCase().indexOf(quote.toLowerCase(), lastIndex)
        let matchLength = quote.length
        
        // If exact match fails, try normalized scanning
        if (startIndex === -1) {
            for (let i = lastIndex; i < text.length; i++) {
                for (let len = 1; len <= text.length - i && len <= normalizedQuote.length + 50; len++) {
                    const substring = text.substring(i, i + len)
                    if (normalize(substring) === normalizedQuote) {
                        startIndex = i
                        matchLength = len
                        break
                    }
                }
                if (startIndex !== -1) break
            }
        }

        if (startIndex === -1) return

        // Add text before the highlight
        if (startIndex > lastIndex) {
            result.push(
                <span key={`text-${keyIndex++}`}>
                    {text.substring(lastIndex, startIndex)}
                </span>
            )
        }

        const actualQuote = text.substring(startIndex, startIndex + matchLength)
        
        const severityColors = {
            critical: { bg: 'rgba(239, 68, 68, 0.3)', border: '#ef4444', text: '#fca5a5' },
            high: { bg: 'rgba(249, 115, 22, 0.3)', border: '#f97316', text: '#fdba74' },
            medium: { bg: 'rgba(234, 179, 8, 0.3)', border: '#eab308', text: '#fde047' },
            low: { bg: 'rgba(34, 197, 94, 0.3)', border: '#22c55e', text: '#86efac' }
        }
        const colors = severityColors[highlight.severity] || severityColors.medium

        result.push(
            <mark
                key={`highlight-${keyIndex++}`}
                className="relative group cursor-help px-1 rounded"
                style={{
                    backgroundColor: colors.bg,
                    borderBottom: `2px solid ${colors.border}`,
                    color: 'inherit'
                }}
                title={`${highlight.policy}: ${highlight.reason}`}
            >
                {actualQuote}
                <span 
                    className="absolute bottom-full left-0 mb-2 px-3 py-2 rounded-lg text-xs font-normal opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap max-w-xs"
                    style={{
                        backgroundColor: '#1f1f1f',
                        border: `1px solid ${colors.border}`,
                        color: '#fff',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                    }}
                >
                    <span className="font-bold" style={{ color: colors.text }}>
                        {highlight.policy}
                    </span>
                    <span className="mx-2">•</span>
                    <span className="uppercase text-[10px] font-bold" style={{ color: colors.text }}>
                        {highlight.severity}
                    </span>
                    <br />
                    <span className="text-gray-300">{highlight.reason}</span>
                </span>
            </mark>
        )

        lastIndex = startIndex + matchLength
    })

    // Add remaining text
    if (lastIndex < text.length) {
        result.push(
            <span key={`text-${keyIndex++}`}>
                {text.substring(lastIndex)}
            </span>
        )
    }

    return <>{result}</>
}

function ContentDetailModal({ type, item, onClose, onReviewComplete }) {
    const [scrollToField, setScrollToField] = useState(null)
    const contentAreaRef = useRef(null)
    const [activeTab, setActiveTab] = useState('details')
    const [reviewerName, setReviewerName] = useState('')
    const [reviewNotes, setReviewerNotes] = useState('')
    const [rejectionReason, setRejectionReason] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [rerunning, setRerunning] = useState(false)
    const [error, setError] = useState('')
    const [expandedCharacter, setExpandedCharacter] = useState(null)
    const [expandedPersona, setExpandedPersona] = useState(null)
    const [lightboxImage, setLightboxImage] = useState(null) // For full-size image view

    // Get characters and personas from snapshots or direct arrays
    const characters = item.characterSnapshots?.filter(c => !c.deleted) || item.characters || []
    const personas = item.personaSnapshots?.filter(p => !p.deleted) || item.personas || []

    // Get highlighted issues from moderation result
    const highlightedIssues = useMemo(() => {
        return item.moderationResult?.highlightedIssues || []
    }, [item.moderationResult])

    // Add this useEffect after your other useEffects
    useEffect(() => {
        if (scrollToField && activeTab === 'details') {
            const timer = setTimeout(() => {
                const fieldElement = document.getElementById(`field-${scrollToField.toLowerCase()}`)
                if (fieldElement) {
                    fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    // Add temporary highlight
                    fieldElement.classList.add('ring-2', 'ring-yellow-500')
                    setTimeout(() => {
                        fieldElement.classList.remove('ring-2', 'ring-yellow-500')
                    }, 2000)
                }
                setScrollToField(null)
            }, 100)
            return () => clearTimeout(timer)
        }
    }, [scrollToField, activeTab])

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

    // Add this function
    const handleIssueClick = (fieldName) => {
        setScrollToField(fieldName)
        setActiveTab('details')
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

                                {/* NEW: Highlighted Issues Panel */}
                                {mod.highlightedIssues && mod.highlightedIssues.length > 0 && (
                                    <div className="space-y-3">
                                        <h4
                                            className="text-xs font-bold uppercase tracking-wider flex items-center gap-2"
                                            style={{ color: 'var(--rejected-text)' }}
                                        >
                                            <FileWarning size={14} />
                                            Highlighted Issues ({mod.highlightedIssues.length})
                                        </h4>
                                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                            {mod.highlightedIssues.map((issue, idx) => (
                                                <div
                                                    key={idx}
                                                    className="rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-white/20 transition-all"
                                                    style={{
                                                        backgroundColor: issue.severity === 'critical' 
                                                            ? 'rgba(239, 68, 68, 0.1)' 
                                                            : issue.severity === 'high'
                                                            ? 'rgba(249, 115, 22, 0.1)'
                                                            : 'rgba(234, 179, 8, 0.1)',
                                                        border: `1px solid ${
                                                            issue.severity === 'critical'
                                                            ? 'rgba(239, 68, 68, 0.3)'
                                                            : issue.severity === 'high'
                                                            ? 'rgba(249, 115, 22, 0.3)'
                                                            : 'rgba(234, 179, 8, 0.3)'
                                                        }`
                                                    }}
                                                    onClick={() => handleIssueClick(issue.field)}
                                                    title="Click to view in Details tab"
                                                >
                                                    {/* Issue Header */}
                                                    <div 
                                                        className="px-3 py-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider"
                                                        style={{
                                                            backgroundColor: issue.severity === 'critical'
                                                                ? 'rgba(239, 68, 68, 0.15)'
                                                                : issue.severity === 'high'
                                                                ? 'rgba(249, 115, 22, 0.15)'
                                                                : 'rgba(234, 179, 8, 0.15)',
                                                            color: issue.severity === 'critical'
                                                                ? '#f87171'
                                                                : issue.severity === 'high'
                                                                ? '#fb923c'
                                                                : '#fbbf24'
                                                        }}
                                                    >
                                                        {issue.severity === 'critical' ? (
                                                            <AlertOctagon size={12} />
                                                        ) : issue.severity === 'high' ? (
                                                            <AlertTriangle size={12} />
                                                        ) : (
                                                            <AlertCircle size={12} />
                                                        )}
                                                        <span>{issue.severity}</span>
                                                        <span style={{ color: 'var(--text-secondary)' }}>|</span>
                                                        <span style={{ color: 'var(--text-primary)' }}>{issue.field}</span>
                                                        <span style={{ color: 'var(--text-secondary)' }}>|</span>
                                                        <span>{issue.policy}</span>
                                                    </div>
                                                    
                                                    {/* Quoted Text */}
                                                    <div className="px-3 py-2">
                                                        <div
                                                            className="p-2 rounded text-xs font-mono italic leading-relaxed"
                                                            style={{
                                                                backgroundColor: 'rgba(0,0,0,0.3)',
                                                                color: 'var(--text-primary)',
                                                                borderLeft: `3px solid ${
                                                                    issue.severity === 'critical'
                                                                    ? '#ef4444'
                                                                    : issue.severity === 'high'
                                                                    ? '#f97316'
                                                                    : '#eab308'
                                                                }`
                                                            }}
                                                        >
                                                            "{issue.quote}"
                                                        </div>
                                                        {issue.reason && (
                                                            <p 
                                                                className="mt-2 text-[11px] leading-relaxed"
                                                                style={{ color: 'var(--text-secondary)' }}
                                                            >
                                                                → {issue.reason}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Field Analysis Status (if available) */}
                                {mod.fieldAnalysis && Object.keys(mod.fieldAnalysis).length > 0 && (
                                    <div>
                                        <h4
                                            className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2"
                                            style={{ color: 'var(--text-secondary)' }}
                                        >
                                            <Layers size={12} /> Field Status
                                        </h4>
                                        <div 
                                            className="grid grid-cols-2 gap-1 text-[10px] p-2 rounded-lg"
                                            style={{
                                                backgroundColor: 'var(--bg-card)',
                                                border: '1px solid var(--border-color)'
                                            }}
                                        >
                                            {Object.entries(mod.fieldAnalysis).map(([field, status]) => (
                                                <div 
                                                    key={field}
                                                    className="flex items-center gap-1.5 py-1 px-2 rounded"
                                                    style={{
                                                        backgroundColor: status.status === 'flagged' 
                                                            ? 'rgba(239, 68, 68, 0.1)' 
                                                            : 'transparent'
                                                    }}
                                                >
                                                    {status.status === 'flagged' ? (
                                                        <XCircle size={10} style={{ color: '#f87171' }} />
                                                    ) : (
                                                        <CheckCircle2 size={10} style={{ color: '#4ade80' }} />
                                                    )}
                                                    <span 
                                                        className="truncate font-mono"
                                                        style={{ 
                                                            color: status.status === 'flagged' 
                                                                ? '#f87171' 
                                                                : 'var(--text-secondary)' 
                                                        }}
                                                    >
                                                        {field}
                                                    </span>
                                                    {status.issueCount > 0 && (
                                                        <span 
                                                            className="ml-auto px-1.5 rounded-full font-bold"
                                                            style={{
                                                                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                                                                color: '#f87171',
                                                                fontSize: '9px'
                                                            }}
                                                        >
                                                            {status.issueCount}
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Legacy: Single offending snippet (fallback for old data) */}
                                {!mod.highlightedIssues?.length && mod.offendingSnippet && (
                                    <div>
                                        <h4 
                                            className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2"
                                            style={{ color: 'var(--rejected-text)' }}
                                        >
                                            <AlertTriangle size={12} />
                                            Flagged Segment
                                        </h4>
                                        <div 
                                            className="p-3 rounded-lg text-xs font-mono italic"
                                            style={{
                                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                                borderLeft: '3px solid #ef4444',
                                                color: 'var(--text-primary)'
                                            }}
                                        >
                                            "{mod.offendingSnippet}"
                                        </div>
                                    </div>
                                )}

                                    {/* Full Analysis / AI Reasoning */}
                                    <div>
                                        <h4 
                                            className="text-xs font-bold uppercase tracking-widest mb-2"
                                            style={{ color: 'var(--text-secondary)' }}
                                        >
                                            AI Reasoning
                                        </h4>
                                        <div 
                                            className="p-4 rounded-lg text-sm leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto"
                                            style={{ 
                                                backgroundColor: 'var(--bg-secondary)',
                                                border: '1px solid var(--border-color)',
                                                color: 'var(--text-primary)'
                                            }}
                                        >
                                            {mod.aiReasoning || 'No reasoning provided'}
                                        </div>
                                    </div>

                                    {/* Usage Stats */}
                                    {mod.usage && (
                                        <div>
                                            <h4 
                                                className="text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2"
                                                style={{ color: 'var(--text-secondary)' }}
                                            >
                                                <Activity size={12} />
                                                Usage Stats
                                            </h4>
                                            <div 
                                                className="grid grid-cols-2 sm:grid-cols-4 gap-2"
                                            >
                                                <div 
                                                    className="p-3 rounded-lg text-center"
                                                    style={{ 
                                                        backgroundColor: 'var(--bg-card)',
                                                        border: '1px solid var(--border-color)'
                                                    }}
                                                >
                                                    <span 
                                                        className="block text-base font-bold font-mono"
                                                        style={{ color: 'var(--text-primary)' }}
                                                    >
                                                        {mod.usage.inputTokens?.toLocaleString() || 0}
                                                    </span>
                                                    <span 
                                                        className="block text-[10px] uppercase font-bold tracking-widest"
                                                        style={{ color: 'var(--text-secondary)' }}
                                                    >
                                                        Input
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
                                                        className="block text-base font-bold font-mono"
                                                        style={{ color: 'var(--text-primary)' }}
                                                    >
                                                        {mod.usage.outputTokens?.toLocaleString() || 0}
                                                    </span>
                                                    <span 
                                                        className="block text-[10px] uppercase font-bold tracking-widest"
                                                        style={{ color: 'var(--text-secondary)' }}
                                                    >
                                                        Output
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
                                                        className="block text-base font-bold font-mono"
                                                        style={{ color: 'var(--text-primary)' }}
                                                    >
                                                        {mod.imagesAnalyzed || 0}
                                                    </span>
                                                    <span 
                                                        className="block text-[10px] uppercase font-bold tracking-widest"
                                                        style={{ color: 'var(--text-secondary)' }}
                                                    >
                                                        Images
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
                                                        className="block text-base font-bold font-mono"
                                                        style={{ color: 'var(--safe-text)' }}
                                                    >
                                                        {mod.usage.costFormatted || '$0.00'}
                                                    </span>
                                                    <span 
                                                        className="block text-[10px] uppercase font-bold tracking-widest"
                                                        style={{ color: 'var(--text-secondary)' }}
                                                    >
                                                        Cost
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

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
                        {/* Creator Suggestions & Feedback */}
                        {mod.suggestions && (
                            <div>
                                <h4 
                                    className="text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2"
                                    style={{ color: 'var(--text-secondary)' }}
                                >
                                    {mod.suggestions.type === 'great' ? (
                                        <CheckCircle2 size={12} style={{ color: 'var(--safe-text)' }} />
                                    ) : mod.suggestions.type === 'required_changes' ? (
                                        <AlertOctagon size={12} style={{ color: 'var(--rejected-text)' }} />
                                    ) : (
                                        <Info size={12} style={{ color: 'var(--flagged-text)' }} />
                                    )}
                                    Creator Feedback
                                </h4>
                                
                                {/* Summary Banner */}
                                <div 
                                    className="p-3 rounded-lg mb-3"
                                    style={{ 
                                        backgroundColor: mod.suggestions.type === 'great' 
                                            ? 'var(--safe-bg)' 
                                            : mod.suggestions.type === 'required_changes'
                                                ? 'var(--rejected-bg)'
                                                : 'var(--flagged-bg)',
                                        border: `1px solid ${
                                            mod.suggestions.type === 'great' 
                                                ? 'var(--safe-border)' 
                                                : mod.suggestions.type === 'required_changes'
                                                    ? 'var(--rejected-border)'
                                                    : 'var(--flagged-border)'
                                        }`,
                                        color: mod.suggestions.type === 'great' 
                                            ? 'var(--safe-text)' 
                                            : mod.suggestions.type === 'required_changes'
                                                ? 'var(--rejected-text)'
                                                : 'var(--flagged-text)'
                                    }}
                                >
                                    <span className="font-medium">{mod.suggestions.summary}</span>
                                </div>
                                
                                {/* Suggestion Items */}
                                {mod.suggestions.items && mod.suggestions.items.length > 0 && (
                                    <div className="space-y-2">
                                        {mod.suggestions.items.map((item, idx) => (
                                            <div 
                                                key={idx}
                                                className="p-3 rounded-lg"
                                                style={{ 
                                                    backgroundColor: 'var(--bg-card)',
                                                    border: '1px solid var(--border-color)'
                                                }}
                                            >
                                                <div className="flex items-start gap-3">
                                                    {/* Priority Indicator */}
                                                    <span 
                                                        className="px-2 py-0.5 rounded text-[10px] font-bold uppercase mt-0.5"
                                                        style={{ 
                                                            backgroundColor: item.priority === 'required' 
                                                                ? 'var(--rejected-bg)' 
                                                                : item.priority === 'recommended'
                                                                    ? 'var(--flagged-bg)'
                                                                    : 'var(--bg-secondary)',
                                                            color: item.priority === 'required' 
                                                                ? 'var(--rejected-text)' 
                                                                : item.priority === 'recommended'
                                                                    ? 'var(--flagged-text)'
                                                                    : 'var(--text-secondary)',
                                                            border: `1px solid ${
                                                                item.priority === 'required' 
                                                                    ? 'var(--rejected-border)' 
                                                                    : item.priority === 'recommended'
                                                                        ? 'var(--flagged-border)'
                                                                        : 'var(--border-color)'
                                                            }`
                                                        }}
                                                    >
                                                        {item.priority}
                                                    </span>
                                                    
                                                    <div className="flex-1">
                                                        {/* Field */}
                                                        <span 
                                                            className="text-xs font-mono px-1.5 py-0.5 rounded mr-2"
                                                            style={{ 
                                                                backgroundColor: 'var(--bg-secondary)',
                                                                color: 'var(--text-secondary)'
                                                            }}
                                                        >
                                                            {item.field}
                                                        </span>
                                                        
                                                        {/* Issue (if present) */}
                                                        {item.issue && (
                                                            <p 
                                                                className="text-sm mt-1"
                                                                style={{ color: 'var(--text-secondary)' }}
                                                            >
                                                                {item.issue}
                                                            </p>
                                                        )}
                                                        
                                                        {/* Suggestion */}
                                                        <p 
                                                            className="text-sm mt-1"
                                                            style={{ color: 'var(--text-primary)' }}
                                                        >
                                                             {item.suggestion}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            
                                {/* No suggestions needed */}
                                {mod.suggestions.type === 'great' && (!mod.suggestions.items || mod.suggestions.items.length === 0) && (
                                    <div 
                                        className="p-4 rounded-lg text-center"
                                        style={{ 
                                            backgroundColor: 'var(--bg-card)',
                                            border: '1px solid var(--border-color)'
                                        }}
                                    >
                                        <CheckCircle2 
                                            size={32} 
                                            className="mx-auto mb-2" 
                                            style={{ color: 'var(--safe-text)' }} 
                                        />
                                        <p style={{ color: 'var(--text-primary)' }}>
                                            This content looks great! No changes needed.
                                        </p>
                                    </div>
                                )}
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
                            className="flex px-6 shrink-0 overflow-x-auto"
                            style={{ borderBottom: '1px solid var(--border-color)' }}
                        >
                            {[
                                'details',
                                ...(type === 'storylines' ? ['characters', 'personas'] : []),
                                'media',
                                'stats',
                                'system'
                            ].map(tab => (
                                <button
                                    key={tab}
                                    className="px-5 py-3 text-sm font-bold uppercase tracking-wider transition-colors whitespace-nowrap flex items-center gap-2"
                                    style={{
                                        color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
                                        borderBottom: activeTab === tab ? '2px solid var(--accent-primary)' : '2px solid transparent'
                                    }}
                                    onClick={() => setActiveTab(tab)}
                                >
                                    {tab}
                                    {tab === 'characters' && characters.length > 0 && (
                                        <span
                                            className="px-1.5 py-0.5 text-[10px] rounded-full"
                                            style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
                                        >
                                            {characters.length}
                                        </span>
                                    )}
                                    {tab === 'personas' && personas.length > 0 && (
                                        <span
                                            className="px-1.5 py-0.5 text-[10px] rounded-full"
                                            style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
                                        >
                                            {personas.length}
                                        </span>
                                    )}
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

                                    <div className="space-y-2" id="field-description">
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
                                            <HighlightedText 
                                                text={item.description || 'No description provided.'} 
                                                highlights={highlightedIssues}
                                                fieldName="description"
                                            />
                                        </p>
                                    </div>

                                    {item.plotSummary && (
                                        <div className="space-y-2" id="field-plotsummary">
                                            <h4
                                                className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 pb-2"
                                                style={{
                                                    color: highlightedIssues.some(h => h.field?.toLowerCase().includes('plotsummary')) 
                                                        ? 'var(--rejected-text)' 
                                                        : 'var(--text-secondary)',
                                                    borderBottom: '1px solid var(--border-color)'
                                                }}
                                            >
                                                <FileText size={14} /> Plot Summary
                                                {highlightedIssues.some(h => h.field?.toLowerCase().includes('plotsummary')) && (
                                                    <AlertTriangle size={12} className="text-red-400" />
                                                )}
                                            </h4>
                                            <div
                                                className="p-3 rounded-lg text-sm whitespace-pre-wrap"
                                                style={{
                                                    backgroundColor: 'var(--bg-secondary)',
                                                    border: highlightedIssues.some(h => h.field?.toLowerCase().includes('plotsummary'))
                                                        ? '1px solid rgba(239, 68, 68, 0.4)'
                                                        : '1px solid var(--border-color)',
                                                    color: 'var(--text-primary)'
                                                }}
                                            >
                                                <HighlightedText 
                                                    text={item.plotSummary} 
                                                    highlights={highlightedIssues}
                                                    fieldName="plotSummary"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {item.plot && (
                                        <div className="space-y-2" id="field-plot">
                                            <h4
                                                className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 pb-2"
                                                style={{
                                                    color: highlightedIssues.some(h => h.field?.toLowerCase() === 'plot') 
                                                        ? 'var(--rejected-text)' 
                                                        : 'var(--text-secondary)',
                                                    borderBottom: '1px solid var(--border-color)'
                                                }}
                                            >
                                                <Layers size={14} /> Plot
                                                {highlightedIssues.some(h => h.field?.toLowerCase() === 'plot') && (
                                                    <AlertTriangle size={12} className="text-red-400" />
                                                )}
                                            </h4>
                                            <div
                                                className="p-3 rounded-lg text-sm whitespace-pre-wrap max-h-60 overflow-y-auto"
                                                style={{
                                                    backgroundColor: 'var(--bg-secondary)',
                                                    border: highlightedIssues.some(h => h.field?.toLowerCase() === 'plot')
                                                        ? '1px solid rgba(239, 68, 68, 0.4)'
                                                        : '1px solid var(--border-color)',
                                                    color: 'var(--text-primary)'
                                                }}
                                            >
                                                <HighlightedText 
                                                    text={item.plot} 
                                                    highlights={highlightedIssues}
                                                    fieldName="plot"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {item.promptPlot && (
                                        <div className="space-y-2" id="field-promptplot">
                                            <h4
                                                className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 pb-2"
                                                style={{
                                                    color: highlightedIssues.some(h => h.field?.toLowerCase().includes('promptplot')) 
                                                        ? 'var(--rejected-text)' 
                                                        : 'var(--flagged-text)',
                                                    borderBottom: '1px solid var(--border-color)'
                                                }}
                                            >
                                                <Bot size={14} /> Prompt Plot (AI Instructions)
                                                {highlightedIssues.some(h => h.field?.toLowerCase().includes('promptplot')) && (
                                                    <AlertTriangle size={12} className="text-red-400" />
                                                )}
                                            </h4>
                                            <div
                                                className="p-3 rounded-lg text-sm font-mono whitespace-pre-wrap max-h-60 overflow-y-auto"
                                                style={{
                                                    backgroundColor: highlightedIssues.some(h => h.field?.toLowerCase().includes('promptplot'))
                                                        ? 'rgba(239, 68, 68, 0.1)'
                                                        : 'rgba(234, 179, 8, 0.05)',
                                                    border: highlightedIssues.some(h => h.field?.toLowerCase().includes('promptplot'))
                                                        ? '1px solid rgba(239, 68, 68, 0.4)'
                                                        : '1px solid rgba(234, 179, 8, 0.2)',
                                                    color: 'var(--text-primary)'
                                                }}
                                            >
                                                <HighlightedText 
                                                    text={item.promptPlot} 
                                                    highlights={highlightedIssues}
                                                    fieldName="promptPlot"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {item.firstMessage && (
                                        <div className="space-y-2" id="field-firstmessage">
                                            <h4
                                                className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 pb-2"
                                                style={{
                                                    color: highlightedIssues.some(h => h.field?.toLowerCase().includes('firstmessage')) 
                                                        ? 'var(--rejected-text)' 
                                                        : 'var(--text-secondary)',
                                                    borderBottom: '1px solid var(--border-color)'
                                                }}
                                            >
                                                <MessageSquare size={14} /> First Message
                                                {highlightedIssues.some(h => h.field?.toLowerCase().includes('firstmessage')) && (
                                                    <AlertTriangle size={12} className="text-red-400" />
                                                )}
                                            </h4>
                                            <div
                                                className="p-3 rounded-lg text-sm whitespace-pre-wrap max-h-60 overflow-y-auto"
                                                style={{
                                                    backgroundColor: 'var(--bg-secondary)',
                                                    border: highlightedIssues.some(h => h.field?.toLowerCase().includes('firstmessage'))
                                                        ? '1px solid rgba(239, 68, 68, 0.4)'
                                                        : '1px solid var(--border-color)',
                                                    color: 'var(--text-primary)'
                                                }}
                                            >
                                                <HighlightedText 
                                                    text={item.firstMessage} 
                                                    highlights={highlightedIssues}
                                                    fieldName="firstMessage"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {item.promptGuideline && (
                                        <div className="space-y-2" id="field-description">
                                            <h4
                                                className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 pb-2"
                                                style={{
                                                    color: highlightedIssues.some(h => h.field?.toLowerCase().includes('promptguideline')) 
                                                        ? 'var(--rejected-text)' 
                                                        : 'var(--flagged-text)',
                                                    borderBottom: '1px solid var(--border-color)'
                                                }}
                                            >
                                                <Bot size={14} /> Prompt Guideline (AI Rules)
                                                {highlightedIssues.some(h => h.field?.toLowerCase().includes('promptguideline')) && (
                                                    <AlertTriangle size={12} className="text-red-400" />
                                                )}
                                            </h4>
                                            <div
                                                className="p-3 rounded-lg text-sm font-mono whitespace-pre-wrap max-h-48 overflow-y-auto"
                                                style={{
                                                    backgroundColor: highlightedIssues.some(h => h.field?.toLowerCase().includes('promptguideline'))
                                                        ? 'rgba(239, 68, 68, 0.1)'
                                                        : 'rgba(234, 179, 8, 0.05)',
                                                    border: highlightedIssues.some(h => h.field?.toLowerCase().includes('promptguideline'))
                                                        ? '1px solid rgba(239, 68, 68, 0.4)'
                                                        : '1px solid rgba(234, 179, 8, 0.2)',
                                                    color: 'var(--text-primary)'
                                                }}
                                            >
                                                <HighlightedText 
                                                    text={item.promptGuideline} 
                                                    highlights={highlightedIssues}
                                                    fieldName="promptGuideline"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {item.reminder && (
                                        <div className="space-y-2" id="field-description">
                                            <h4
                                                className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 pb-2"
                                                style={{
                                                    color: highlightedIssues.some(h => h.field?.toLowerCase().includes('reminder')) 
                                                        ? 'var(--rejected-text)' 
                                                        : 'var(--flagged-text)',
                                                    borderBottom: '1px solid var(--border-color)'
                                                }}
                                            >
                                                <Bot size={14} /> Reminder (AI Memory)
                                                {highlightedIssues.some(h => h.field?.toLowerCase().includes('reminder')) && (
                                                    <AlertTriangle size={12} className="text-red-400" />
                                                )}
                                            </h4>
                                            <div
                                                className="p-3 rounded-lg text-sm font-mono whitespace-pre-wrap max-h-48 overflow-y-auto"
                                                style={{
                                                    backgroundColor: highlightedIssues.some(h => h.field?.toLowerCase().includes('reminder'))
                                                        ? 'rgba(239, 68, 68, 0.1)'
                                                        : 'rgba(234, 179, 8, 0.05)',
                                                    border: highlightedIssues.some(h => h.field?.toLowerCase().includes('reminder'))
                                                        ? '1px solid rgba(239, 68, 68, 0.4)'
                                                        : '1px solid rgba(234, 179, 8, 0.2)',
                                                    color: 'var(--text-primary)'
                                                }}
                                            >
                                                <HighlightedText 
                                                    text={item.reminder} 
                                                    highlights={highlightedIssues}
                                                    fieldName="reminder"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Tags - support both tags array and tagSnapshots */}
                                    {((item.tags && item.tags.length > 0) || (item.tagSnapshots && item.tagSnapshots.length > 0)) && (
                                        <div className="space-y-2" id="field-description">
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
                                                {/* Handle tagSnapshots (ISEKAI format) */}
                                                {item.tagSnapshots && item.tagSnapshots.filter(t => !t.deleted).map((tag, i) => (
                                                    <span
                                                        key={`snap-${i}`}
                                                        className="px-3 py-1 rounded-full text-xs"
                                                        style={{
                                                            backgroundColor: tag.nsfw ? 'var(--rejected-bg)' : 'var(--bg-secondary)',
                                                            color: tag.nsfw ? 'var(--rejected-text)' : 'var(--text-secondary)',
                                                            border: `1px solid ${tag.nsfw ? 'var(--rejected-border)' : 'var(--border-color)'}`
                                                        }}
                                                    >
                                                        {tag.name || tag}
                                                    </span>
                                                ))}
                                                {/* Handle simple tags array */}
                                                {!item.tagSnapshots && item.tags && item.tags.map((tag, i) => (
                                                    <span
                                                        key={`tag-${i}`}
                                                        className="px-3 py-1 rounded-full text-xs"
                                                        style={{
                                                            backgroundColor: 'var(--bg-secondary)',
                                                            color: 'var(--text-secondary)',
                                                            border: '1px solid var(--border-color)'
                                                        }}
                                                    >
                                                        {typeof tag === 'string' ? tag : tag.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Characters Tab */}
                            {activeTab === 'characters' && (
                                <div className="space-y-4 animate-fade-in">
                                    {characters.length === 0 ? (
                                        <div
                                            className="flex flex-col items-center justify-center py-16 opacity-50"
                                            style={{ color: 'var(--text-secondary)' }}
                                        >
                                            <Users size={40} className="mb-3" />
                                            <p className="font-mono text-sm uppercase">No characters found</p>
                                            <p className="text-xs mt-2">Character data may not be synced from ISEKAI</p>
                                        </div>
                                    ) : (
                                        characters.map((char, idx) => (
                                            <div
                                                key={char._id || idx}
                                                className="rounded-lg overflow-hidden"
                                                style={{
                                                    backgroundColor: 'var(--bg-secondary)',
                                                    border: '1px solid var(--border-color)'
                                                }}
                                            >
                                                {/* Character Header */}
                                                <button
                                                    className="w-full px-4 py-3 flex items-center gap-4 text-left transition-colors hover:opacity-80"
                                                    onClick={() => setExpandedCharacter(expandedCharacter === idx ? null : idx)}
                                                >
                                                    {/* Larger thumbnail - 64x64 rounded rectangle */}
                                                    {char.cover?.url ? (
                                                        <img
                                                            src={char.cover.url}
                                                            alt={char.name}
                                                            className="w-16 h-16 rounded-lg object-cover shrink-0"
                                                            style={{ border: '2px solid var(--border-color)' }}
                                                        />
                                                    ) : (
                                                        <div
                                                            className="w-16 h-16 rounded-lg flex items-center justify-center shrink-0"
                                                            style={{ backgroundColor: 'var(--bg-card)', border: '2px solid var(--border-color)' }}
                                                        >
                                                            <User size={24} style={{ color: 'var(--text-secondary)' }} />
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <h4
                                                                className="font-bold"
                                                                style={{ color: 'var(--text-primary)' }}
                                                            >
                                                                {char.name || 'Unnamed Character'}
                                                            </h4>
                                                            {char.nsfw && (
                                                                <span
                                                                    className="px-2 py-0.5 text-[10px] font-bold uppercase rounded"
                                                                    style={{
                                                                        backgroundColor: 'var(--rejected-bg)',
                                                                        color: 'var(--rejected-text)'
                                                                    }}
                                                                >
                                                                    NSFW
                                                                </span>
                                                            )}
                                                            {char.status && (
                                                                <span
                                                                    className="px-2 py-0.5 text-[10px] font-bold uppercase rounded"
                                                                    style={{
                                                                        backgroundColor: 'var(--bg-card)',
                                                                        color: 'var(--text-secondary)',
                                                                        border: '1px solid var(--border-color)'
                                                                    }}
                                                                >
                                                                    {char.status}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p
                                                            className="text-xs mt-1 line-clamp-2"
                                                            style={{ color: 'var(--text-secondary)' }}
                                                        >
                                                            {char.descriptionSummary || (char.description ? char.description.substring(0, 150) + '...' : 'No description')}
                                                        </p>
                                                    </div>
                                                    {expandedCharacter === idx ? (
                                                        <ChevronUp size={20} style={{ color: 'var(--text-secondary)' }} />
                                                    ) : (
                                                        <ChevronDown size={20} style={{ color: 'var(--text-secondary)' }} />
                                                    )}
                                                </button>

                                                {/* Expanded Content */}
                                                {expandedCharacter === idx && (
                                                    <div
                                                        className="px-4 py-4 space-y-4"
                                                        style={{ borderTop: '1px solid var(--border-color)' }}
                                                    >
                                                        {/* Large Image Preview Section */}
                                                        {(char.cover?.url || char.media?.length > 0) && (
                                                            <div>
                                                                <h5
                                                                    className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2"
                                                                    style={{ color: 'var(--text-secondary)' }}
                                                                >
                                                                    <ImageIcon size={14} /> Images
                                                                </h5>
                                                                <div className="flex flex-wrap gap-3">
                                                                    {/* Main Cover Image */}
                                                                    {char.cover?.url && (
                                                                        <div
                                                                            className="relative group cursor-pointer"
                                                                            onClick={() => setLightboxImage({ url: char.cover.url, name: char.name, type: 'Cover' })}
                                                                        >
                                                                            <img
                                                                                src={char.cover.url}
                                                                                alt={`${char.name} cover`}
                                                                                className="w-32 h-40 object-cover rounded-lg transition-transform group-hover:scale-105"
                                                                                style={{ border: '2px solid var(--border-color)' }}
                                                                            />
                                                                            <div
                                                                                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                                                                                style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                                                                            >
                                                                                <ZoomIn size={24} style={{ color: 'white' }} />
                                                                            </div>
                                                                            <span
                                                                                className="absolute bottom-1 left-1 px-2 py-0.5 text-[10px] font-bold uppercase rounded"
                                                                                style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: 'white' }}
                                                                            >
                                                                                Cover
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                    {/* Gallery Images */}
                                                                    {char.media?.map((img, imgIdx) => (
                                                                        <div
                                                                            key={imgIdx}
                                                                            className="relative group cursor-pointer"
                                                                            onClick={() => setLightboxImage({ url: img.url, name: char.name, type: img.compositionType || 'Gallery' })}
                                                                        >
                                                                            <img
                                                                                src={img.url}
                                                                                alt={`${char.name} image ${imgIdx + 1}`}
                                                                                className="w-32 h-40 object-cover rounded-lg transition-transform group-hover:scale-105"
                                                                                style={{ border: '2px solid var(--border-color)' }}
                                                                            />
                                                                            <div
                                                                                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                                                                                style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                                                                            >
                                                                                <ZoomIn size={24} style={{ color: 'white' }} />
                                                                            </div>
                                                                            <span
                                                                                className="absolute bottom-1 left-1 px-2 py-0.5 text-[10px] font-bold uppercase rounded"
                                                                                style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: 'white' }}
                                                                            >
                                                                                {img.compositionType || 'Image'}
                                                                            </span>
                                                                            {img.nsfw && (
                                                                                <span
                                                                                    className="absolute top-1 right-1 px-2 py-0.5 text-[10px] font-bold uppercase rounded"
                                                                                    style={{ backgroundColor: 'var(--rejected-bg)', color: 'var(--rejected-text)' }}
                                                                                >
                                                                                    NSFW
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Description Summary */}
                                                            {char.descriptionSummary && (
                                                                <div>
                                                                    <h5
                                                                        className="text-xs font-bold uppercase tracking-widest mb-2"
                                                                        style={{ color: 'var(--text-secondary)' }}
                                                                    >
                                                                        Summary
                                                                    </h5>
                                                                    <div
                                                                        className="text-sm leading-relaxed p-3 rounded-lg"
                                                                        style={{ 
                                                                            color: 'var(--text-primary)',
                                                                            backgroundColor: 'var(--bg-card)',
                                                                            border: '1px solid var(--border-color)'
                                                                        }}
                                                                    >
                                                                        {char.descriptionSummary}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Full Description */}
                                                            {char.description && (
                                                                <div>
                                                                    <h5
                                                                        className="text-xs font-bold uppercase tracking-widest mb-2"
                                                                        style={{ color: 'var(--text-secondary)' }}
                                                                    >
                                                                        Full Description
                                                                    </h5>
                                                                    <div
                                                                        className="text-sm whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto p-3 rounded-lg"
                                                                        style={{ 
                                                                            color: 'var(--text-primary)',
                                                                            backgroundColor: 'var(--bg-card)',
                                                                            border: '1px solid var(--border-color)'
                                                                        }}
                                                                    >
                                                                        {char.description}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Prompt Description (AI Instructions) */}
                                                            {char.promptDescription && (
                                                                <div>
                                                                    <h5
                                                                        className="text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2"
                                                                        style={{ color: 'var(--flagged-text)' }}
                                                                    >
                                                                        <Bot size={14} /> Prompt Description (AI Instructions)
                                                                    </h5>
                                                                    <div
                                                                        className="text-sm font-mono whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto p-3 rounded-lg"
                                                                        style={{ 
                                                                            color: 'var(--text-primary)',
                                                                            backgroundColor: 'rgba(234, 179, 8, 0.05)',
                                                                            border: '1px solid rgba(234, 179, 8, 0.2)'
                                                                        }}
                                                                    >
                                                                        {char.promptDescription}
                                                                    </div>
                                                                </div>
                                                            )}

                                                        {/* Tags */}
                                                        {char.tagSnapshots && char.tagSnapshots.length > 0 && (
                                                            <div>
                                                                <h5
                                                                    className="text-xs font-bold uppercase tracking-widest mb-2"
                                                                    style={{ color: 'var(--text-secondary)' }}
                                                                >
                                                                    Tags ({char.tagSnapshots.filter(t => !t.deleted).length})
                                                                </h5>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {char.tagSnapshots.filter(t => !t.deleted).map((tag, i) => (
                                                                        <span
                                                                            key={i}
                                                                            className="px-2 py-1 rounded text-xs"
                                                                            style={{
                                                                                backgroundColor: tag.nsfw ? 'var(--rejected-bg)' : 'var(--bg-card)',
                                                                                color: tag.nsfw ? 'var(--rejected-text)' : 'var(--text-secondary)',
                                                                                border: '1px solid var(--border-color)'
                                                                            }}
                                                                        >
                                                                            {tag.name}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* Personas Tab */}
                            {activeTab === 'personas' && (
                                <div className="space-y-4 animate-fade-in">
                                    {personas.length === 0 ? (
                                        <div
                                            className="flex flex-col items-center justify-center py-16 opacity-50"
                                            style={{ color: 'var(--text-secondary)' }}
                                        >
                                            <UserCircle size={40} className="mb-3" />
                                            <p className="font-mono text-sm uppercase">No personas found</p>
                                            <p className="text-xs mt-2">Persona data may not be synced from ISEKAI</p>
                                        </div>
                                    ) : (
                                        personas.map((persona, idx) => (
                                            <div
                                                key={persona._id || idx}
                                                className="rounded-lg overflow-hidden"
                                                style={{
                                                    backgroundColor: 'var(--bg-secondary)',
                                                    border: '1px solid var(--border-color)'
                                                }}
                                            >
                                                {/* Persona Header */}
                                                <button
                                                    className="w-full px-4 py-3 flex items-center gap-4 text-left transition-colors hover:opacity-80"
                                                    onClick={() => setExpandedPersona(expandedPersona === idx ? null : idx)}
                                                >
                                                    {/* Larger thumbnail - 64x64 rounded rectangle */}
                                                    {persona.cover?.url ? (
                                                        <img
                                                            src={persona.cover.url}
                                                            alt={persona.name}
                                                            className="w-16 h-16 rounded-lg object-cover shrink-0"
                                                            style={{ border: '2px solid var(--border-color)' }}
                                                        />
                                                    ) : (
                                                        <div
                                                            className="w-16 h-16 rounded-lg flex items-center justify-center shrink-0"
                                                            style={{ backgroundColor: 'var(--bg-card)', border: '2px solid var(--border-color)' }}
                                                        >
                                                            <UserCircle size={24} style={{ color: 'var(--text-secondary)' }} />
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <h4
                                                                className="font-bold"
                                                                style={{ color: 'var(--text-primary)' }}
                                                            >
                                                                {persona.name || 'Unnamed Persona'}
                                                            </h4>
                                                            {persona.nsfw && (
                                                                <span
                                                                    className="px-2 py-0.5 text-[10px] font-bold uppercase rounded"
                                                                    style={{
                                                                        backgroundColor: 'var(--rejected-bg)',
                                                                        color: 'var(--rejected-text)'
                                                                    }}
                                                                >
                                                                    NSFW
                                                                </span>
                                                            )}
                                                            {persona.status && (
                                                                <span
                                                                    className="px-2 py-0.5 text-[10px] font-bold uppercase rounded"
                                                                    style={{
                                                                        backgroundColor: 'var(--bg-card)',
                                                                        color: 'var(--text-secondary)',
                                                                        border: '1px solid var(--border-color)'
                                                                    }}
                                                                >
                                                                    {persona.status}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p
                                                            className="text-xs mt-1 line-clamp-2"
                                                            style={{ color: 'var(--text-secondary)' }}
                                                        >
                                                            {persona.descriptionSummary || (persona.description ? persona.description.substring(0, 150) + '...' : 'No description')}
                                                        </p>
                                                    </div>
                                                    {expandedPersona === idx ? (
                                                        <ChevronUp size={20} style={{ color: 'var(--text-secondary)' }} />
                                                    ) : (
                                                        <ChevronDown size={20} style={{ color: 'var(--text-secondary)' }} />
                                                    )}
                                                </button>

                                                {/* Expanded Content */}
                                                {expandedPersona === idx && (
                                                    <div
                                                        className="px-4 py-4 space-y-4"
                                                        style={{ borderTop: '1px solid var(--border-color)' }}
                                                    >
                                                        {/* Large Image Preview Section */}
                                                        {(persona.cover?.url || persona.media?.length > 0) && (
                                                            <div>
                                                                <h5
                                                                    className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2"
                                                                    style={{ color: 'var(--text-secondary)' }}
                                                                >
                                                                    <ImageIcon size={14} /> Images
                                                                </h5>
                                                                <div className="flex flex-wrap gap-3">
                                                                    {/* Main Cover Image */}
                                                                    {persona.cover?.url && (
                                                                        <div
                                                                            className="relative group cursor-pointer"
                                                                            onClick={() => setLightboxImage({ url: persona.cover.url, name: persona.name, type: 'Cover' })}
                                                                        >
                                                                            <img
                                                                                src={persona.cover.url}
                                                                                alt={`${persona.name} cover`}
                                                                                className="w-32 h-40 object-cover rounded-lg transition-transform group-hover:scale-105"
                                                                                style={{ border: '2px solid var(--border-color)' }}
                                                                            />
                                                                            <div
                                                                                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                                                                                style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                                                                            >
                                                                                <ZoomIn size={24} style={{ color: 'white' }} />
                                                                            </div>
                                                                            <span
                                                                                className="absolute bottom-1 left-1 px-2 py-0.5 text-[10px] font-bold uppercase rounded"
                                                                                style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: 'white' }}
                                                                            >
                                                                                Cover
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                    {/* Gallery Images */}
                                                                    {persona.media?.map((img, imgIdx) => (
                                                                        <div
                                                                            key={imgIdx}
                                                                            className="relative group cursor-pointer"
                                                                            onClick={() => setLightboxImage({ url: img.url, name: persona.name, type: img.compositionType || 'Gallery' })}
                                                                        >
                                                                            <img
                                                                                src={img.url}
                                                                                alt={`${persona.name} image ${imgIdx + 1}`}
                                                                                className="w-32 h-40 object-cover rounded-lg transition-transform group-hover:scale-105"
                                                                                style={{ border: '2px solid var(--border-color)' }}
                                                                            />
                                                                            <div
                                                                                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                                                                                style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                                                                            >
                                                                                <ZoomIn size={24} style={{ color: 'white' }} />
                                                                            </div>
                                                                            <span
                                                                                className="absolute bottom-1 left-1 px-2 py-0.5 text-[10px] font-bold uppercase rounded"
                                                                                style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: 'white' }}
                                                                            >
                                                                                {img.compositionType || 'Image'}
                                                                            </span>
                                                                            {img.nsfw && (
                                                                                <span
                                                                                    className="absolute top-1 right-1 px-2 py-0.5 text-[10px] font-bold uppercase rounded"
                                                                                    style={{ backgroundColor: 'var(--rejected-bg)', color: 'var(--rejected-text)' }}
                                                                                >
                                                                                    NSFW
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Description */}
                                                        {persona.description && (
                                                            <div>
                                                                <h5
                                                                    className="text-xs font-bold uppercase tracking-widest mb-2"
                                                                    style={{ color: 'var(--text-secondary)' }}
                                                                >
                                                                    Full Description
                                                                </h5>
                                                                <div
                                                                    className="text-sm whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto p-3 rounded-lg"
                                                                    style={{ 
                                                                        color: 'var(--text-primary)',
                                                                        backgroundColor: 'var(--bg-card)',
                                                                        border: '1px solid var(--border-color)'
                                                                    }}
                                                                >
                                                                    {persona.description}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Tags */}
                                                        {persona.tagSnapshots && persona.tagSnapshots.length > 0 && (
                                                            <div>
                                                                <h5
                                                                    className="text-xs font-bold uppercase tracking-widest mb-2"
                                                                    style={{ color: 'var(--text-secondary)' }}
                                                                >
                                                                    Tags ({persona.tagSnapshots.filter(t => !t.deleted).length})
                                                                </h5>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {persona.tagSnapshots.filter(t => !t.deleted).map((tag, i) => (
                                                                        <span
                                                                            key={i}
                                                                            className="px-2 py-1 rounded text-xs"
                                                                            style={{
                                                                                backgroundColor: tag.nsfw ? 'var(--rejected-bg)' : 'var(--bg-card)',
                                                                                color: tag.nsfw ? 'var(--rejected-text)' : 'var(--text-secondary)',
                                                                                border: '1px solid var(--border-color)'
                                                                            }}
                                                                        >
                                                                            {tag.name}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))
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

            {/* Lightbox for Full-Size Image Viewing */}
            {lightboxImage && (
                <div
                    className="fixed inset-0 flex items-center justify-center p-4"
                    style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.95)',
                        zIndex: 100001
                    }}
                    onClick={() => setLightboxImage(null)}
                >
                    <div className="relative max-w-5xl max-h-[90vh] flex flex-col items-center">
                        {/* Close Button */}
                        <button
                            className="absolute -top-12 right-0 p-2 rounded-full transition-colors hover:bg-white/10"
                            style={{ color: 'white' }}
                            onClick={() => setLightboxImage(null)}
                        >
                            <X size={32} />
                        </button>

                        {/* Image Info Header */}
                        <div
                            className="absolute -top-12 left-0 flex items-center gap-3"
                            style={{ color: 'white' }}
                        >
                            <span className="font-bold text-lg">{lightboxImage.name}</span>
                            <span
                                className="px-2 py-1 text-xs font-bold uppercase rounded"
                                style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                            >
                                {lightboxImage.type}
                            </span>
                        </div>

                        {/* Full Size Image */}
                        <img
                            src={lightboxImage.url}
                            alt={`${lightboxImage.name} - ${lightboxImage.type}`}
                            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                            style={{ border: '2px solid rgba(255,255,255,0.2)' }}
                            onClick={(e) => e.stopPropagation()}
                        />

                        {/* Image URL (for debugging/reference) */}
                        <div
                            className="mt-4 px-4 py-2 rounded-lg text-xs font-mono truncate max-w-full"
                            style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
                        >
                            {lightboxImage.url}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )

    return createPortal(modalContent, document.body)
}

export default ContentDetailModal