import { useState, useEffect } from 'react'
import { getPolicies, createPolicy, updatePolicy, deletePolicy } from '../services/api'

function PolicyManager() {
    const [policies, setPolicies] = useState([])
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(null)
    const [showForm, setShowForm] = useState(false)

    const emptyPolicy = {
        policyId: '',
        title: '',
        category: 'hate_speech',
        description: '',
        examples: [],
        severity: 'medium',
        defaultAction: 'flag',
        isActive: true
    }

    const [formData, setFormData] = useState(emptyPolicy)

    useEffect(() => {
        fetchPolicies()
    }, [])

    const fetchPolicies = async () => {
        try {
            const response = await getPolicies()
            setPolicies(response.data)
        } catch (error) {
            console.error('Failed to fetch policies:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            const data = {
                ...formData,
                examples: typeof formData.examples === 'string'
                    ? formData.examples.split('\n').filter(e => e.trim())
                    : formData.examples
            }

            if (editing) {
                await updatePolicy(editing, data)
            } else {
                await createPolicy(data)
            }

            setShowForm(false)
            setEditing(null)
            setFormData(emptyPolicy)
            fetchPolicies()
        } catch (error) {
            console.error('Failed to save policy:', error)
            alert('Failed to save policy: ' + error.message)
        }
    }

    const handleEdit = (policy) => {
        setFormData({
            ...policy,
            examples: policy.examples.join('\n')
        })
        setEditing(policy._id)
        setShowForm(true)
    }

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this policy?')) return
        try {
            await deletePolicy(id)
            fetchPolicies()
        } catch (error) {
            console.error('Failed to delete policy:', error)
        }
    }

    const categories = ['hate_speech', 'harassment', 'spam', 'nsfw', 'violence', 'misinformation', 'self_harm', 'illegal']
    const severities = ['low', 'medium', 'high', 'critical']

    if (loading) {
        return <div className="loading-container"><div className="spinner"></div></div>
    }

    return (
        <div className="policy-manager">
            <div className="page-header">
                <h2>Policy Manager</h2>
                <p>Manage content moderation policies</p>
            </div>

            <button
                className="btn btn-primary"
                style={{ marginBottom: '1.5rem' }}
                onClick={() => { setShowForm(!showForm); setEditing(null); setFormData(emptyPolicy); }}
            >
                {showForm ? '✕ Cancel' : '+ Add Policy'}
            </button>

            {showForm && (
                <form onSubmit={handleSubmit} className="card" style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem' }}>{editing ? 'Edit Policy' : 'New Policy'}</h3>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label>Policy ID</label>
                            <input
                                type="text"
                                value={formData.policyId}
                                onChange={(e) => setFormData({ ...formData, policyId: e.target.value })}
                                placeholder="POL-XXX"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Title</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Policy title"
                                required
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label>Category</label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            >
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Severity</label>
                            <select
                                value={formData.severity}
                                onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                            >
                                {severities.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Default Action</label>
                            <select
                                value={formData.defaultAction}
                                onChange={(e) => setFormData({ ...formData, defaultAction: e.target.value })}
                            >
                                <option value="flag">Flag</option>
                                <option value="reject">Reject</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Full policy description..."
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Examples (one per line)</label>
                        <textarea
                            value={formData.examples}
                            onChange={(e) => setFormData({ ...formData, examples: e.target.value })}
                            placeholder="Example violation 1&#10;Example violation 2"
                        />
                    </div>

                    <button type="submit" className="btn btn-primary">
                        {editing ? 'Update Policy' : 'Create Policy'}
                    </button>
                </form>
            )}

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Title</th>
                            <th>Category</th>
                            <th>Severity</th>
                            <th>Action</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {policies.map(policy => (
                            <tr key={policy._id}>
                                <td>{policy.policyId}</td>
                                <td>{policy.title}</td>
                                <td>{policy.category}</td>
                                <td>
                                    <span className={`badge ${policy.severity === 'critical' ? 'rejected' : policy.severity === 'high' ? 'flagged' : 'safe'}`}>
                                        {policy.severity}
                                    </span>
                                </td>
                                <td>{policy.defaultAction}</td>
                                <td>{policy.isActive ? '✅ Active' : '❌ Inactive'}</td>
                                <td>
                                    <button className="btn btn-secondary" style={{ marginRight: '0.5rem', padding: '0.5rem 0.75rem' }} onClick={() => handleEdit(policy)}>
                                        Edit
                                    </button>
                                    <button className="btn btn-danger" style={{ padding: '0.5rem 0.75rem' }} onClick={() => handleDelete(policy._id)}>
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default PolicyManager
