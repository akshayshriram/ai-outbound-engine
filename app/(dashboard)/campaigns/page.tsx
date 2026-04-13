'use client'

import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/page-header'
import { CampaignTable } from '@/components/shared/campaigns/campaign-table'
import { CreateCampaignModal } from '@/components/shared/campaigns/create-campaign-modal'
import { useCampaigns } from '@/lib/hooks/useCampaigns'
import { useAppStore } from '@/store/useAppStore'

export default function CampaignsPage() {
  const { setIsCreateCampaignOpen } = useAppStore()
  const { campaigns, isLoading, isError, error } = useCampaigns({
    page: 1,
    pageSize: 50,
  })

  return (
    <div>
      <PageHeader
        title="Campaigns"
        description="Manage your outbound sequences."
        actions={
          <Button onClick={() => setIsCreateCampaignOpen(true)}>
            Create Campaign
          </Button>
        }
      />

      {isLoading ? (
        <Card>
          <CardContent className="py-10 text-muted-foreground">
            Loading campaigns...
          </CardContent>
        </Card>
      ) : null}

      {isError ? (
        <Card>
          <CardContent className="py-10">
            <div className="space-y-3">
              <div className="text-sm font-medium">Failed to load campaigns</div>
              <div className="text-sm text-muted-foreground">
                {error instanceof Error ? error.message : 'Unknown error'}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && !isError ? <CampaignTable campaigns={campaigns} /> : null}

      <CreateCampaignModal />
    </div>
  )
}

