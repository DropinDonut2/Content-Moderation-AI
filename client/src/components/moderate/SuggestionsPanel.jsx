import { useState } from 'react'
import { 
    MessageSquare, Edit3, Send, Check, X, AlertTriangle, 
    Info, AlertCircle, Lightbulb, Copy, ChevronDown, ChevronUp 
} from 'lucide-react'

/**
 * SuggestionsPanel - Shows AI-generated suggestions that moderators can edit
 * and send as feedback to creators
 */
function SuggestionsPanel({ suggestions = [], onSendFeedback, contentName }) {
    const [expandedIndex, setExpandedIndex] = useState(null)
    const [editingIndex, setEditingIndex] = useState(null)
    const [editedSuggestions, setEditedSuggestions] = useState({})
    const [selectedForSend, setSelectedForSend] = useState([])
    const [customMessage, setCustomMessage] = useState('')
    const [sending, setSending] = useState(false)

    if (!suggestions || suggestions.length === 0) {
        return (
            <div 
                className="p-6 text-center"
                style={{ color: 'var(--text-secondary)' }}
            >
                <Lightbulb size={32} className="mx-auto mb-3 opacity-50" />
                <p className="text-sm">No suggestions generated</p>
                <p className="text-xs mt-1">AI didn't find any issues to report</p>
            </div>
        )
    }

    const getTypeIcon = (type) => {
        switch (type) {
            case 'error':
            case 'critical':
                return <AlertCircle size={16} style={{ color: 'var(--rejected-text)' }} />
            case 'warning':
                return <AlertTriangle size={16} style={{ color: 'var(--flagged-text)' }} />
            case 'suggestion':
            case 'info':
                return <Info size={16} style={{ color: 'var(--text-secondary)' }} />
            default:
                return <Lightbulb size={16} style={{ color: 'var(--text-secondary)' }} />
        }
    }

    const getTypeStyle = (type) => {
        switch (type) {
            case 'error':
            case 'critical':
                return { bg: 'var(--rejected-bg)', border: 'var(--rejected-border)', text: 'var(--rejected-text)' }
            case 'warning':
                return { bg: 'var(--flagged-bg)', border: 'var(--flagged-border)', text: 'var(--flagged-text)' }
            default:
                return { bg: 'var(--bg-secondary)', border: 'var(--border-color)', text: 'var(--text-secondary)' }
        }
    }

    const handleEdit = (index, field, value) => {
        setEditedSuggestions(prev => ({
            ...prev,
            [index]: {
                ...(prev[index] || suggestions[index]),
                [field]: value
            }
        }))
    }

    const getSuggestion = (index) => {
        return editedSuggestions[index] || suggestions[index]
    }

    const toggleSelect = (index) => {
        setSelectedForSend(prev => 
            prev.includes(index) 
                ? prev.filter(i => i !== index)
                : [...prev, index]
        )
    }

    const selectAll = () => {
        if (selectedForSend.length === suggestions.length) {
            setSelectedForSend([])
        } else {
            setSelectedForSend(suggestions.map((_, i) => i))
        }
    }

    const handleSendFeedback = async () => {
        if (selectedForSend.length === 0 && !customMessage.trim()) {
            return
        }

        setSending(true)
        try {
            const feedbackItems = selectedForSend.map(i => getSuggestion(i))
            await onSendFeedback({
                suggestions: feedbackItems,
                customMessage: customMessage.trim(),
                contentName
            })
            // Clear selection after sending
            setSelectedForSend([])
            setCustomMessage('')
        } catch (err) {
            console.error('Failed to send feedback:', err)
        } finally {
            setSending(false)
        }
    }

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text)
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h4 
                    className="text-xs font-bold uppercase tracking-widest flex items-center gap-2"
                    style={{ color: 'var(--text-secondary)' }}
                >
                    <MessageSquare size={14} />
                    AI Suggestions ({suggestions.length})
                </h4>
                <button
                    onClick={selectAll}
                    className="text-xs uppercase tracking-wider px-2 py-1 rounded transition-colors"
                    style={{ 
                        color: 'var(--text-secondary)',
                        backgroundColor: 'var(--bg-secondary)'
                    }}
                >
                    {selectedForSend.length === suggestions.length ? 'Deselect All' : 'Select All'}
                </button>
            </div>

            {/* Suggestions List */}
            <div className="space-y-2">
                {suggestions.map((suggestion, index) => {
                    const current = getSuggestion(index)
                    const typeStyle = getTypeStyle(current.type)
                    const isExpanded = expandedIndex === index
                    const isEditing = editingIndex === index
                    const isSelected = selectedForSend.includes(index)

                    return (
                        <div
                            key={index}
                            className="rounded-lg overflow-hidden transition-all"
                            style={{ 
                                border: `1px solid ${isSelected ? 'var(--accent-primary)' : typeStyle.border}`,
                                backgroundColor: typeStyle.bg
                            }}
                        >
                            {/* Header Row */}
                            <div 
                                className="flex items-center gap-3 p-3 cursor-pointer"
                                onClick={() => setExpandedIndex(isExpanded ? null : index)}
                            >
                                {/* Checkbox */}
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                        e.stopPropagation()
                                        toggleSelect(index)
                                    }}
                                    className="w-4 h-4 rounded"
                                    style={{ accentColor: 'var(--accent-primary)' }}
                                />

                                {/* Type Icon */}
                                {getTypeIcon(current.type)}

                                {/* Field Badge */}
                                {current.field && (
                                    <span 
                                        className="px-2 py-0.5 rounded text-[10px] uppercase font-mono"
                                        style={{ 
                                            backgroundColor: 'var(--bg-primary)',
                                            color: 'var(--text-secondary)'
                                        }}
                                    >
                                        {current.field}
                                    </span>
                                )}

                                {/* Issue */}
                                <span 
                                    className="flex-1 text-sm truncate"
                                    style={{ color: typeStyle.text }}
                                >
                                    {current.issue}
                                </span>

                                {/* Expand Icon */}
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </div>

                            {/* Expanded Content */}
                            {isExpanded && (
                                <div 
                                    className="p-4 space-y-4"
                                    style={{ 
                                        borderTop: `1px solid ${typeStyle.border}`,
                                        backgroundColor: 'var(--bg-card)'
                                    }}
                                >
                                    {/* Issue Detail */}
                                    <div>
                                        <label className="text-[10px] uppercase tracking-widest font-bold mb-1 block" style={{ color: 'var(--text-secondary)' }}>
                                            Issue
                                        </label>
                                        {isEditing ? (
                                            <textarea
                                                value={current.issue}
                                                onChange={(e) => handleEdit(index, 'issue', e.target.value)}
                                                className="input-premium w-full text-sm"
                                                rows={2}
                                            />
                                        ) : (
                                            <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                                                {current.issue}
                                            </p>
                                        )}
                                    </div>

                                    {/* Suggestion for Creator */}
                                    <div>
                                        <label className="text-[10px] uppercase tracking-widest font-bold mb-1 block" style={{ color: 'var(--text-secondary)' }}>
                                            Message to Creator
                                        </label>
                                        {isEditing ? (
                                            <textarea
                                                value={current.suggestion}
                                                onChange={(e) => handleEdit(index, 'suggestion', e.target.value)}
                                                className="input-premium w-full text-sm"
                                                rows={3}
                                            />
                                        ) : (
                                            <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                                                {current.suggestion}
                                            </p>
                                        )}
                                    </div>

                                    {/* Example Fix */}
                                    {current.exampleFix && (
                                        <div>
                                            <label className="text-[10px] uppercase tracking-widest font-bold mb-1 block" style={{ color: 'var(--text-secondary)' }}>
                                                Example Fix
                                            </label>
                                            <div 
                                                className="p-2 rounded font-mono text-xs"
                                                style={{ 
                                                    backgroundColor: 'var(--bg-secondary)',
                                                    color: 'var(--safe-text)'
                                                }}
                                            >
                                                {current.exampleFix}
                                            </div>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex gap-2 pt-2">
                                        {isEditing ? (
                                            <>
                                                <button
                                                    onClick={() => setEditingIndex(null)}
                                                    className="flex items-center gap-1 px-3 py-1.5 rounded text-xs uppercase"
                                                    style={{ 
                                                        backgroundColor: 'var(--safe-bg)',
                                                        color: 'var(--safe-text)'
                                                    }}
                                                >
                                                    <Check size={12} /> Done
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setEditedSuggestions(prev => {
                                                            const copy = { ...prev }
                                                            delete copy[index]
                                                            return copy
                                                        })
                                                        setEditingIndex(null)
                                                    }}
                                                    className="flex items-center gap-1 px-3 py-1.5 rounded text-xs uppercase"
                                                    style={{ color: 'var(--text-secondary)' }}
                                                >
                                                    <X size={12} /> Cancel
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => setEditingIndex(index)}
                                                    className="flex items-center gap-1 px-3 py-1.5 rounded text-xs uppercase"
                                                    style={{ 
                                                        backgroundColor: 'var(--bg-secondary)',
                                                        color: 'var(--text-primary)'
                                                    }}
                                                >
                                                    <Edit3 size={12} /> Edit
                                                </button>
                                                <button
                                                    onClick={() => copyToClipboard(current.suggestion)}
                                                    className="flex items-center gap-1 px-3 py-1.5 rounded text-xs uppercase"
                                                    style={{ 
                                                        backgroundColor: 'var(--bg-secondary)',
                                                        color: 'var(--text-secondary)'
                                                    }}
                                                >
                                                    <Copy size={12} /> Copy
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Custom Message */}
            <div>
                <label className="text-xs font-bold uppercase tracking-widest mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                    Additional Message (Optional)
                </label>
                <textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Add any additional feedback for the creator..."
                    className="input-premium w-full text-sm"
                    rows={3}
                />
            </div>

            {/* Send Button */}
            {onSendFeedback && (
                <button
                    onClick={handleSendFeedback}
                    disabled={sending || (selectedForSend.length === 0 && !customMessage.trim())}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                >
                    {sending ? (
                        <span className="animate-spin">⏳</span>
                    ) : (
                        <Send size={16} />
                    )}
                    Send Feedback to Creator
                    {selectedForSend.length > 0 && ` (${selectedForSend.length} items)`}
                </button>
            )}
        </div>
    )
}

export default SuggestionsPanel
