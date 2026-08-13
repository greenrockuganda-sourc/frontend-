import { TrendingUp, TrendingDown } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string
  icon: React.ReactNode
  change?: string
  trend?: 'up' | 'down'
  color?: 'blue'
}

const colorMap = {
  blue: 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white',
}

export default function StatCard({ 
  title, 
  value, 
  icon, 
  change, 
  trend,
  color = 'blue'
}: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-[0_18px_32px_-22px_rgba(15,23,42,0.35)] backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_40px_-22px_rgba(79,70,229,0.5)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</p>
          <p className="mt-3 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{value}</p>
          {change && (
            <p className={`mt-3 flex items-center gap-1.5 text-xs font-medium ${trend === 'down' ? 'text-amber-600' : 'text-emerald-600'}`}>
              {trend === 'up' && <TrendingUp size={14} />}
              {trend === 'down' && <TrendingDown size={14} />}
              {change}
            </p>
          )}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl shadow-lg ${colorMap[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}
