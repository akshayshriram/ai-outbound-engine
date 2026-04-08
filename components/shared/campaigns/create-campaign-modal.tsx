'use client'

import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAppStore } from '@/lib/store/useAppStore'
import type { Database } from '@/utils/supabase/types/database'

type CampaignStatus = Database['public']['Enums']['campaign_status']

export function CreateCampaignModal() {
  const queryClient = useQueryClient()
  const { isCreateCampaignOpen, setIsCreateCampaignOpen } = useAppStore()

  const [name, setName] = React.useState('')
  const [status, setStatus] = React.useState<CampaignStatus>('draft')

  React.useEffect(() => {
    if (!isCreateCampaignOpen) return
    setName('')
    setStatus('draft')
  }, [isCreateCampaignOpen])

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Mock create for now (production: insert into `campaigns`)
    console.log('Create campaign', { name, status })

    setIsCreateCampaignOpen(false)
    queryClient.invalidateQueries({ queryKey: ['campaigns'] })
  }

  return (
    <Dialog open={isCreateCampaignOpen} onOpenChange={setIsCreateCampaignOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Campaign</DialogTitle>
          <DialogDescription>
            Start a new outbound campaign. (Mock action)
          </DialogDescription>
        </DialogHeader>

        <form className="mt-2 grid gap-4" onSubmit={onSubmit}>
          <Input
            placeholder="Campaign name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <label className="grid gap-2">
            <span className="text-sm font-medium text-foreground">Status</span>
            <select
              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={status}
              onChange={(e) => setStatus(e.target.value as CampaignStatus)}
            >
              <option value="draft">draft</option>
              <option value="active">active</option>
              <option value="paused">paused</option>
              <option value="completed">completed</option>
              <option value="archived">archived</option>
            </select>
          </label>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsCreateCampaignOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

