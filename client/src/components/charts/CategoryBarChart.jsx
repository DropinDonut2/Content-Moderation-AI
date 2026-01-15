import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function CategoryBarChart({ data }) {
    if (!data || data.length === 0) {
        return (
            <div className="chart-empty">
                <p>No violations detected</p>
            </div>
        );
    }

    // Format category names for display
    const formattedData = data.map(item => ({
        ...item,
        displayName: item.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
    }));

    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={formattedData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis
                    type="number"
                    stroke="#a0a0b0"
                    tick={{ fill: '#a0a0b0', fontSize: 12 }}
                />
                <YAxis
                    type="category"
                    dataKey="displayName"
                    stroke="#a0a0b0"
                    tick={{ fill: '#a0a0b0', fontSize: 12 }}
                    width={100}
                />
                <Tooltip
                    contentStyle={{
                        background: '#16213e',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px'
                    }}
                    formatter={(value) => [value, 'Count']}
                />
                <Bar
                    dataKey="count"
                    fill="url(#colorGradient)"
                    radius={[0, 4, 4, 0]}
                />
                <defs>
                    <linearGradient id="colorGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#7c3aed" />
                        <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                </defs>
            </BarChart>
        </ResponsiveContainer>
    );
}

export default CategoryBarChart;
