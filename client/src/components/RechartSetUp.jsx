import React from 'react'
import {
  Bar, BarChart, Cell,
  Line, LineChart,
  Pie, PieChart,
  ResponsiveContainer,
  Tooltip, XAxis, YAxis,
  CartesianGrid, Legend,
} from "recharts"

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#8b5cf6"]

// ─── Custom tooltip ───────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-lg text-sm">
      {label && <p className="text-gray-500 text-xs mb-1">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  )
}

function RechartSetUp({ charts }) {
  if (!charts || charts.length === 0) return null

  return (
    <div className="space-y-8">
      {charts.map((chart, index) => (
        <div key={index}
          className="border border-gray-200 rounded-2xl p-4 sm:p-5 bg-white shadow-sm"
        >
          {/* Chart title */}
          <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-base">📊</span>
            {chart.title}
          </h4>

          {/*
            CRITICAL: Use a fixed pixel height (not 100%) for the outer div.
            ResponsiveContainer reads the parent's computed height.
            When height is "100%" of a zero-height container, Recharts throws
            "width(-1) height(-1)" and doesn't render.
            Fixed 288px guarantees a non-zero bounding box.
          */}
          <div style={{ width: "100%", height: "288px" }}>
            <ResponsiveContainer width="100%" height="100%">

              {chart.type === "bar" ? (
                <BarChart
                  data={chart.data}
                  margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: "#6b7280" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={60}>
                    {chart.data.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>

              ) : chart.type === "line" ? (
                <LineChart
                  data={chart.data}
                  margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: "#6b7280" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#6366f1"
                    strokeWidth={3}
                    dot={{ fill: "#6366f1", r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>

              ) : chart.type === "pie" ? (
                <PieChart margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
                  />
                  <Pie
                    data={chart.data}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    outerRadius={100}
                    innerRadius={40}
                    label={({ name, percent }) =>
                      `${name} (${(percent * 100).toFixed(0)}%)`
                    }
                    labelLine={true}
                  >
                    {chart.data.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>

              ) : (
                // Fallback: bar chart for unknown types
                <BarChart data={chart.data}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chart.data.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              )}

            </ResponsiveContainer>
          </div>
        </div>
      ))}
    </div>
  )
}

export default RechartSetUp
