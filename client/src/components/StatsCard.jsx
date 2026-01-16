function StatsCard({ title, value, icon, subtitle, color = "default" }) {
    const getAccentColor = () => {
        switch (color) {
            case 'success': return 'var(--safe-text)'
            case 'warning': return 'var(--flagged-text)'
            case 'danger': return 'var(--rejected-text)'
            default: return 'var(--text-primary)'
        }
    }

    return (
        <div 
            className="p-6 transition-all duration-200 hover:translate-y-[-2px]"
            style={{ 
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)'
            }}
        >
            <div className="flex justify-between items-start mb-4">
                <span 
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: 'var(--text-secondary)' }}
                >
                    {title}
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>
                    {icon}
                </span>
            </div>
            
            <div 
                className="text-3xl font-bold font-mono mb-2"
                style={{ color: getAccentColor() }}
            >
                {value}
            </div>
            
            {subtitle && (
                <div 
                    className="text-[10px] uppercase tracking-widest"
                    style={{ color: 'var(--text-muted)' }}
                >
                    {subtitle}
                </div>
            )}
        </div>
    )
}

export default StatsCard