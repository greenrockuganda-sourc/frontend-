import { TrendingUp, TrendingDown } from 'lucide-react'

type StatTone = 'blue' | 'emerald' | 'amber' | 'rose' | 'slate'

interface StatCardProps {
  title: string
  value: string
  icon: React.ReactNode
  change?: string
  trend?: 'up' | 'down'
  color?: StatTone
}

const toneMap: Record<StatTone, { icon: string; accent: string }> = {
  blue: { icon: 'bg-blue-50 text-blue-600 ring-blue-100', accent: 'from-blue-500 to-blue-600' },
  emerald: { icon: 'bg-emerald-50 text-emerald-600 ring-emerald-100', accent: 'from-emerald-500 to-emerald-600' },
  amber: { icon: 'bg-amber-50 text-amber-600 ring-amber-100', accent: 'from-amber-500 to-amber-600' },
  rose: { icon: 'bg-rose-50 text-rose-600 ring-rose-100', accent: 'from-rose-500 to-rose-600' },
  slate: { icon: 'bg-slate-100 text-slate-600 ring-slate-200', accent: 'from-slate-500 to-slate-600' },
}

export default function StatCard({
  title,
  value,
  icon,
  change,
  trend,
  color = 'blue',
}: StatCardProps) {
  const tone = toneMap[color] ?? toneMap.blue
  const trendClass =
    trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-amber-600' : 'text-slate-500'

  return (
    <div className="card card-hover relative overflow-hidden p-4 sm:p-5">
      <span
        className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${tone.accent} opacity-80`}
        aria-hidden="true"
      />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.8125rem] font-medium text-slate-500">{title}</p>
          <p className="tabular mt-2 text-2xl font-bold leading-tight text-slate-900 sm:text-[1.75rem]">
            {value}
          </p>
        </div>

        <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ring-1 ${tone.icon}`}>
          {icon}
        </div>
      </div>

      {change && (
        <div className="mt-4 flex items-center gap-1.5 border-t border-slate-100 pt-3">
          {trend === 'up' && <TrendingUp size={14} className={trendClass} />}
          {trend === 'down' && <TrendingDown size={14} className={trendClass} />}
          <span className={`text-xs font-medium ${trendClass}`}>{change}</span>
        </div>
      )}
    </div>
  )
}
