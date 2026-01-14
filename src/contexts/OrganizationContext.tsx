'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './AuthContext'
import type { Organization, OrganizationMemberRole } from '@/types/database'

interface OrganizationWithRole extends Organization {
  user_role: OrganizationMemberRole
}

interface OrganizationContextType {
  // Current organization
  currentOrganization: OrganizationWithRole | null
  setCurrentOrganization: (org: OrganizationWithRole | null) => void

  // All user's organizations
  organizations: OrganizationWithRole[]
  loadingOrganizations: boolean
  refreshOrganizations: () => Promise<void>

  // Helpers
  isOrgOwner: boolean
  isOrgAdmin: boolean
  isSoloUser: boolean
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined)

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [organizations, setOrganizations] = useState<OrganizationWithRole[]>([])
  const [currentOrganization, setCurrentOrganizationState] = useState<OrganizationWithRole | null>(null)
  const [loadingOrganizations, setLoadingOrganizations] = useState(true)

  const supabase = createClient()

  const refreshOrganizations = useCallback(async () => {
    if (!user) {
      setOrganizations([])
      setCurrentOrganizationState(null)
      setLoadingOrganizations(false)
      return
    }

    try {
      const response = await fetch('/api/organizations')
      if (!response.ok) {
        throw new Error('Failed to fetch organizations')
      }

      const data = await response.json()
      const orgs = data.organizations || []
      setOrganizations(orgs)

      // Try to restore last selected organization from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('current_organization_id')
        .eq('id', user.id)
        .single()

      if (profile?.current_organization_id) {
        const savedOrg = orgs.find((o: OrganizationWithRole) => o.id === profile.current_organization_id)
        if (savedOrg) {
          setCurrentOrganizationState(savedOrg)
        } else if (orgs.length > 0) {
          // Saved org no longer valid, use first one
          setCurrentOrganizationState(orgs[0])
        }
      } else if (orgs.length > 0) {
        // No saved org, use first one
        setCurrentOrganizationState(orgs[0])
      }
    } catch (error) {
      console.error('Error fetching organizations:', error)
    } finally {
      setLoadingOrganizations(false)
    }
  }, [user, supabase])

  useEffect(() => {
    refreshOrganizations()
  }, [refreshOrganizations])

  const setCurrentOrganization = useCallback(async (org: OrganizationWithRole | null) => {
    setCurrentOrganizationState(org)

    // Save to profile for persistence
    if (user) {
      await supabase
        .from('profiles')
        .update({ current_organization_id: org?.id || null })
        .eq('id', user.id)
    }
  }, [user, supabase])

  const isOrgOwner = currentOrganization?.user_role === 'owner'
  const isOrgAdmin = currentOrganization?.user_role === 'owner' || currentOrganization?.user_role === 'admin'
  const isSoloUser = organizations.length === 0

  return (
    <OrganizationContext.Provider
      value={{
        currentOrganization,
        setCurrentOrganization,
        organizations,
        loadingOrganizations,
        refreshOrganizations,
        isOrgOwner,
        isOrgAdmin,
        isSoloUser,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  )
}

export function useOrganization() {
  const context = useContext(OrganizationContext)
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider')
  }
  return context
}
