'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2,
  ChevronDown,
  Plus,
  Check,
  Settings,
  Users,
  Crown,
  Shield,
  User,
} from 'lucide-react'
import { useOrganization } from '@/contexts/OrganizationContext'

export default function OrganizationSwitcher() {
  const router = useRouter()
  const {
    currentOrganization,
    setCurrentOrganization,
    organizations,
    loadingOrganizations,
    isSoloUser,
  } = useOrganization()

  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (loadingOrganizations) {
    return (
      <div className="w-full h-12 bg-[rgba(255,255,255,0.02)] rounded-xl animate-pulse" />
    )
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-3 h-3 text-yellow-400" />
      case 'admin':
        return <Shield className="w-3 h-3 text-purple-400" />
      default:
        return null
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.05)] transition-colors"
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00ffc1]/20 to-[#00ffc1]/5 flex items-center justify-center flex-shrink-0">
          {currentOrganization ? (
            currentOrganization.logo_url ? (
              <img
                src={currentOrganization.logo_url}
                alt={currentOrganization.name}
                className="w-5 h-5 rounded"
              />
            ) : (
              <Building2 className="w-4 h-4 text-[#00ffc1]" />
            )
          ) : (
            <User className="w-4 h-4 text-gray-400" />
          )}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-medium text-white truncate">
            {currentOrganization?.name || 'Solo Account'}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {currentOrganization
              ? `${currentOrganization.used_seats} member${currentOrganization.used_seats === 1 ? '' : 's'}`
              : 'Personal workspace'
            }
          </p>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-[#0a1628] border border-[rgba(255,255,255,0.1)] rounded-xl shadow-xl overflow-hidden">
          {/* Organization List */}
          <div className="max-h-64 overflow-y-auto">
            {organizations.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-sm">
                No organizations yet
              </div>
            ) : (
              organizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => {
                    setCurrentOrganization(org)
                    setIsOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[rgba(255,255,255,0.05)] transition-colors ${
                    currentOrganization?.id === org.id ? 'bg-[rgba(0,255,193,0.05)]' : ''
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00ffc1]/20 to-[#00ffc1]/5 flex items-center justify-center flex-shrink-0">
                    {org.logo_url ? (
                      <img src={org.logo_url} alt={org.name} className="w-5 h-5 rounded" />
                    ) : (
                      <Building2 className="w-4 h-4 text-[#00ffc1]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white truncate">{org.name}</p>
                      {getRoleIcon(org.user_role)}
                    </div>
                    <p className="text-xs text-gray-500">
                      {org.used_seats} member{org.used_seats === 1 ? '' : 's'}
                    </p>
                  </div>
                  {currentOrganization?.id === org.id && (
                    <Check className="w-4 h-4 text-[#00ffc1] flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Actions */}
          <div className="border-t border-[rgba(255,255,255,0.05)]">
            {currentOrganization && (
              <button
                onClick={() => {
                  router.push('/settings/organization')
                  setIsOpen(false)
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[rgba(255,255,255,0.05)] transition-colors"
              >
                <Settings className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-300">Organization Settings</span>
              </button>
            )}
            <button
              onClick={() => {
                router.push('/settings/organization')
                setIsOpen(false)
              }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[rgba(255,255,255,0.05)] transition-colors"
            >
              <Plus className="w-4 h-4 text-[#00ffc1]" />
              <span className="text-sm text-[#00ffc1]">Create Organization</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
