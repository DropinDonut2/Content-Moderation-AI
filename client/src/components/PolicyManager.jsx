import { useState, useEffect } from 'react'
import { getPolicies, updatePolicy, deletePolicy, createPolicy } from '../services/api'
import { Plus, Edit2, Trash2, AlertTriangle, ShieldAlert, Shield, ShieldCheck } from 'lucide-react'

const initialFormState = {
    policyId: '',
    title: '',
    category: 'hate_speech',
    description: '',
    severity: 'medium',
    defaultAction: 'flag'
}

function PolicyManager() {
    const [policies, setPolicies] = useState([])
    const [loading, setLoading] = useState(true)
    const [editingId, setEditingId] = useState(null)
    const [formData, setFormData] = useState(initialFormState)

    useEffect(() => {
        fetchPolicies()
    }, [])

    const fetchPolicies = async () => {
        setLoading(true)
        try {
            const data = await getPolicies()
            setPolicies(data.data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            if (editingId) {
                await updatePolicy(editingId, formData)
            } else {
                await createPolicy(formData)
            }
            setEditingId(null)
            setFormData(initialFormState)
            fetchPolicies()
        } catch (error) {
            alert('Operation failed')
        }
    }

    const startEdit = (policy) => {
        setEditingId(policy._id)
        setFormData(policy)
    }

    const getSeverityStyle = (severity) => {
        switch (severity) {
            case 'critical': return { color: 'var(--rejected-text)', bg: 'var(--rejected-bg)' }
            case 'high': return { color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)' }
            case 'medium': return { color: 'var(--flagged-text)', bg: 'var(--flagged-bg)' }
            default: return { color: 'var(--safe-text)', bg: 'var(--safe-bg)' }
        }
    }

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            {/* Header */}
            <div 
                className="flex justify-between items-end pb-6"
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
                        // CONFIGURE_MODERATION_RULES
                    </p>
                </div>
                <button
                    onClick={() => { setEditingId(null); setFormData(initialFormState); document.getElementById('policy-form').scrollIntoView({ behavior: 'smooth' }); }}
                    className="btn-primary-new flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> New Policy
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Section */}
                <div id="policy-form" className="lg:col-span-1">
                    <div 
                        className="p-6 sticky top-6"
                        style={{ 
                            backgroundColor: 'var(--bg-card)',
                            border: '1px solid var(--border-color)'
                        }}
                    >
                        <h3 
                            className="text-lg font-bold mb-6 flex items-center gap-2 pb-4 uppercase tracking-wide"
                            style={{ 
                                color: 'var(--text-primary)',
                                borderBottom: '1px solid var(--border-color)'
                            }}
                        >
                            {editingId ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            {editingId ? 'Edit Configuration' : 'New Definition'}
                        </h3>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label 
                                    className="block text-xs uppercase font-bold mb-2"
                                    style={{ color: 'var(--text-secondary)' }}
                                >
                                    Policy ID
                                </label>
                                <input
                                    type="text"
                                    value={formData.policyId}
                                    onChange={e => setFormData({ ...formData, policyId: e.target.value })}
                                    className="input-premium font-mono"
                                    placeholder="POL-000"
                                    required
                                />
                            </div>

                            <div>
                                <label 
                                    className="block text-xs uppercase font-bold mb-2"
                                    style={{ color: 'var(--text-secondary)' }}
                                >
                                    Title
                                </label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="input-premium"
                                    placeholder="e.g. Hate Speech"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label 
                                        className="block text-xs uppercase font-bold mb-2"
                                        style={{ color: 'var(--text-secondary)' }}
                                    >
                                        Severity
                                    </label>
                                    <select
                                        value={formData.severity}
                                        onChange={e => setFormData({ ...formData, severity: e.target.value })}
                                        className="input-premium"
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="critical">Critical</option>
                                    </select>
                                </div>
                                <div>
                                    <label 
                                        className="block text-xs uppercase font-bold mb-2"
                                        style={{ color: 'var(--text-secondary)' }}
                                    >
                                        Action
                                    </label>
                                    <select
                                        value={formData.defaultAction}
                                        onChange={e => setFormData({ ...formData, defaultAction: e.target.value })}
                                        className="input-premium"
                                    >
                                        <option value="flag">Flag</option>
                                        <option value="reject">Reject</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label 
                                    className="block text-xs uppercase font-bold mb-2"
                                    style={{ color: 'var(--text-secondary)' }}
                                >
                                    Description
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="input-premium min-h-[120px] resize-none"
                                    placeholder="Detailed policy description..."
                                    required
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button type="submit" className="flex-1 btn-primary-new">
                                    {editingId ? 'Update' : 'Create'}
                                </button>
                                {editingId && (
                                    <button
                                        type="button"
                                        onClick={() => { setEditingId(null); setFormData(initialFormState); }}
                                        className="btn-secondary px-4 py-2"
                                    >
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>

                {/* List Section */}
                <div className="lg:col-span-2 space-y-4">
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <div className="spinner"></div>
                        </div>
                    ) : (
                        policies.map(policy => {
                            const severityStyle = getSeverityStyle(policy.severity)
                            return (
                                <div
                                    key={policy._id}
                                    className="p-6 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between group transition-all"
                                    style={{ 
                                        backgroundColor: 'var(--bg-card)',
                                        border: editingId === policy._id 
                                            ? '1px solid var(--accent-primary)' 
                                            : '1px solid var(--border-color)'
                                    }}
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-3">
                                            <span 
                                                className="font-mono text-xs px-2 py-1"
                                                style={{ 
                                                    backgroundColor: 'var(--bg-secondary)',
                                                    color: 'var(--text-primary)',
                                                    border: '1px solid var(--border-color)'
                                                }}
                                            >
                                                {policy.policyId}
                                            </span>
                                            <h4 
                                                className="font-bold text-lg tracking-tight"
                                                style={{ color: 'var(--text-primary)' }}
                                            >
                                                {policy.title}
                                            </h4>
                                            {policy.severity === 'critical' && (
                                                <span 
                                                    className="flex items-center gap-1 px-2 py-0.5 text-xs font-bold uppercase"
                                                    style={{ 
                                                        backgroundColor: severityStyle.bg,
                                                        color: severityStyle.color
                                                    }}
                                                >
                                                    <AlertTriangle className="w-3 h-3" /> Critical
                                                </span>
                                            )}
                                        </div>
                                        <p 
                                            className="text-sm leading-relaxed mb-4 pl-3"
                                            style={{ 
                                                color: 'var(--text-secondary)',
                                                borderLeft: '2px solid var(--border-color)'
                                            }}
                                        >
                                            {policy.description}
                                        </p>
                                        <div 
                                            className="flex gap-6 text-xs font-mono uppercase tracking-wider"
                                            style={{ color: 'var(--text-secondary)' }}
                                        >
                                            <span className="flex items-center gap-2">
                                                <Shield className="w-3 h-3" />
                                                {policy.category}
                                            </span>
                                            <span className="flex items-center gap-2">
                                                {policy.defaultAction === 'reject' 
                                                    ? <ShieldAlert className="w-3 h-3" style={{ color: 'var(--rejected-text)' }} /> 
                                                    : <ShieldCheck className="w-3 h-3" style={{ color: 'var(--flagged-text)' }} />
                                                }
                                                <span style={{ 
                                                    color: policy.defaultAction === 'reject' 
                                                        ? 'var(--rejected-text)' 
                                                        : 'var(--flagged-text)' 
                                                }}>
                                                    {policy.defaultAction}
                                                </span>
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => startEdit(policy)}
                                            className="p-2 transition-colors"
                                            style={{ 
                                                color: 'var(--text-secondary)',
                                                border: '1px solid transparent'
                                            }}
                                            title="Edit"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={async () => { 
                                                if (confirm('Delete?')) { 
                                                    await deletePolicy(policy._id)
                                                    fetchPolicies()
                                                } 
                                            }}
                                            className="p-2 transition-colors hover:bg-red-500/10"
                                            style={{ 
                                                color: 'var(--text-secondary)',
                                                border: '1px solid transparent'
                                            }}
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>
        </div>
    )
}

export default PolicyManager