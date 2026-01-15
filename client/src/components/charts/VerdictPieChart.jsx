import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = {
    safe: '#22c55e',
    flagged: '#f59e0b',
    rejected: '#ef4444'
};

function VerdictPieChart({ data }) {
    const chartData = [
        { name: 'Safe', value: data.safe || 0 },
        { name: 'Flagged', value: data.flagged || 0 },
        { name: 'Rejected', value: data.rejected || 0 }
    ].filter(item => item.value > 0);

    if (chartData.length === 0) {
        return (
            <div className="chart-empty">
                <p>No data available</p>
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={300}>
            <PieChart>
                <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                    {chartData.map((entry, index) => (
                        <Cell
                            key={`cell-${index}`}
                            fill={COLORS[entry.name.toLowerCase()]}
                        />
                    ))}
                </Pie>
                <Tooltip />
                <Legend />
            </PieChart>
        </ResponsiveContainer>
    );
}

export default VerdictPieChart;
