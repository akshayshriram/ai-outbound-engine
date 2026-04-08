import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function DashboardPage() {
  // Mock stats for now (production: derive from Supabase aggregates)
  const stats = [
    { title: 'Total Leads', value: 1248, description: 'Leads in your pipeline' },
    { title: 'Campaigns', value: 18, description: 'Active and draft campaigns' },
    { title: 'Emails Sent', value: 3920, description: 'Messages delivered' },
    { title: 'Replies', value: 86, description: 'Positive responses' },
  ] as const

  return (
    <div>
      <div className="mb-8 flex items-end justify-between gap-6">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AI Outbound Engine overview and performance snapshot.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.title} className="transition-colors duration-300">
            <CardHeader className="border-b border-border">
              <CardTitle>{s.title}</CardTitle>
              <CardDescription>{s.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mt-1 text-3xl font-semibold tabular-nums">
                {s.value.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

