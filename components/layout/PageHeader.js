import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'

export function PageHeader({ title, description, action, breadcrumb }) {
  return (
    <div className="mb-6">
      {breadcrumb && (
        <div className="text-xs text-muted-foreground mb-1">{breadcrumb}</div>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}>
            {title}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <Separator className="mt-4" />
    </div>
  )
}
