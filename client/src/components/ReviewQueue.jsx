import { useState, useEffect } from 'react'
import { getLogs, submitReview } from '../services/api'
import ContentCard from './ContentCard'

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
            const params = filter === 'all' ? {} : { reviewStatus: filter }
            const response = await getLogs(params)
            setLogs(response.data)
        } catch (error) {
            console.error('Failed to fetch logs:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleReview = async (id, status) => {
        try {
            await submitReview(id, { reviewStatus: status })
            fetchLogs()
        } catch (error) {
            console.error('Failed to submit review:', error)
        }
    }

    return (
        <div className="review-queue">
            <div className="page-header">
                <h2>Review Queue</h2>
                <p>Content flagged for human review</p>
            </div>

            <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem' }}>
                <button
                    className={`btn ${filter === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setFilter('pending')}
                >
                    Pending
                </button>
                <button
                    className={`btn ${filter === 'approved' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setFilter('approved')}
                >
                    Approved
                </button>
                <button
                    className={`btn ${filter === 'overridden' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setFilter('overridden')}
                >
                    Overridden
                </button>
                <button
                    className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setFilter('all')}
                >
                    All
                </button>
            </div>

            {loading ? (
                <div className="loading-container">
                    <div className="spinner"></div>
                </div>
            ) : logs.length === 0 ? (
                <div className="empty-state card">
                    <div className="icon">✅</div>
                    <p>No items in queue</p>
                </div>
            ) : (
                <div>
                    {logs.map(log => (
                        <ContentCard
                            key={log._id}
                            log={log}
                            onApprove={() => handleReview(log._id, 'approved')}
                            onOverride={() => handleReview(log._id, 'overridden')}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

export default ReviewQueue
