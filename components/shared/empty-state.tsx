'use client'

import * as React from 'react'

import { Button } from '@/components/ui/button'

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-xl border border-border/60 bg-card/30 p-6">
      <div className="font-heading text-base font-semibold">{title}</div>
      {description ? (
        <div className="text-sm text-muted-foreground">{description}</div>
      ) : null}
      {action ? (
        <Button onClick={action.onClick}>{action.label}</Button>
      ) : null}
    </div>
  )
}

