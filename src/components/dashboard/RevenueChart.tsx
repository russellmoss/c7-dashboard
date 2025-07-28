import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

interface RevenueChartProps {
  data: any;
}

export function RevenueChart({ data }: RevenueChartProps) {
  if (!data || !data.overallMetrics) return null;
  // Example: show revenue and orders for the period
  const chartData = [
    {
      name: data.periodLabel,
      Revenue: data.overallMetrics.totalRevenue,
      Orders: data.overallMetrics.totalOrders,
    },
  ];
  return (
    <div className="w-full h-64 bg-white rounded-lg shadow-sm p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 16, right: 16, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="Revenue" fill="#cc2929" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Orders" fill="#f59e0b" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
