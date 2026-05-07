import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import { Expense } from '../types';

const COLORS = ['#ff9264', '#6ce3cf', '#ffd17d', '#a78bfa', '#60a5fa', '#f472b6', '#9ca3af'];

interface AnalyticsChartsProps {
  expenses: Expense[];
  formatINR: (amount: number) => string;
}

export function AnalyticsCharts({ expenses, formatINR }: AnalyticsChartsProps) {
  const monthlyData = getMonthlyTrend(expenses);
  const categoryData = getCategoryData(expenses);

  // Tooltip formatter
  const tooltipFormatter = (value: any) => {
    return [formatINR(Number(value)), 'Amount'] as [string, string];
  };

  // Pie label renderer - fixed TypeScript types
  const renderPieLabel = (props: PieLabelRenderProps) => {
    const { name, percent } = props;
    if (name === undefined || percent === undefined) return '';
    return `${name} ${(percent * 100).toFixed(0)}%`;
  };

  return (
    <div style={{ display: 'grid', gap: '1.5rem', marginTop: '1.5rem' }}>
      {/* Monthly Trend Bar Chart */}
      <div className="chart-card" style={{ padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem' }}>Monthly Spending Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="month" stroke="#c6b8a5" />
            <YAxis stroke="#c6b8a5" tickFormatter={(v) => `₹${v}`} />
            <Tooltip 
              formatter={tooltipFormatter}
              contentStyle={{ background: '#1f1a16', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
            />
            <Bar dataKey="amount" fill="#ff9264" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Category Distribution Pie Chart */}
      <div className="chart-card" style={{ padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem' }}>Category Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={categoryData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey="amount"
              nameKey="category"
              label={renderPieLabel}
            >
              {categoryData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={tooltipFormatter} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Spending Velocity Line Chart */}
      <div className="chart-card" style={{ padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem' }}>Spending Velocity</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="month" stroke="#c6b8a5" />
            <YAxis stroke="#c6b8a5" tickFormatter={(v) => `₹${v}`} />
            <Tooltip 
              formatter={tooltipFormatter}
              contentStyle={{ background: '#1f1a16', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
            />
            <Line type="monotone" dataKey="amount" stroke="#6ce3cf" strokeWidth={3} dot={{ fill: '#6ce3cf', r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Helper functions
function getMonthlyTrend(expenses: Expense[]) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const data = [];
  
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthLabel = months[date.getMonth()];
    const amount = expenses.reduce((sum, exp) => {
      const expDate = new Date(exp.spentAt);
      return expDate.getMonth() === date.getMonth() && expDate.getFullYear() === date.getFullYear() 
        ? sum + exp.amount : sum;
    }, 0);
    data.push({ month: monthLabel, amount });
  }
  return data;
}

function getCategoryData(expenses: Expense[]) {
  const totals = expenses.reduce((acc: Record<string, number>, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    return acc;
  }, {});
  
  return Object.entries(totals).map(([category, amount]) => ({ category, amount }));
}