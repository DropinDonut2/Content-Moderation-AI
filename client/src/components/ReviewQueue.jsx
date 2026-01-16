import { useState, useEffect } from 'react'
import { getLogs, reviewLog } from '../services/api'
import ContentCard from './ContentCard'
import { Inbox } from 'lucide-react'

function ReviewQueue() {
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('pending')

    useEffect(() => {
        fetchLogs()
    }, [filter])

    const fetchLogs = async () => {
        setLoading(true)
        try {
            const params = filter === 'all' ? { limit: 20 } : { reviewStatus: filter, limit: 20 }
            const response = await getLogs(params)
            setLogs(response.data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleReview = async (id, action) => {
        try {
            await reviewLog(id, { reviewStatus: action, reviewedBy: 'admin' })
            if (filter === 'pending') {
                setLogs(prev => prev.filter(log => log._id !== id))
            } else {
                setLogs(prev => prev.map(log => log._id === id ? { ...log, reviewStatus: action } : log))
            }
        } catch (error) {
            alert('Review failed')
        }
    }

    const tabs = [
        { id: 'pending', label: 'Pending Review' },
        { id: 'all', label: 'All Activity' },
        { id: 'approved', label: 'Approved' },
        { id: 'rejected', label: 'Rejected' }
    ]

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
                        Review Queue
                    </h2>
                    <p className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                        // MANUAL_OVERSIGHT_PROTOCOL
                    </p>
                </div>
            </div>

            <div className="flex flex-col gap-6">
                {/* Filter Tabs */}
                <div 
                    className="flex flex-wrap gap-2 pb-1"
                    style={{ borderBottom: '1px solid var(--border-color)' }}
                >
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setFilter(tab.id)}
                            className="px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all"
                            style={{
                                backgroundColor: filter === tab.id ? 'var(--accent-primary)' : 'transparent',
                                color: filter === tab.id ? 'var(--bg-primary)' : 'var(--text-secondary)',
                                border: filter === tab.id ? '1px solid var(--accent-primary)' : '1px solid transparent'
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content List */}
                {loading ? (
                    <div 
                        className="flex items-center justify-center py-20"
                        style={{ border: '1px dashed var(--border-color)' }}
                    >
                        <div className="spinner"></div>
                    </div>
                ) : logs.length === 0 ? (
                    <div 
                        className="flex flex-col items-center justify-center py-20"
                        style={{ 
                            border: '1px dashed var(--border-color)',
                            backgroundColor: 'var(--bg-hover)'
                        }}
                    >
                        <Inbox size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                        <p 
                            className="font-bold uppercase tracking-widest"
                            style={{ color: 'var(--text-primary)' }}
                        >
                            Queue Empty
                        </p>
                        <p 
                            className="text-xs font-mono mt-2"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            No items match the current filter criteria.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {logs.map(log => (
                            <ContentCard key={log._id} log={log} onReview={handleReview} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default ReviewQueue