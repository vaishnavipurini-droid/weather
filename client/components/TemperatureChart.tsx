import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

interface ChartData {
  time: string;
  temperature: number;
}

interface TemperatureChartProps {
  data: ChartData[];
  isCelsius: boolean;
}

export default function TemperatureChart({ data, isCelsius }: TemperatureChartProps) {
  const tempUnit = isCelsius ? "°C" : "°F";

  const convertTemp = (celsius: number) => {
    return isCelsius ? celsius : Math.round((celsius * 9/5) + 32);
  };

  const chartData = data.map(item => ({
    ...item,
    temperature: convertTemp(item.temperature)
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700">
          <p className="text-sm font-semibold text-gray-800 dark:text-white">
            {payload[0].value}{tempUnit}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {payload[0].payload.time}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
        Temperature Trend
      </h2>

      <ResponsiveContainer width="100%" height={400}>
        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorTemperature" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e5e7eb"
            className="dark:stroke-slate-700"
          />
          <XAxis
            dataKey="time"
            stroke="#9ca3af"
            className="dark:stroke-gray-600"
            style={{ fontSize: "12px" }}
          />
          <YAxis
            stroke="#9ca3af"
            className="dark:stroke-gray-600"
            label={{ value: tempUnit, angle: -90, position: "insideLeft" }}
            style={{ fontSize: "12px" }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="temperature"
            stroke="#3b82f6"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorTemperature)"
            dot={{ fill: "#3b82f6", r: 5 }}
            activeDot={{ r: 7 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
