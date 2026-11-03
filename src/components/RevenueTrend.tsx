import { useMemo } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { LineChart as LineChartIcon } from 'lucide-react'

export interface RevenuePoint {
  key: string
  label: string
  revenue: number
}

interface RevenueTrendProps {
  points: RevenuePoint[]
  rangeLabel: string
}

const SERIES_COLOR = '#1d4c98' // brand navy (blue-600)
const compactFormat = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })
const fullFormat = (value: number) => `UGX ${Math.round(value).toLocaleString()}`

function TrendTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: RevenuePoint }> }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-slate-500">{point.label}</p>
      <p className="tabular mt-0.5 text-sm font-bold text-slate-900">{fullFormat(point.revenue)}</p>
    </div>
  )
}

export default function RevenueTrend({ points, rangeLabel }: RevenueTrendProps) {
  const hasRevenue = useMemo(() => points.some((point) => point.revenue > 0), [points])

  return (
    <div className="card flex h-full flex-col overflow-hidden">
      <div className="card-header">
        <div className="min-w-0">
          <p className="card-title">Revenue over time</p>
          <p className="card-subtitle">{rangeLabel}</p>
        </div>
      </div>

      {hasRevenue ? (
        <div className="h-64 px-2 pb-3 pt-4 sm:h-72 sm:px-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SERIES_COLOR} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={SERIES_COLOR} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#eef1f6" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#64748b', fontSize: 11 }}
                minTickGap={24}
                tickMargin={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickFormatter={(value: number) => compactFormat.format(value)}
                width={44}
              />
              <Tooltip
                content={<TrendTooltip />}
                cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke={SERIES_COLOR}
                strokeWidth={2}
                fill="url(#revenueFill)"
                activeDot={{ r: 5, stroke: '#ffffff', strokeWidth: 2, fill: SERIES_COLOR }}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>

          {/* Table view of the same data for screen readers. */}
          <table className="sr-only">
            <caption>Revenue by period, {rangeLabel}</caption>
            <thead><tr><th>Period</th><th>Revenue</th></tr></thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.key}><td>{point.label}</td><td>{fullFormat(point.revenue)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-14 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <LineChartIcon size={22} />
          </div>
          <p className="mt-4 text-sm font-semibold text-slate-900">No revenue in this period</p>
          <p className="mt-1 max-w-xs text-sm text-slate-500">Choose a longer range to see your sales trend.</p>
        </div>
      )}
    </div>
  )
}
