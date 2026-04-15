'use client'

import * as React from 'react'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCreateLead } from '@/lib/hooks/useLeads'
import { useAppStore } from '@/store/useAppStore'

export function CreateLeadModal() {
  const { isCreateLeadOpen, setIsCreateLeadOpen } = useAppStore()
  const createLeadMutation = useCreateLead()

  const [firstName, setFirstName] = React.useState('')
  const [lastName, setLastName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [company, setCompany] = React.useState('')

  React.useEffect(() => {
    if (!isCreateLeadOpen) return
    setFirstName('')
    setLastName('')
    setEmail('')
    setCompany('')
  }, [isCreateLeadOpen])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await createLeadMutation.mutateAsync({
        firstName,
        lastName,
        email,
        company,
      })
      toast.success('Lead created.')
      setIsCreateLeadOpen(false)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unable to create lead.'
      toast.error(message)
    }
  }

  return (
    <Dialog open={isCreateLeadOpen} onOpenChange={setIsCreateLeadOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Lead</DialogTitle>
          <DialogDescription>
            Add a lead to your outbound pipeline.
          </DialogDescription>
        </DialogHeader>

        <form className="mt-2 grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required={false}
            />
            <Input
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required={false}
            />
          </div>

          <Input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
          />
          <Input
            placeholder="Company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            required={false}
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              disabled={createLeadMutation.isPending}
              onClick={() => setIsCreateLeadOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createLeadMutation.isPending}>
              {createLeadMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

