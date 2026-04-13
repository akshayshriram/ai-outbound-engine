import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { getUserOrganizations } from '@/lib/services/org.service'
import { OnboardingForm } from '@/app/onboarding/onboarding-form'

export default async function OnboardingPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims) {
    redirect('/auth/login')
  }

  const userId = data.claims.sub
  const memberships = await getUserOrganizations(userId, supabase)
  if (memberships.length > 0) {
    redirect('/dashboard')
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md">
        <OnboardingForm />
      </div>
    </div>
  )
}

