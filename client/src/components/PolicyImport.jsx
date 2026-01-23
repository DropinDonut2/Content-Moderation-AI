import { useState } from 'react'
import { 
    Upload, FileText, Save, RefreshCw, 
    Check, AlertTriangle, Trash2 
} from 'lucide-react'

function PolicyImport({ onImportComplete }) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(null)
    
    // Import state
    const [selectedFile, setSelectedFile] = useState(null)
    
    // Preview state
    const [previewPolicies, setPreviewPolicies] = useState(null)
    const [fullPolicies, setFullPolicies] = useState(null)
    
    // Save options
    const [saveMode, setSaveMode] = useState('merge')

    // Import from File
    const handleFileImport = async () => {
        if (!selectedFile) {
            setError('Please select a file')
            return
        }

        setLoading(true)
        setError(null)
        setSuccess(null)

        try {
            const formData = new FormData()
            formData.append('file', selectedFile)

            const response = await fetch('/api/v1/policies/import/file', {
                method: 'POST',
                body: formData
            })

            const data = await response.json()
            
            if (!data.success) {
                throw new Error(data.error || 'Import failed')
            }

            setPreviewPolicies(data.preview)
            setFullPolicies(data.policies)
            setSuccess(`Found ${data.preview.length} policies from ${selectedFile.name}`)

        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    // Save policies to database
    const handleSave = async () => {
        if (!fullPolicies || fullPolicies.length === 0) {
            setError('No policies to save')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const response = await fetch('/api/v1/policies/import/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ policies: fullPolicies, mode: saveMode })
            })

            const data = await response.json()
            
            if (!data.success) {
                throw new Error(data.error || 'Save failed')
            }

            setSuccess(`Saved! Added: ${data.stats.added}, Updated: ${data.stats.updated}${data.stats.deleted ? `, Deleted: ${data.stats.deleted}` : ''}`)
            
            // Clear preview
            setPreviewPolicies(null)
            setFullPolicies(null)
            setSelectedFile(null)
            
            // Notify parent
            if (onImportComplete) {
                onImportComplete()
            }

        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    // Clear preview
    const handleClear = () => {
        setPreviewPolicies(null)
        setFullPolicies(null)
        setSelectedFile(null)
        setError(null)
        setSuccess(null)
    }

    const getSeverityStyle = (severity) => {
        switch (severity) {
            case 'critical': return { color: 'var(--rejected-text)', bg: 'var(--rejected-bg)' }
            case 'high': return { color: 'var(--flagged-text)', bg: 'var(--flagged-bg)' }
            case 'medium': return { color: 'var(--pending-text)', bg: 'var(--pending-bg)' }
            default: return { color: 'var(--safe-text)', bg: 'var(--safe-bg)' }
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h3 
                    className="text-lg font-bold mb-1"
                    style={{ color: 'var(--text-primary)' }}
                >
                    Import Policies
                </h3>
                <p 
                    className="text-sm"
                    style={{ color: 'var(--text-secondary)' }}
                >
                    Upload a policy file (HTML, Markdown, or JSON)
                </p>
            </div>

            {/* File Upload */}
            <div className="space-y-4">
                <div>
                    <label 
                        className="text-xs font-bold uppercase tracking-widest mb-2 block" 
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        Upload Policy File
                    </label>
                    <div 
                        className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors hover:border-opacity-70"
                        style={{ borderColor: 'var(--border-color)' }}
                        onClick={() => document.getElementById('file-input').click()}
                    >
                        <input
                            id="file-input"
                            type="file"
                            accept=".html,.htm,.md,.markdown,.json,.txt"
                            onChange={(e) => {
                                setSelectedFile(e.target.files[0])
                                setError(null)
                            }}
                            className="hidden"
                        />
                        <Upload size={32} className="mx-auto mb-3" style={{ color: 'var(--text-secondary)' }} />
                        {selectedFile ? (
                            <p style={{ color: 'var(--text-primary)' }}>
                                Selected: <strong>{selectedFile.name}</strong>
                            </p>
                        ) : (
                            <p style={{ color: 'var(--text-secondary)' }}>
                                Click to upload HTML, Markdown, or JSON
                            </p>
                        )}
                    </div>
                </div>
                <button
                    onClick={handleFileImport}
                    disabled={loading || !selectedFile}
                    className="btn-primary flex items-center gap-2"
                >
                    {loading ? <RefreshCw size={16} className="animate-spin" /> : <FileText size={16} />}
                    Parse File
                </button>
            </div>

            {/* Messages */}
            {error && (
                <div 
                    className="flex items-center gap-3 p-4 rounded-lg"
                    style={{ backgroundColor: 'var(--rejected-bg)', border: '1px solid var(--rejected-border)' }}
                >
                    <AlertTriangle size={20} style={{ color: 'var(--rejected-text)' }} />
                    <span style={{ color: 'var(--rejected-text)' }}>{error}</span>
                </div>
            )}

            {success && (
                <div 
                    className="flex items-center gap-3 p-4 rounded-lg"
                    style={{ backgroundColor: 'var(--safe-bg)', border: '1px solid var(--safe-border)' }}
                >
                    <Check size={20} style={{ color: 'var(--safe-text)' }} />
                    <span style={{ color: 'var(--safe-text)' }}>{success}</span>
                </div>
            )}

            {/* Preview */}
            {previewPolicies && previewPolicies.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>
                            Preview ({previewPolicies.length} policies)
                        </h4>
                        <button
                            onClick={handleClear}
                            className="flex items-center gap-2 text-xs uppercase"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            <Trash2 size={14} />
                            Clear
                        </button>
                    </div>

                    <div 
                        className="max-h-64 overflow-y-auto rounded-lg"
                        style={{ border: '1px solid var(--border-color)' }}
                    >
                        {previewPolicies.map((policy, i) => {
                            const severityStyle = getSeverityStyle(policy.severity)
                            return (
                                <div 
                                    key={i}
                                    className="flex items-center gap-4 p-3 transition-colors"
                                    style={{ 
                                        borderBottom: i < previewPolicies.length - 1 ? '1px solid var(--border-color)' : 'none',
                                        backgroundColor: 'var(--bg-card)'
                                    }}
                                >
                                    <span 
                                        className="font-mono text-xs px-2 py-1 rounded"
                                        style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
                                    >
                                        {policy.policyId}
                                    </span>
                                    <span className="flex-1 font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                        {policy.title}
                                    </span>
                                    <span 
                                        className="px-2 py-0.5 rounded text-[10px] uppercase font-bold"
                                        style={{ backgroundColor: severityStyle.bg, color: severityStyle.color }}
                                    >
                                        {policy.severity}
                                    </span>
                                    <span 
                                        className="px-2 py-0.5 rounded text-[10px] uppercase"
                                        style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
                                    >
                                        {policy.category}
                                    </span>
                                </div>
                            )
                        })}
                    </div>

                    {/* Save Options */}
                    <div 
                        className="p-4 rounded-lg space-y-4"
                        style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                    >
                        <div>
                            <label 
                                className="text-xs font-bold uppercase tracking-widest mb-2 block" 
                                style={{ color: 'var(--text-secondary)' }}
                            >
                                Save Mode
                            </label>
                            <div className="flex gap-4">
                                {[
                                    { id: 'merge', label: 'Merge', desc: 'Update existing, add new' },
                                    { id: 'replace', label: 'Replace', desc: 'Delete all, import fresh' },
                                    { id: 'append', label: 'Append', desc: 'Add all with new IDs' }
                                ].map(mode => (
                                    <label 
                                        key={mode.id}
                                        className="flex items-start gap-2 cursor-pointer"
                                    >
                                        <input
                                            type="radio"
                                            name="saveMode"
                                            value={mode.id}
                                            checked={saveMode === mode.id}
                                            onChange={(e) => setSaveMode(e.target.value)}
                                            className="mt-1"
                                        />
                                        <div>
                                            <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                                                {mode.label}
                                            </span>
                                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                {mode.desc}
                                            </p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="btn-primary flex items-center gap-2 w-full justify-center"
                        >
                            {loading ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                            Save {previewPolicies.length} Policies
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default PolicyImport