import { create } from 'zustand'

export type OrgStore = {
  orgId: string | null
  setOrgId: (id: string | null) => void
}

export const useOrgStore = create<OrgStore>((set) => ({
  orgId: null,
  setOrgId: (id) => set({ orgId: id }),
}))

