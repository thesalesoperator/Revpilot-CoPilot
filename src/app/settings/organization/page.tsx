'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Building2,
  Users,
  Settings,
  Link as LinkIcon,
  Copy,
  Plus,
  Trash2,
  Shield,
  Crown,
  UserPlus,
  Loader2,
  Check,
  X,
  ChevronDown,
  CreditCard,
  ExternalLink,
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { useOrganization } from '@/contexts/OrganizationContext'
import type { OrganizationMember, OrganizationInvite } from '@/types/database'

export default function OrganizationSettingsPage() {
  const { user } = useAuth()
  const { currentOrganization, isOrgOwner, isOrgAdmin, refreshOrganizations } = useOrganization()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [invites, setInvites] = useState<OrganizationInvite[]>([])
  const [userRole, setUserRole] = useState<string>('')

  // Modal states
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false)
  const [isEditingOrg, setIsEditingOrg] = useState(false)
  const [orgName, setOrgName] = useState('')
  const [orgDescription, setOrgDescription] = useState('')
  const [saving, setSaving] = useState(false)

  // Invite form
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteMaxUses, setInviteMaxUses] = useState<number | undefined>()
  const [inviteExpiresDays, setInviteExpiresDays] = useState<number | undefined>()
  const [createdInviteUrl, setCreatedInviteUrl] = useState('')

  // Add member form
  const [addMemberEmail, setAddMemberEmail] = useState('')
  const [addMemberRole, setAddMemberRole] = useState<'member' | 'admin'>('member')

  const fetchData = useCallback(async () => {
    if (!currentOrganization) {
      setLoading(false)
      return
    }

    try {
      const [membersRes, invitesRes] = await Promise.all([
        fetch(`/api/organizations/${currentOrganization.id}/members`),
        isOrgAdmin ? fetch(`/api/organizations/${currentOrganization.id}/invites`) : Promise.resolve(null),
      ])

      if (membersRes.ok) {
        const data = await membersRes.json()
        setMembers(data.members || [])
        setUserRole(data.user_role || '')
      }

      if (invitesRes?.ok) {
        const data = await invitesRes.json()
        setInvites(data.invites || [])
      }

      setOrgName(currentOrganization.name)
      setOrgDescription(currentOrganization.description || '')
    } catch (error) {
      console.error('Error fetching organization data:', error)
      showToast('error', 'Failed to load organization data')
    } finally {
      setLoading(false)
    }
  }, [currentOrganization, isOrgAdmin, showToast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSaveOrg = async () => {
    if (!currentOrganization) return
    setSaving(true)

    try {
      const response = await fetch(`/api/organizations/${currentOrganization.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: orgName,
          description: orgDescription,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update organization')
      }

      showToast('success', 'Organization updated successfully')
      setIsEditingOrg(false)
      refreshOrganizations()
    } catch (error) {
      showToast('error', 'Failed to update organization')
    } finally {
      setSaving(false)
    }
  }

  const handleCreateInvite = async () => {
    if (!currentOrganization) return
    setSaving(true)

    try {
      const response = await fetch(`/api/organizations/${currentOrganization.id}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail || null,
          role: inviteRole,
          max_uses: inviteMaxUses || null,
          expires_in_days: inviteExpiresDays || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create invite')
      }

      const data = await response.json()
      setCreatedInviteUrl(data.invite_url)
      showToast('success', 'Invite link created!')
      fetchData()
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to create invite')
    } finally {
      setSaving(false)
    }
  }

  const handleCopyInvite = (url: string) => {
    navigator.clipboard.writeText(url)
    showToast('success', 'Invite link copied!')
  }

  const handleRevokeInvite = async (inviteId: string) => {
    if (!currentOrganization || !confirm('Revoke this invite?')) return

    try {
      const response = await fetch(`/api/organizations/${currentOrganization.id}/invites/${inviteId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to revoke invite')
      }

      showToast('success', 'Invite revoked')
      fetchData()
    } catch (error) {
      showToast('error', 'Failed to revoke invite')
    }
  }

  const handleAddMember = async () => {
    if (!currentOrganization || !addMemberEmail) return
    setSaving(true)

    try {
      const response = await fetch(`/api/organizations/${currentOrganization.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: addMemberEmail,
          role: addMemberRole,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to add member')
      }

      showToast('success', 'Member added successfully')
      setIsAddMemberModalOpen(false)
      setAddMemberEmail('')
      setAddMemberRole('member')
      fetchData()
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to add member')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateMemberRole = async (memberId: string, newRole: string) => {
    if (!currentOrganization) return

    try {
      const response = await fetch(`/api/organizations/${currentOrganization.id}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update member')
      }

      showToast('success', 'Member role updated')
      fetchData()
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to update member')
    }
  }

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!currentOrganization || !confirm(`Remove ${memberName} from the organization?`)) return

    try {
      const response = await fetch(`/api/organizations/${currentOrganization.id}/members/${memberId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to remove member')
      }

      showToast('success', 'Member removed')
      fetchData()
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to remove member')
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="spinner" />
        </div>
      </DashboardLayout>
    )
  }

  if (!currentOrganization) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Organization Settings</h1>
            <p className="text-gray-400">Manage your team and organization</p>
          </div>

          <div className="glass-card p-12 text-center">
            <Building2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No Organization Yet</h2>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              You're currently using RevPilot as a solo account. Create an organization to invite team members
              and manage billing together.
            </p>
            <CreateOrganizationButton onSuccess={refreshOrganizations} />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <DashboardLayout>
      <div className="max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Organization Settings</h1>
            <p className="text-gray-400">Manage {currentOrganization.name}</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            {currentOrganization.user_role === 'owner' && (
              <span className="flex items-center gap-1 bg-[#5eead4]/20 text-[#5eead4] px-3 py-1 rounded-full">
                <Crown className="w-3 h-3" /> Owner
              </span>
            )}
            {currentOrganization.user_role === 'admin' && (
              <span className="flex items-center gap-1 bg-[#5eead4]/20 text-[#5eead4] px-3 py-1 rounded-full">
                <Shield className="w-3 h-3" /> Admin
              </span>
            )}
          </div>
        </div>

        {/* Organization Details */}
        <div className="glass-card">
          <div className="p-6 border-b border-[rgba(94,234,212,0.1)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-[#5eead4]" />
              <h2 className="text-xl font-semibold gradient-text">Organization Details</h2>
            </div>
            {isOrgAdmin && !isEditingOrg && (
              <button
                onClick={() => setIsEditingOrg(true)}
                className="btn-secondary text-sm py-2 px-4"
              >
                <Settings className="w-4 h-4 inline mr-2" />
                Edit
              </button>
            )}
          </div>
          <div className="p-6">
            {isEditingOrg ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Organization Name</label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                  <textarea
                    value={orgDescription}
                    onChange={(e) => setOrgDescription(e.target.value)}
                    className="input-field min-h-[100px]"
                    placeholder="Brief description of your organization..."
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setIsEditingOrg(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveOrg}
                    disabled={saving}
                    className="btn-primary flex items-center gap-2"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-400">Name</span>
                    <p className="text-white font-medium">{currentOrganization.name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">URL Slug</span>
                    <p className="text-white font-medium">/{currentOrganization.slug}</p>
                  </div>
                </div>
                {currentOrganization.description && (
                  <div>
                    <span className="text-sm text-gray-400">Description</span>
                    <p className="text-white">{currentOrganization.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-400">Billing Type</span>
                    <p className="text-white font-medium">
                      {currentOrganization.billing_type === 'org_pays' ? 'Organization Pays' : 'Members Pay Individually'}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">Seats Used</span>
                    <p className="text-white font-medium">
                      {currentOrganization.used_seats} / {currentOrganization.max_seats}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Members Section */}
        <div className="glass-card">
          <div className="p-6 border-b border-[rgba(94,234,212,0.1)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-[#5eead4]" />
              <h2 className="text-xl font-semibold gradient-text">
                Team Members ({members.length})
              </h2>
            </div>
            {isOrgAdmin && (
              <button
                onClick={() => setIsAddMemberModalOpen(true)}
                className="btn-secondary text-sm py-2 px-4"
              >
                <UserPlus className="w-4 h-4 inline mr-2" />
                Add Member
              </button>
            )}
          </div>
          <div className="divide-y divide-[rgba(255,255,255,0.05)]">
            {members.map((member) => (
              <div key={member.id} className="p-4 flex items-center justify-between hover:bg-[rgba(255,255,255,0.02)]">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[rgba(94,234,212,0.1)] flex items-center justify-center text-[#5eead4] font-medium">
                    {((member as { display_name?: string }).display_name || (member as { full_name?: string }).full_name || (member as { email?: string }).email || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      {(member as { display_name?: string }).display_name || (member as { full_name?: string }).full_name || 'Unknown'}
                    </p>
                    <p className="text-sm text-gray-400">{(member as { email?: string }).email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {member.role === 'owner' ? (
                    <span className="flex items-center gap-1 text-[#5eead4] text-sm">
                      <Crown className="w-4 h-4" /> Owner
                    </span>
                  ) : (
                    <>
                      {isOrgOwner && member.user_id !== user?.id ? (
                        <select
                          value={member.role}
                          onChange={(e) => handleUpdateMemberRole(member.id, e.target.value)}
                          className="select-field py-1 px-2 text-sm"
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        <span className={`flex items-center gap-1 text-sm ${
                          member.role === 'admin' ? 'text-[#5eead4]' : 'text-gray-400'
                        }`}>
                          {member.role === 'admin' && <Shield className="w-4 h-4" />}
                          {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                        </span>
                      )}
                      {isOrgAdmin && member.user_id !== user?.id && member.role !== 'owner' && (
                        <button
                          onClick={() => handleRemoveMember(member.id, (member as { full_name?: string }).full_name || 'this member')}
                          className="p-2 rounded-lg hover:bg-gray-500/10 text-gray-400 hover:text-gray-400 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Invite Links Section */}
        {isOrgAdmin && (
          <div className="glass-card">
            <div className="p-6 border-b border-[rgba(94,234,212,0.1)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <LinkIcon className="w-5 h-5 text-[#5eead4]" />
                <h2 className="text-xl font-semibold gradient-text">Invite Links</h2>
              </div>
              <button
                onClick={() => {
                  setCreatedInviteUrl('')
                  setInviteEmail('')
                  setInviteRole('member')
                  setInviteMaxUses(undefined)
                  setInviteExpiresDays(undefined)
                  setIsInviteModalOpen(true)
                }}
                className="btn-primary text-sm py-2 px-4"
              >
                <Plus className="w-4 h-4 inline mr-2" />
                Create Invite Link
              </button>
            </div>
            <div className="p-6">
              {invites.filter(i => i.status === 'active').length === 0 ? (
                <div className="text-center py-8">
                  <LinkIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 mb-2">No active invite links</p>
                  <p className="text-sm text-gray-500">Create an invite link to share with your team</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {invites.filter(i => i.status === 'active').map((invite) => {
                    const inviteUrl = `${baseUrl}/join/${invite.invite_code}`
                    const isExpired = invite.expires_at && new Date(invite.expires_at) < new Date()
                    const isMaxedOut = invite.max_uses && invite.use_count >= invite.max_uses

                    return (
                      <div
                        key={invite.id}
                        className={`bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl p-4 ${
                          isExpired || isMaxedOut ? 'opacity-50' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <code className="text-[#5eead4] font-mono text-sm">{invite.invite_code}</code>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                invite.role === 'admin' ? 'bg-[#5eead4]/20 text-[#5eead4]' : 'bg-gray-500/20 text-gray-400'
                              }`}>
                                {invite.role}
                              </span>
                              {invite.email && (
                                <span className="text-xs text-gray-500">
                                  for {invite.email}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>Used: {invite.use_count}{invite.max_uses ? `/${invite.max_uses}` : ''}</span>
                              {invite.expires_at && (
                                <span>
                                  {isExpired ? 'Expired' : `Expires: ${new Date(invite.expires_at).toLocaleDateString()}`}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleCopyInvite(inviteUrl)}
                              className="p-2 rounded-lg hover:bg-[rgba(94,234,212,0.1)] text-gray-400 hover:text-[#5eead4] transition-colors"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleRevokeInvite(invite.id)}
                              className="p-2 rounded-lg hover:bg-gray-500/10 text-gray-400 hover:text-gray-400 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Billing Section */}
        <div className="glass-card">
          <div className="p-6 border-b border-[rgba(94,234,212,0.1)]">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-[#5eead4]" />
              <h2 className="text-xl font-semibold gradient-text">Billing & Subscription</h2>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <span className="text-sm text-gray-400">Current Plan</span>
                <p className="text-white font-medium capitalize">{currentOrganization.subscription_plan}</p>
              </div>
              <div>
                <span className="text-sm text-gray-400">Status</span>
                <p className={`font-medium ${
                  currentOrganization.subscription_status === 'active' ? 'text-[#5eead4]' :
                  currentOrganization.subscription_status === 'trial' ? 'text-[#5eead4]' : 'text-gray-400'
                }`}>
                  {currentOrganization.subscription_status.charAt(0).toUpperCase() + currentOrganization.subscription_status.slice(1)}
                </p>
              </div>
            </div>
            {isOrgOwner && (
              <div className="flex gap-3">
                <button className="btn-primary flex items-center gap-2">
                  Upgrade Plan <ExternalLink className="w-4 h-4" />
                </button>
                <button className="btn-secondary">Manage Billing</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Invite Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Create Invite Link"
      >
        {createdInviteUrl ? (
          <div className="space-y-4">
            <div className="bg-[rgba(94,234,212,0.05)] border border-[rgba(94,234,212,0.2)] rounded-xl p-4">
              <p className="text-sm text-gray-400 mb-2">Share this link with your team:</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={createdInviteUrl}
                  readOnly
                  className="input-field flex-1 text-[#5eead4] font-mono text-sm"
                />
                <button
                  onClick={() => handleCopyInvite(createdInviteUrl)}
                  className="btn-primary p-3"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            <button
              onClick={() => setIsInviteModalOpen(false)}
              className="btn-secondary w-full"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email (optional)
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="input-field"
                placeholder="Leave empty for open invite link"
              />
              <p className="text-xs text-gray-500 mt-1">
                If specified, only this email can use the invite
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'member' | 'admin')}
                className="select-field"
              >
                <option value="member">Member</option>
                {isOrgOwner && <option value="admin">Admin</option>}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Max Uses (optional)
                </label>
                <input
                  type="number"
                  value={inviteMaxUses || ''}
                  onChange={(e) => setInviteMaxUses(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="input-field"
                  placeholder="Unlimited"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Expires In (days)
                </label>
                <input
                  type="number"
                  value={inviteExpiresDays || ''}
                  onChange={(e) => setInviteExpiresDays(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="input-field"
                  placeholder="Never"
                  min="1"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button onClick={() => setIsInviteModalOpen(false)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleCreateInvite} disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />}
                Create Link
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Member Modal */}
      <Modal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        title="Add Team Member"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
            <input
              type="email"
              value={addMemberEmail}
              onChange={(e) => setAddMemberEmail(e.target.value)}
              className="input-field"
              placeholder="colleague@company.com"
            />
            <p className="text-xs text-gray-500 mt-1">
              The user must already have a RevPilot account
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
            <select
              value={addMemberRole}
              onChange={(e) => setAddMemberRole(e.target.value as 'member' | 'admin')}
              className="select-field"
            >
              <option value="member">Member</option>
              {isOrgOwner && <option value="admin">Admin</option>}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button onClick={() => setIsAddMemberModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleAddMember}
              disabled={saving || !addMemberEmail}
              className="btn-primary flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Add Member
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  )
}

// Separate component for creating organization
function CreateOrganizationButton({ onSuccess }: { onSuccess: () => void }) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [billingType, setBillingType] = useState<'org_pays' | 'user_pays'>('org_pays')
  const [saving, setSaving] = useState(false)
  const { showToast } = useToast()

  const handleCreate = async () => {
    if (!name.trim()) return
    setSaving(true)

    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          billing_type: billingType,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create organization')
      }

      showToast('success', 'Organization created!')
      setIsModalOpen(false)
      onSuccess()
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to create organization')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button onClick={() => setIsModalOpen(true)} className="btn-primary">
        <Building2 className="w-4 h-4 inline mr-2" />
        Create Organization
      </button>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Organization">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Organization Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder="Acme Sales Team"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field min-h-[80px]"
              placeholder="Brief description..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Billing Model</label>
            <div className="space-y-2">
              <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                billingType === 'org_pays' ? 'border-[#5eead4] bg-[rgba(94,234,212,0.05)]' : 'border-[rgba(255,255,255,0.1)]'
              }`}>
                <input
                  type="radio"
                  checked={billingType === 'org_pays'}
                  onChange={() => setBillingType('org_pays')}
                  className="mt-1 accent-[#5eead4]"
                />
                <div>
                  <p className="font-medium text-white">Organization Pays</p>
                  <p className="text-sm text-gray-400">You pay for all seats. Best for company-sponsored teams.</p>
                </div>
              </label>
              <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                billingType === 'user_pays' ? 'border-[#5eead4] bg-[rgba(94,234,212,0.05)]' : 'border-[rgba(255,255,255,0.1)]'
              }`}>
                <input
                  type="radio"
                  checked={billingType === 'user_pays'}
                  onChange={() => setBillingType('user_pays')}
                  className="mt-1 accent-[#5eead4]"
                />
                <div>
                  <p className="font-medium text-white">Members Pay Individually</p>
                  <p className="text-sm text-gray-400">Each member pays for their own subscription.</p>
                </div>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button onClick={() => setIsModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button onClick={handleCreate} disabled={saving || !name.trim()} className="btn-primary flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />}
              Create Organization
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
