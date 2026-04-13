'use client'

import { create } from 'zustand'

type AppStore = {
  // UI-only state (no server data)
  isCreateLeadOpen: boolean
  isCreateCampaignOpen: boolean

  setIsCreateLeadOpen: (open: boolean) => void
  setIsCreateCampaignOpen: (open: boolean) => void
}

export const useAppStore = create<AppStore>((set) => ({
  isCreateLeadOpen: false,
  isCreateCampaignOpen: false,
  setIsCreateLeadOpen: (open) => set({ isCreateLeadOpen: open }),
  setIsCreateCampaignOpen: (open) => set({ isCreateCampaignOpen: open }),
}))

