function ContentCard({ log, onApprove, onOverride }) {
    return (
        <div className="content-card">
            <div className="content-card-header">
                <div>
                    <span className={`badge ${log.verdict}`}>{log.verdict}</span>
                    <span className={`badge ${log.reviewStatus}`} style={{ marginLeft: '0.5rem' }}>
                        {log.reviewStatus}
                    </span>
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    {new Date(log.createdAt).toLocaleString()}
                </div>
            </div>

            <div className="content-card-body">
                {log.content}
            </div>

            <div style={{ marginBottom: '1rem' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                    <strong>AI Reasoning:</strong>
                </div>
                <div style={{ fontSize: '0.875rem' }}>
                    {log.reasoning || 'No reasoning provided'}
                </div>
            </div>

            {log.policyDetails && (
                <div style={{
                    background: 'var(--bg-secondary)',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    fontSize: '0.875rem'
                }}>
                    <strong>Policy Violated:</strong> {log.policyDetails.policyId} - {log.policyDetails.title}
                </div>
            )}

            <div className="content-card-footer">
                <div className="content-card-meta">
                    <span>ID: {log.contentId}</span>
                    <span>Type: {log.contentType}</span>
                    <span>Confidence: {(log.confidence * 100).toFixed(0)}%</span>
                    {log.category && <span>Category: {log.category}</span>}
                </div>

                {log.reviewStatus === 'pending' && (
                    <div className="content-card-actions">
                        <button className="btn btn-success" onClick={onApprove}>
                            ✓ Approve
                        </button>
                        <button className="btn btn-danger" onClick={onOverride}>
                            ✕ Override
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default ContentCard
