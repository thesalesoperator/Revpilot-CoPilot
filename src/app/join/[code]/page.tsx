'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Building2,
  Users,
  Check,
  X,
  Loader2,
  Shield,
  LogIn,
  AlertCircle,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useOrganization } from '@/contexts/OrganizationContext'
import { useToast } from '@/components/ui/Toast'

interface InviteInfo {
  invite: {
    id: string
    role: string
    is_private: boolean
  }
  organization: {
    id: string
    name: string
    slug: string
    logo_url: string | null
    description: string | null
  }
  requires_login: boolean
}

export default function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params)
  const code = resolvedParams.code
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { refreshOrganizations } = useOrganization()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchInvite = async () => {
      try {
        const response = await fetch(`/api/organizations/join?code=${code}`)

        if (!response.ok) {
          const data = await response.json()
          setError(data.error || 'Invalid invite link')
          return
        }

        const data = await response.json()
        setInviteInfo(data)
      } catch (err) {
        setError('Failed to load invite information')
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading) {
      fetchInvite()
    }
  }, [code, authLoading])

  const handleJoin = async () => {
    if (!inviteInfo) return
    setJoining(true)

    try {
      const response = await fetch('/api/organizations/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to join organization')
      }

      const data = await response.json()
      showToast('success', `Welcome to ${data.organization.name}!`)
      await refreshOrganizations()
      router.push('/settings/organization')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to join organization')
    } finally {
      setJoining(false)
    }
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#5eead4] animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading invite...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.1)] rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Invalid Invite</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <Link href="/" className="btn-primary inline-flex items-center gap-2">
            Go Home
          </Link>
        </div>
      </div>
    )
  }

  if (!inviteInfo) {
    return null
  }

  const { invite, organization } = inviteInfo

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.1)] rounded-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#5eead4]/20 to-[#5eead4]/5 flex items-center justify-center mx-auto mb-4">
              {organization.logo_url ? (
                <img src={organization.logo_url} alt={organization.name} className="w-12 h-12 rounded-lg" />
              ) : (
                <Building2 className="w-10 h-10 text-[#5eead4]" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Join {organization.name}
            </h1>
            {organization.description && (
              <p className="text-gray-400 text-sm mb-4">{organization.description}</p>
            )}
            <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
              <Shield className="w-4 h-4" />
              <span>You'll join as: <span className="text-white capitalize">{invite.role}</span></span>
            </div>
          </div>

          <div className="bg-[rgba(255,152,85,0.1)] border border-[rgba(255,152,85,0.2)] rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#ff9855] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-medium mb-1">Sign in required</p>
                <p className="text-sm text-gray-400">
                  You need to sign in or create an account to join this organization.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Link
              href={`/login?redirect=/join/${code}`}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              Sign In to Join
            </Link>
            <Link
              href={`/signup?redirect=/join/${code}`}
              className="btn-secondary w-full text-center block"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Logged in - show join confirmation
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.1)] rounded-2xl p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#5eead4]/20 to-[#5eead4]/5 flex items-center justify-center mx-auto mb-4">
            {organization.logo_url ? (
              <img src={organization.logo_url} alt={organization.name} className="w-12 h-12 rounded-lg" />
            ) : (
              <Building2 className="w-10 h-10 text-[#5eead4]" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Join {organization.name}
          </h1>
          {organization.description && (
            <p className="text-gray-400 text-sm mb-4">{organization.description}</p>
          )}
        </div>

        <div className="bg-[rgba(94,234,212,0.05)] border border-[rgba(94,234,212,0.1)] rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-400">Joining as</span>
            <span className="text-white font-medium capitalize flex items-center gap-2">
              {invite.role === 'admin' && <Shield className="w-4 h-4 text-purple-400" />}
              {invite.role}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Your account</span>
            <span className="text-white font-medium">{user.email}</span>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleJoin}
            disabled={joining}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {joining ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {joining ? 'Joining...' : 'Join Organization'}
          </button>
          <Link
            href="/"
            className="btn-secondary w-full text-center block"
          >
            Cancel
          </Link>
        </div>

        <p className="text-xs text-gray-500 text-center mt-4">
          By joining, you agree to share your profile with organization members.
        </p>
      </div>
    </div>
  )
}
