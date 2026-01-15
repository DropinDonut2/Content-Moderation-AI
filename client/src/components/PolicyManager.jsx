import { useState, useEffect } from 'react'
import { getPolicies, updatePolicy, deletePolicy, createPolicy } from '../services/api'
import { Plus, Edit2, Trash2, AlertTriangle, ShieldAlert, Shield, ShieldCheck } from 'lucide-react'

// Move initial state outside component to prevent reference error
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

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            <div className="flex justify-between items-end border-b border-white/10 pb-6">
                <div>
                    <h2 className="text-3xl font-bold text-white mb-2 uppercase tracking-tighter">Policy Protocol</h2>
                    <p className="text-text-secondary font-mono text-xs">// CONFIGURE_MODERATION_RULES</p>
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
                    <div className="card-premium p-6 sticky top-6">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 border-b border-white/10 pb-4 uppercase tracking-wide">
                            {editingId ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            {editingId ? 'Edit Configuration' : 'New Definition'}
                        </h3>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs uppercase text-text-secondary font-bold mb-2">Policy ID</label>
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
                                <label className="block text-xs uppercase text-text-secondary font-bold mb-2">Title</label>
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
                                    <label className="block text-xs uppercase text-text-secondary font-bold mb-2">Severity</label>
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
                                    <label className="block text-xs uppercase text-text-secondary font-bold mb-2">Action</label>
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
                                <label className="block text-xs uppercase text-text-secondary font-bold mb-2">Description</label>
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
                                        className="px-4 py-2 border border-white/20 text-text-secondary hover:text-white uppercase text-sm font-medium hover:bg-white/5 transition-colors"
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
                    {policies.map(policy => (
                        <div
                            key={policy._id}
                            className={`card-premium p-6 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between group
                ${editingId === policy._id ? 'border-white bg-white/5' : ''}
              `}
                        >
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="font-mono text-xs px-2 py-1 bg-white/10 text-white border border-white/10">
                                        {policy.policyId}
                                    </span>
                                    <h4 className="font-bold text-white text-lg tracking-tight">{policy.title}</h4>
                                    {policy.severity === 'critical' && (
                                        <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500 text-black text-xs font-bold uppercase">
                                            <AlertTriangle className="w-3 h-3" /> Critical
                                        </span>
                                    )}
                                </div>
                                <p className="text-text-secondary text-sm leading-relaxed mb-4 border-l-2 border-white/10 pl-3">
                                    {policy.description}
                                </p>
                                <div className="flex gap-6 text-xs font-mono text-text-secondary uppercase tracking-wider">
                                    <span className="flex items-center gap-2">
                                        <Shield className="w-3 h-3" />
                                        {policy.category}
                                    </span>
                                    <span className="flex items-center gap-2">
                                        {policy.defaultAction === 'reject' ? <ShieldAlert className="w-3 h-3 text-red-500" /> : <ShieldCheck className="w-3 h-3 text-amber-500" />}
                                        <span className={policy.defaultAction === 'reject' ? 'text-red-500' : 'text-amber-500'}>
                                            {policy.defaultAction}
                                        </span>
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => startEdit(policy)}
                                    className="p-2 hover:bg-white hover:text-black text-text-secondary transition-colors border border-transparent hover:border-white"
                                    title="Edit"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={async () => { if (confirm('Delete?')) { await deletePolicy(policy._id); fetchPolicies(); } }}
                                    className="p-2 hover:bg-red-500 hover:text-black text-text-secondary transition-colors border border-transparent hover:border-red-500"
                                    title="Delete"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default PolicyManager
