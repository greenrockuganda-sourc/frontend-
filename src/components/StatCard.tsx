import { TrendingUp, TrendingDown } from 'lucide-react'

type StatTone = 'blue' | 'emerald' | 'amber' | 'rose' | 'slate' | 'orange'

interface StatCardProps {
  title: string
  value: string
  icon: React.ReactNode
  /** Short supporting line under the value (e.g. what the number covers). */
  change?: string
  /** Only pass a trend when it is computed from real data. */
  trend?: 'up' | 'down'
  color?: StatTone
  onClick?: () => void
}

const toneMap: Record<StatTone, string> = {
  blue: 'bg-blue-50 text-blue-700',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  rose: 'bg-rose-50 text-rose-600',
  slate: 'bg-slate-100 text-slate-600',
  orange: 'bg-accent-50 text-accent-600',
}

export default function StatCard({
  title,
  value,
  icon,
  change,
  trend,
  color = 'blue',
  onClick,
}: StatCardProps) {
  const tone = toneMap[color] ?? toneMap.blue
  const trendClass =
    trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-rose-600' : 'text-slate-500'
  const Wrapper = onClick ? 'button' : 'div'

  return (
    <Wrapper
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={`card card-hover flex w-full flex-col p-4 text-left sm:p-5 ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${tone}`}>
          {icon}
        </span>
        <p className="min-w-0 truncate text-sm font-medium text-slate-500">{title}</p>
      </div>

      <p className="tabular mt-4 truncate text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-[1.65rem]">
        {value}
      </p>

      {change && (
        <div className="mt-1.5 flex items-center gap-1.5">
          {trend === 'up' && <TrendingUp size={14} className={trendClass} />}
          {trend === 'down' && <TrendingDown size={14} className={trendClass} />}
          <span className={`truncate text-xs font-medium ${trendClass}`}>{change}</span>
        </div>
      )}
    </Wrapper>
  )
}
