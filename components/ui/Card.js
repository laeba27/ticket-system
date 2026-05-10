import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function StatCard({ label, value, icon, colorClass = 'text-primary', loading = false }) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={cn(
            'size-9 rounded-xl flex items-center justify-center text-base',
            'bg-primary/10 border border-primary/20',
            colorClass === 'text-blue-400' ? 'bg-blue-500/10 border-blue-500/20' :
            colorClass === 'text-amber-400' ? 'bg-amber-500/10 border-amber-500/20' :
            colorClass === 'text-emerald-400' ? 'bg-emerald-500/10 border-emerald-500/20' :
            colorClass === 'text-red-400' ? 'bg-red-500/10 border-red-500/20' :
            colorClass === 'text-purple-400' ? 'bg-purple-500/10 border-purple-500/20' : ''
          )}>
            {icon}
          </div>
        </div>
        {loading ? (
          <>
            <div className="skeleton h-7 w-16 mb-1.5" />
            <div className="skeleton h-3.5 w-24" />
          </>
        ) : (
          <>
            <div className={cn('text-2xl font-bold tracking-tight', colorClass)} style={{ fontFamily: 'var(--font-display)' }}>
              {value}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
      <div className="size-14 rounded-2xl bg-muted border border-border flex items-center justify-center text-2xl mb-1">
        {icon}
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description && <p className="text-xs text-muted-foreground max-w-xs">{description}</p>}
      {action}
    </div>
  )
}
