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
        <div
          key={index}
          className="border border-gray-200 rounded-2xl p-4 sm:p-5 bg-white shadow-sm"
          // data-pdf-chart enables targeted CSS in exportPdf print stylesheet
          data-pdf-chart="true"
        >
          {/* Chart title */}
          <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-base">📊</span>
            {chart.title}
          </h4>

          {/*
            CRITICAL: Fixed pixel height container.
            - ResponsiveContainer reads parent's computed height.
            - "100%" on a zero-height parent → Recharts renders nothing.
            - 288px fixed guarantees a valid bounding box on all devices.
            - overflow: visible ensures chart labels/tooltips are not clipped.
            - This height is intentional — do NOT change to percentage.
          */}
          <div
            style={{
              width: "100%",
              height: "288px",
              overflow: "visible",
              position: "relative",
            }}
          >
            <ResponsiveContainer width="100%" height="100%">

              {chart.type === "bar" ? (
                <BarChart
                  data={chart.data}
                  margin={{ top: 10, right: 16, left: 0, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
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
                    width={32}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={64}>
                    {chart.data.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>

              ) : chart.type === "line" ? (
                <LineChart
                  data={chart.data}
                  margin={{ top: 10, right: 16, left: 0, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
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
                    width={32}
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
                <BarChart
                  data={chart.data}
                  margin={{ top: 10, right: 16, left: 0, bottom: 8 }}
                >
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} width={32} />
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