import Link from 'next/link'

type StatColor = 'blue' | 'emerald' | 'amber' | 'rose' | 'purple'

interface StatCardProps {
  title: string
  value: string | number
  color?: StatColor
  href?: string
  icon?: React.ReactNode
  trend?: { value: number; label: string }
}

const colorStyles: Record<StatColor, string> = {
  blue: 'bg-blue-50 border-blue-200 text-blue-900',
  emerald: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  amber: 'bg-amber-50 border-amber-200 text-amber-900',
  rose: 'bg-rose-50 border-rose-200 text-rose-900',
  purple: 'bg-purple-50 border-purple-200 text-purple-900',
}

const trendStyles = {
  positive: 'text-emerald-600',
  negative: 'text-rose-600',
}

export function StatCard({ title, value, color = 'blue', href, icon, trend }: StatCardProps) {
  const content = (
    <div className={`rounded-xl border p-6 transition hover:shadow-md ${colorStyles[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium opacity-70">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
          {trend && (
            <p className={`mt-2 text-sm ${trend.value >= 0 ? trendStyles.positive : trendStyles.negative}`}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
              <span className="text-slate-500 ml-1">{trend.label}</span>
            </p>
          )}
        </div>
        {icon && <div className="text-2xl opacity-50">{icon}</div>}
      </div>
    </div>
  )

  if (href) {
    return <Link href={href} className="block">{content}</Link>
  }

  return content
}
