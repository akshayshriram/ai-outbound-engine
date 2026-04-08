import * as React from 'react'

import { AppSidebar } from '@/components/app-sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-svh w-full">
      <AppSidebar />
      <main className="flex-1 px-6 py-10">{children}</main>
    </div>
  )
}

