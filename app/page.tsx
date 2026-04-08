import { AppSidebar } from "@/components/app-sidebar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function Page() {
  return (
    <div className="flex min-h-svh w-full">
      <AppSidebar />
      <main className="flex-1 px-6 py-10">
        <div className="mb-8 flex items-end justify-between gap-6">
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Clean, modern SaaS UI with shadcn tokens and smooth theming.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="transition-colors duration-300">
            <CardHeader className="border-b border-border">
              <CardTitle>Pipeline</CardTitle>
              <CardDescription>Leads contacted this week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mt-1 text-3xl font-semibold tabular-nums">
                1,248
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                +12.4% vs last week
              </div>
            </CardContent>
          </Card>

          <Card className="transition-colors duration-300">
            <CardHeader className="border-b border-border">
              <CardTitle>Replies</CardTitle>
              <CardDescription>Positive responses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mt-1 text-3xl font-semibold tabular-nums">
                86
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                6.9% reply rate
              </div>
            </CardContent>
          </Card>

          <Card className="transition-colors duration-300">
            <CardHeader className="border-b border-border">
              <CardTitle>Meetings</CardTitle>
              <CardDescription>Booked this month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mt-1 text-3xl font-semibold tabular-nums">14</div>
              <div className="mt-2 text-xs text-muted-foreground">
                Target: 20
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}