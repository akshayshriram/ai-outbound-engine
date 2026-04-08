'use client'

import * as React from 'react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export type DataTableColumn<T> = {
  id: string
  header: React.ReactNode
  cell: (row: T) => React.ReactNode
  className?: string
}

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  emptyState,
}: {
  rows: T[]
  columns: DataTableColumn<T>[]
  rowKey: (row: T) => string
  emptyState?: React.ReactNode
}) {
  if (rows.length === 0) {
    return (
      <div className="py-10">
        {emptyState ?? (
          <div className="text-sm text-muted-foreground">No results.</div>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card/20">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.id} className={col.className}>
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={rowKey(row)}>
              {columns.map((col) => (
                <TableCell key={col.id} className={col.className}>
                  {col.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

