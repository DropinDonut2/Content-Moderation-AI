import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

function VolumeLineChart({ data }) {
    if (!data || data.length === 0) {
        return (
            <div className="chart-empty">
                <p>No data available</p>
            </div>
        );
    }

    // Format date for display
    const formattedData = data.map(item => ({
        ...item,
        displayDate: new Date(item.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        })
    }));

    return (
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={formattedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis
                    dataKey="displayDate"
                    stroke="#a0a0b0"
                    tick={{ fill: '#a0a0b0', fontSize: 12 }}
                />
                <YAxis
                    stroke="#a0a0b0"
                    tick={{ fill: '#a0a0b0', fontSize: 12 }}
                />
                <Tooltip
                    contentStyle={{
                        background: '#16213e',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px'
                    }}
                />
                <Legend />
                <Line
                    type="monotone"
                    dataKey="safe"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={false}
                    name="Safe"
                />
                <Line
                    type="monotone"
                    dataKey="flagged"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                    name="Flagged"
                />
                <Line
                    type="monotone"
                    dataKey="rejected"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                    name="Rejected"
                />
            </LineChart>
        </ResponsiveContainer>
    );
}

export default VolumeLineChart;
