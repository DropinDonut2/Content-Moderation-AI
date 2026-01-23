import { useState, useEffect, useRef } from 'react'
import { getPolicyFile, savePolicyFile } from '../services/api'
import { Save, Plus, FileText, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react'

function PolicyManager() {
    const [content, setContent] = useState('')
    const [originalContent, setOriginalContent] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [status, setStatus] = useState(null) // { type: 'success' | 'error', message: '' }
    const textareaRef = useRef(null)

    useEffect(() => {
        fetchPolicyFile()
    }, [])

    const fetchPolicyFile = async () => {
        setLoading(true)
        try {
            const response = await getPolicyFile()
            if (response.success && response.data) {
                setContent(response.data)
                setOriginalContent(response.data)
            }
        } catch (error) {
            console.error(error)
            setStatus({ type: 'error', message: 'Failed to load policy file.' })
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        setStatus(null)
        try {
            const response = await savePolicyFile(content)
            if (response.success) {
                setOriginalContent(content)
                setStatus({ type: 'success', message: 'Policy file saved successfully.' })

                // Clear success message after 3 seconds
                setTimeout(() => setStatus(null), 3000)
            } else {
                throw new Error(response.message || 'Save failed')
            }
        } catch (error) {
            console.error(error)
            setStatus({ type: 'error', message: 'Failed to save policy file.' })
        } finally {
            setSaving(false)
        }
    }

    const appendNewDefinition = () => {
        const template = `

[NEW POLICY SECTION]
[ID]: POL-XXX
[TITLE]: New Policy Title
[SEVERITY]: Medium
[ACTION]: Flag

[DESCRIPTION]:
Enter detailed description of the policy here. Explain what is allowed and what is prohibited.

[EXAMPLES]:
- Violation example 1
- Violation example 2
`
        const newContent = content + template
        setContent(newContent)

        // Scroll to bottom
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.scrollTop = textareaRef.current.scrollHeight
                textareaRef.current.focus()
            }
        }, 100)
    }

    const hasChanges = content !== originalContent

    return (
        <div className="space-y-6 animate-fade-in pb-10 h-full flex flex-col">
            {/* Header */}
            <div
                className="flex justify-between items-end pb-6 flex-shrink-0"
                style={{ borderBottom: '1px solid var(--border-color)' }}
            >
                <div>
                    <h2
                        className="text-3xl font-bold mb-2 uppercase tracking-tighter"
                        style={{ color: 'var(--text-primary)' }}
                    >
                        Policy Protocol
                    </h2>
                    <p className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                        // DIRECT_FILE_EDIT_MODE
                    </p>
                </div>
                <div className="flex gap-3 items-center">
                    {status && (
                        <div className={`text-sm px-3 py-1 rounded flex items-center gap-2 animate-fade-in ${status.type === 'error' ? 'text-red-500 bg-red-500/10' : 'text-green-500 bg-green-500/10'
                            }`}>
                            {status.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                            {status.message}
                        </div>
                    )}

                    <button
                        onClick={appendNewDefinition}
                        className="btn-secondary flex items-center gap-2 px-4 py-2"
                    >
                        <Plus className="w-4 h-4" />
                        New Definition
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={!hasChanges || saving}
                        className={`btn-primary-new flex items-center gap-2 ${saving || !hasChanges ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 flex flex-col relative h-[calc(100vh-180px)] min-h-[600px]">
                {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="spinner"></div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col gap-2">
                        <div className="flex justify-between text-xs uppercase font-bold tracking-wider px-1" style={{ color: 'var(--text-secondary)' }}>
                            <span className="flex items-center gap-2"><FileText className="w-3 h-3" /> content-creation-policy.txt</span>
                            <span>{content.length} characters</span>
                        </div>
                        <textarea
                            ref={textareaRef}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="flex-1 w-full p-6 text-sm font-mono leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] rounded-lg transition-all"
                            style={{
                                backgroundColor: 'var(--bg-card)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-color)',
                                lineHeight: '1.6'
                            }}
                            spellCheck="false"
                        />
                    </div>
                )}
            </div>
        </div>
    )
}

export default PolicyManager