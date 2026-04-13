'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { createOrganization } from '@/lib/services/org.service'
import { useOrgStore } from '@/store/useOrgStore'

export function OnboardingForm() {
  const router = useRouter()
  const setOrgId = useOrgStore((s) => s.setOrgId)

  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const [orgName, setOrgName] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const name = orgName.trim()
    if (name.length < 2) {
      const msg = 'Workspace name must be at least 2 characters.'
      setError(msg)
      toast.error(msg)
      return
    }

    setIsLoading(true)
    try {
      const supabase = createClient()
      const { data, error: userError } = await supabase.auth.getUser()
      if (userError) throw new Error(userError.message)
      const userId = data.user?.id
      if (!userId) throw new Error('You must be logged in to create a workspace.')

      const { organization } = await createOrganization(name, userId)

      setOrgId(organization.id)
      toast.success('Workspace created.')
      router.replace('/dashboard')
      router.refresh()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to create workspace.'
      setError(msg)
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Create your workspace</CardTitle>
        <CardDescription>
          Give your workspace a name. You can change it later.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="org-name" className="text-sm font-medium">
              Workspace name
            </label>
            <Input
              id="org-name"
              ref={inputRef}
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Acme Inc"
              autoComplete="organization"
              disabled={isLoading}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create Workspace'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

