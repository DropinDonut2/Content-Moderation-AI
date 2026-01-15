import { useState, useEffect } from 'react'
import { getLogs, reviewLog } from '../services/api'
import ContentCard from './ContentCard'
import { Filter, Inbox } from 'lucide-react'

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
            // If filtering by pending, use reviewStatus, otherwise show all recent
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
            // Remove from list if in pending view
            if (filter === 'pending') {
                setLogs(prev => prev.filter(log => log._id !== id))
            } else {
                // Just update the status locally
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
            <div className="flex justify-between items-end border-b border-white/10 pb-6">
                <div>
                    <h2 className="text-3xl font-bold text-white mb-2 uppercase tracking-tighter">Review Queue</h2>
                    <p className="text-text-secondary font-mono text-xs">// MANUAL_OVERSIGHT_PROTOCOL</p>
                </div>
            </div>

            <div className="flex flex-col gap-6">
                {/* Filter Tabs */}
                <div className="flex flex-wrap gap-2 border-b border-white/10 pb-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setFilter(tab.id)}
                            className={`
                px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all
                ${filter === tab.id
                                    ? 'bg-white text-black border border-white'
                                    : 'text-text-secondary hover:text-white border border-transparent hover:border-white/20'
                                }
              `}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content List */}
                {loading ? (
                    <div className="flex items-center justify-center py-20 border border-dashed border-white/10">
                        <div className="w-8 h-8 border-2 border-white border-t-transparent animate-spin"></div>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/10 bg-white/5">
                        <Inbox size={48} className="text-white/20 mb-4" />
                        <p className="text-white font-bold uppercase tracking-widest">Queue Empty</p>
                        <p className="text-text-secondary text-xs font-mono mt-2">No items match the current filter criteria.</p>
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
