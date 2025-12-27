'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import {
  Calendar,
  Package,
  Plus,
  Edit2,
  Trash2,
  Save,
  User,
  Trophy,
  Flame,
  Link,
  ExternalLink,
  CheckCircle,
  Eye,
  EyeOff,
  Chrome,
  Download,
  Headphones,
  Zap,
  BookOpen,
  ChevronDown,
  Camera,
  MapPin,
  Globe,
  Linkedin,
  Twitter,
  Users,
  Upload,
  X,
  Loader2,
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import type { Product, Settings, Profile, UserBadge, UserStreak } from '@/types/database'
import { BADGES, getBadgesByCategory } from '@/data/badges'

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [userBadges, setUserBadges] = useState<UserBadge[]>([])
  const [userStreaks, setUserStreaks] = useState<UserStreak[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [fathomApiKey, setFathomApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [fathomConnected, setFathomConnected] = useState(false)
  const [salesMethodology, setSalesMethodology] = useState<'challenger' | 'nepq' | 'hormozi' | 'custom'>('challenger')
  const [customMethodology, setCustomMethodology] = useState('')
  const [methodologyExpanded, setMethodologyExpanded] = useState<string | null>(null)
  const [practiceContext, setPracticeContext] = useState({
    company_description: '',
    product_description: '',
    value_proposition: '',
    target_customers: '',
  })
  const [socialProfile, setSocialProfile] = useState({
    avatar_url: '' as string | null,
    display_name: '',
    title: '',
    bio: '',
    location: '',
    website: '',
    linkedin_url: '',
    twitter_handle: '',
    years_in_sales: '' as string | number,
    is_profile_public: true,
  })
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const { user } = useAuth()
  const { showToast } = useToast()
  const supabase = createClient()

  const fetchData = useCallback(async () => {
    if (!user) return

    try {
      const [settingsRes, productsRes, profileRes, badgesRes, streaksRes, socialProfileRes] = await Promise.all([
        supabase.from('settings').select('*').eq('user_id', user.id).single(),
        supabase.from('products').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('user_badges').select('*').eq('user_id', user.id),
        supabase.from('user_streaks').select('*').eq('user_id', user.id),
        supabase.from('user_profiles_extended').select('*').eq('user_id', user.id).single(),
      ])

      if (settingsRes.data) setSettings(settingsRes.data)
      if (productsRes.data) setProducts(productsRes.data)
      if (profileRes.data) {
        setProfile(profileRes.data)
        if (profileRes.data.fathom_api_key) {
          setFathomApiKey(profileRes.data.fathom_api_key)
          setFathomConnected(true)
        }
        if (profileRes.data.sales_methodology) {
          setSalesMethodology(profileRes.data.sales_methodology)
        }
        if (profileRes.data.custom_methodology) {
          setCustomMethodology(profileRes.data.custom_methodology)
        }
        // Load practice context
        setPracticeContext({
          company_description: profileRes.data.practice_company_description || '',
          product_description: profileRes.data.practice_product_description || '',
          value_proposition: profileRes.data.practice_value_proposition || '',
          target_customers: profileRes.data.practice_target_customers || '',
        })
      }
      if (badgesRes.data) setUserBadges(badgesRes.data)
      if (streaksRes.data) setUserStreaks(streaksRes.data)
      // Load social profile
      if (socialProfileRes.data) {
        setSocialProfile({
          avatar_url: socialProfileRes.data.avatar_url || null,
          display_name: socialProfileRes.data.display_name || '',
          title: socialProfileRes.data.title || '',
          bio: socialProfileRes.data.bio || '',
          location: socialProfileRes.data.location || '',
          website: socialProfileRes.data.website || '',
          linkedin_url: socialProfileRes.data.linkedin_url || '',
          twitter_handle: socialProfileRes.data.twitter_handle || '',
          years_in_sales: socialProfileRes.data.years_in_sales || '',
          is_profile_public: socialProfileRes.data.is_profile_public ?? true,
        })
        if (socialProfileRes.data.avatar_url) {
          setAvatarPreview(socialProfileRes.data.avatar_url)
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [user, supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSaveSettings = async () => {
    if (!settings || !user) return
    setSaving(true)

    try {
      await supabase
        .from('settings')
        .upsert({
          ...settings,
          user_id: user.id,
          updated_at: new Date().toISOString(),
        })

      showToast('success', 'Settings saved successfully')
    } catch (error) {
      showToast('error', 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!profile || !user) return
    setSaving(true)

    try {
      await supabase
        .from('profiles')
        .upsert({
          ...profile,
          id: user.id,
          updated_at: new Date().toISOString(),
        })

      showToast('success', 'Profile saved successfully')
    } catch (error) {
      showToast('error', 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveFathom = async () => {
    if (!user) return
    setSaving(true)

    try {
      await supabase
        .from('profiles')
        .update({
          fathom_api_key: fathomApiKey || null,
          fathom_connected_at: fathomApiKey ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      setFathomConnected(!!fathomApiKey)
      showToast('success', fathomApiKey ? 'Fathom connected successfully' : 'Fathom disconnected')
    } catch (error) {
      showToast('error', 'Failed to save Fathom API key')
    } finally {
      setSaving(false)
    }
  }

  const handleDisconnectFathom = async () => {
    if (!confirm('Are you sure you want to disconnect Fathom?')) return
    setFathomApiKey('')
    await handleSaveFathom()
  }

  const handleSaveMethodology = async () => {
    if (!user) return
    setSaving(true)

    try {
      await supabase
        .from('profiles')
        .update({
          sales_methodology: salesMethodology,
          custom_methodology: salesMethodology === 'custom' ? customMethodology : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      showToast('success', 'Sales methodology saved successfully')
    } catch (error) {
      showToast('error', 'Failed to save methodology')
    } finally {
      setSaving(false)
    }
  }

  const handleSavePracticeContext = async () => {
    if (!user) return
    setSaving(true)

    try {
      await supabase
        .from('profiles')
        .update({
          practice_company_description: practiceContext.company_description || null,
          practice_product_description: practiceContext.product_description || null,
          practice_value_proposition: practiceContext.value_proposition || null,
          practice_target_customers: practiceContext.target_customers || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      showToast('success', 'Practice context saved successfully')
    } catch (error) {
      showToast('error', 'Failed to save practice context')
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    // Preview
    const reader = new FileReader()
    reader.onload = (e) => setAvatarPreview(e.target?.result as string)
    reader.readAsDataURL(file)

    setUploadingAvatar(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/community/profile/avatar', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to upload avatar')
      }

      const data = await response.json()
      setSocialProfile(prev => ({ ...prev, avatar_url: data.avatar_url }))
      showToast('success', 'Profile photo updated!')
    } catch (error) {
      console.error('Avatar upload error:', error)
      showToast('error', error instanceof Error ? error.message : 'Failed to upload photo')
      // Reset preview on error
      setAvatarPreview(socialProfile.avatar_url)
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleRemoveAvatar = async () => {
    if (!confirm('Are you sure you want to remove your profile photo?')) return

    setUploadingAvatar(true)
    try {
      const response = await fetch('/api/community/profile/avatar', {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to remove avatar')
      }

      setSocialProfile(prev => ({ ...prev, avatar_url: null }))
      setAvatarPreview(null)
      showToast('success', 'Profile photo removed')
    } catch (error) {
      showToast('error', 'Failed to remove photo')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleSaveSocialProfile = async () => {
    if (!user) return
    setSaving(true)

    try {
      const response = await fetch('/api/community/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: socialProfile.title || null,
          bio: socialProfile.bio || null,
          display_name: socialProfile.display_name || null,
          location: socialProfile.location || null,
          website: socialProfile.website || null,
          linkedin_url: socialProfile.linkedin_url || null,
          twitter_handle: socialProfile.twitter_handle || null,
          years_in_sales: socialProfile.years_in_sales ? Number(socialProfile.years_in_sales) : null,
          is_profile_public: socialProfile.is_profile_public,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save profile')
      }

      showToast('success', 'Social profile saved successfully!')
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const handleAddProduct = () => {
    setEditingProduct(null)
    setIsProductModalOpen(true)
  }

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product)
    setIsProductModalOpen(true)
  }

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return

    try {
      await supabase.from('products').delete().eq('id', productId)
      showToast('success', 'Product deleted successfully')
      fetchData()
    } catch (error) {
      showToast('error', 'Failed to delete product')
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

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-gray-400">Manage your account and preferences</p>
        </div>

        {/* Profile Section */}
        <div className="glass-card">
          <div className="p-6 border-b border-[rgba(94,234,212,0.1)]">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-[#5eead4]" />
              <h2 className="text-xl font-semibold gradient-text">Profile</h2>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                <input
                  type="text"
                  value={profile?.full_name || ''}
                  onChange={(e) => setProfile(prev => prev ? { ...prev, full_name: e.target.value } : null)}
                  className="input-field"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Company Name</label>
                <input
                  type="text"
                  value={profile?.company_name || ''}
                  onChange={(e) => setProfile(prev => prev ? { ...prev, company_name: e.target.value } : null)}
                  className="input-field"
                  placeholder="Your Company"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  value={profile?.email || ''}
                  className="input-field opacity-50"
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={handleSaveProfile} disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? (
                  <div className="w-5 h-5 border-2 border-[#0a0a0f] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Profile
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Social Profile Section */}
        <div className="glass-card">
          <div className="p-6 border-b border-[rgba(94,234,212,0.1)] bg-gradient-to-r from-[rgba(94,234,212,0.05)] to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5eead4] to-[#2dd4bf] flex items-center justify-center">
                <Users className="w-5 h-5 text-[#0f172a]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold gradient-text">Social Profile</h2>
                <p className="text-gray-400 text-sm">Set up your public profile for the community</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-6">
            {/* Avatar Upload */}
            <div className="flex items-start gap-6">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-[rgba(94,234,212,0.1)] border-2 border-[rgba(94,234,212,0.2)] flex items-center justify-center">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-10 h-10 text-[#5eead4]" />
                  )}
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#5eead4] flex items-center justify-center cursor-pointer hover:bg-[#2dd4bf] transition-colors">
                  <Camera className="w-4 h-4 text-[#0f172a]" />
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    disabled={uploadingAvatar}
                  />
                </label>
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-white mb-1">Profile Photo</h3>
                <p className="text-sm text-gray-400 mb-3">
                  Upload a photo to personalize your profile. Max 5MB, JPEG/PNG/WebP/GIF.
                </p>
                <div className="flex gap-2">
                  <label className="btn-secondary text-sm py-2 px-4 cursor-pointer inline-flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Upload Photo
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleAvatarUpload}
                      className="hidden"
                      disabled={uploadingAvatar}
                    />
                  </label>
                  {avatarPreview && (
                    <button
                      onClick={handleRemoveAvatar}
                      disabled={uploadingAvatar}
                      className="text-sm py-2 px-4 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Profile Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Display Name</label>
                <input
                  type="text"
                  value={socialProfile.display_name}
                  onChange={(e) => setSocialProfile(prev => ({ ...prev, display_name: e.target.value }))}
                  className="input-field"
                  placeholder="How you want to be known"
                />
                <p className="text-xs text-gray-500 mt-1">Leave blank to use your full name</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Title / Headline</label>
                <input
                  type="text"
                  value={socialProfile.title}
                  onChange={(e) => setSocialProfile(prev => ({ ...prev, title: e.target.value }))}
                  className="input-field"
                  placeholder="e.g., Enterprise Account Executive"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Bio</label>
              <textarea
                value={socialProfile.bio}
                onChange={(e) => setSocialProfile(prev => ({ ...prev, bio: e.target.value }))}
                className="input-field min-h-[100px] resize-y"
                placeholder="Tell the community about yourself, your sales experience, and what you're working on..."
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">{socialProfile.bio.length}/500 characters</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Location
                </label>
                <input
                  type="text"
                  value={socialProfile.location}
                  onChange={(e) => setSocialProfile(prev => ({ ...prev, location: e.target.value }))}
                  className="input-field"
                  placeholder="e.g., San Francisco, CA"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Globe className="w-4 h-4 inline mr-1" />
                  Website
                </label>
                <input
                  type="url"
                  value={socialProfile.website}
                  onChange={(e) => setSocialProfile(prev => ({ ...prev, website: e.target.value }))}
                  className="input-field"
                  placeholder="https://yourwebsite.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Linkedin className="w-4 h-4 inline mr-1" />
                  LinkedIn URL
                </label>
                <input
                  type="url"
                  value={socialProfile.linkedin_url}
                  onChange={(e) => setSocialProfile(prev => ({ ...prev, linkedin_url: e.target.value }))}
                  className="input-field"
                  placeholder="https://linkedin.com/in/yourprofile"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Twitter className="w-4 h-4 inline mr-1" />
                  X (Twitter) Handle
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">@</span>
                  <input
                    type="text"
                    value={socialProfile.twitter_handle}
                    onChange={(e) => setSocialProfile(prev => ({ ...prev, twitter_handle: e.target.value.replace('@', '') }))}
                    className="input-field pl-8"
                    placeholder="yourhandle"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Years in Sales</label>
                <select
                  value={socialProfile.years_in_sales}
                  onChange={(e) => setSocialProfile(prev => ({ ...prev, years_in_sales: e.target.value }))}
                  className="select-field"
                >
                  <option value="">Select experience level</option>
                  <option value="1">Less than 1 year</option>
                  <option value="2">1-2 years</option>
                  <option value="3">3-5 years</option>
                  <option value="7">5-10 years</option>
                  <option value="15">10-20 years</option>
                  <option value="25">20+ years</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Profile Visibility</label>
                <div className="flex items-center gap-3 mt-3">
                  <button
                    type="button"
                    onClick={() => setSocialProfile(prev => ({ ...prev, is_profile_public: !prev.is_profile_public }))}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      socialProfile.is_profile_public ? 'bg-[#5eead4]' : 'bg-gray-600'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      socialProfile.is_profile_public ? 'left-7' : 'left-1'
                    }`} />
                  </button>
                  <span className="text-gray-300">
                    {socialProfile.is_profile_public ? 'Public' : 'Private'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {socialProfile.is_profile_public
                    ? 'Your profile is visible to all community members'
                    : 'Only you can see your profile'}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-[rgba(94,234,212,0.1)]">
              <button
                onClick={handleSaveSocialProfile}
                disabled={saving}
                className="btn-primary flex items-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Social Profile
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Sales Practice Context */}
        <div className="glass-card">
          <div className="p-6 border-b border-[rgba(94,234,212,0.1)] bg-gradient-to-r from-[rgba(94,234,212,0.05)] to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5eead4] to-[#4fd1c5] flex items-center justify-center">
                <Zap className="w-5 h-5 text-[#0a0f1c]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold gradient-text">Sales Practice Context</h2>
                <p className="text-gray-400 text-sm">Customize AI personas to understand your product</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <p className="text-gray-400 text-sm">
              Tell us about your company and product so AI personas can respond realistically to your pitch during practice calls.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  What does your company do?
                </label>
                <textarea
                  value={practiceContext.company_description}
                  onChange={(e) => setPracticeContext(prev => ({ ...prev, company_description: e.target.value }))}
                  className="input-field min-h-[80px] resize-y"
                  placeholder="e.g., We're a B2B SaaS company that helps sales teams automate their outreach and track performance metrics..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  What product/service do you sell?
                </label>
                <textarea
                  value={practiceContext.product_description}
                  onChange={(e) => setPracticeContext(prev => ({ ...prev, product_description: e.target.value }))}
                  className="input-field min-h-[80px] resize-y"
                  placeholder="e.g., Our main product is a sales engagement platform with AI-powered email sequences, call recording, and analytics dashboard..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  What&apos;s your key value proposition?
                </label>
                <textarea
                  value={practiceContext.value_proposition}
                  onChange={(e) => setPracticeContext(prev => ({ ...prev, value_proposition: e.target.value }))}
                  className="input-field min-h-[80px] resize-y"
                  placeholder="e.g., We help sales teams close 30% more deals by automating follow-ups and providing real-time coaching during calls..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Who are your target customers?
                </label>
                <textarea
                  value={practiceContext.target_customers}
                  onChange={(e) => setPracticeContext(prev => ({ ...prev, target_customers: e.target.value }))}
                  className="input-field min-h-[80px] resize-y"
                  placeholder="e.g., Mid-market B2B companies with 10-50 person sales teams, typically in tech, financial services, or professional services..."
                />
              </div>
            </div>

            <div className="bg-[rgba(255,152,85,0.05)] border border-[rgba(255,152,85,0.1)] rounded-xl p-4">
              <h4 className="font-medium text-white mb-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-[#ff9855]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                How this is used
              </h4>
              <p className="text-sm text-gray-400">
                During practice calls, AI personas will understand what you&apos;re selling and respond with realistic objections
                and questions specific to your product. For example, they might ask about pricing, implementation time,
                or how you compare to competitors in your space.
              </p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSavePracticeContext}
                disabled={saving}
                className="btn-primary flex items-center gap-2"
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-[#0a0a0f] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Practice Context
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Commission Pay Schedule */}
        <div className="glass-card">
          <div className="p-6 border-b border-[rgba(94,234,212,0.1)]">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-[#5eead4]" />
              <h2 className="text-xl font-semibold gradient-text">Commission Pay Schedule</h2>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Pay Day</label>
                <select
                  value={settings?.commission_pay_day || 15}
                  onChange={(e) => setSettings(prev => prev ? { ...prev, commission_pay_day: parseInt(e.target.value) } : null)}
                  className="select-field"
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>
                      {day === 1 ? '1st' : day === 2 ? '2nd' : day === 3 ? '3rd' : `${day}th`} of the month
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">When your company pays commissions</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Pay Frequency</label>
                <select
                  value={settings?.commission_pay_frequency || 'monthly'}
                  onChange={(e) => setSettings(prev => prev ? { ...prev, commission_pay_frequency: e.target.value } : null)}
                  className="select-field"
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">How often you receive commissions</p>
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={handleSaveSettings} disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? (
                  <div className="w-5 h-5 border-2 border-[#0a0a0f] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Settings
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Saved Products */}
        <div className="glass-card">
          <div className="p-6 border-b border-[rgba(94,234,212,0.1)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-[#5eead4]" />
              <h2 className="text-xl font-semibold gradient-text">Saved Products</h2>
            </div>
            <button onClick={handleAddProduct} className="btn-secondary flex items-center gap-2 text-sm py-2 px-4">
              <Plus className="w-4 h-4" />
              Add Product
            </button>
          </div>
          <div className="p-6">
            {products.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 mb-4">No saved products yet</p>
                <button onClick={handleAddProduct} className="btn-secondary text-sm">
                  Add Your First Product
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="bg-[rgba(94,234,212,0.02)] border border-[rgba(94,234,212,0.1)] rounded-xl p-4 flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium text-white mb-1">{product.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span>{formatCurrency(product.default_price)}</span>
                        <span>{product.default_commission_percent}% commission</span>
                        <span>{product.default_payment_count} payments</span>
                        <span className="capitalize">{product.default_payment_cycle}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditProduct(product)}
                        className="p-2 rounded-lg hover:bg-[rgba(94,234,212,0.1)] text-gray-400 hover:text-[#5eead4] transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="p-2 rounded-lg hover:bg-[rgba(255,0,67,0.1)] text-gray-400 hover:text-[#ff6b8a] transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Live Coaching Chrome Extension */}
        <div className="glass-card overflow-hidden">
          <div className="p-6 border-b border-[rgba(94,234,212,0.1)] bg-gradient-to-r from-[rgba(94,234,212,0.05)] to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5eead4] to-[#4fd1c5] flex items-center justify-center">
                <Headphones className="w-5 h-5 text-[#0a0f1c]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold gradient-text">Live Sales Coaching</h2>
                <p className="text-gray-400 text-sm">Get real-time AI coaching during your Zoom calls</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-6">
            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl p-4">
                <Zap className="w-6 h-6 text-[#5eead4] mb-2" />
                <h4 className="font-medium text-white mb-1">Real-Time Suggestions</h4>
                <p className="text-sm text-gray-400">Get coaching tips and follow-up questions as you talk</p>
              </div>
              <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl p-4">
                <svg className="w-6 h-6 text-[#5eead4] mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <h4 className="font-medium text-white mb-1">Objection Handling</h4>
                <p className="text-sm text-gray-400">AI detects objections and suggests responses</p>
              </div>
              <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl p-4">
                <svg className="w-6 h-6 text-[#5eead4] mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h4 className="font-medium text-white mb-1">Talk Ratio Tracking</h4>
                <p className="text-sm text-gray-400">Monitor how much you talk vs listen</p>
              </div>
            </div>

            {/* Installation Instructions */}
            <div className="bg-[rgba(94,234,212,0.05)] border border-[rgba(94,234,212,0.1)] rounded-xl p-6">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <Chrome className="w-5 h-5" />
                Install Chrome Extension
              </h3>

              {/* Chrome Web Store - Primary Install */}
              <div className="mb-6">
                <p className="text-gray-400 text-sm mb-4">
                  Install directly from the Chrome Web Store with one click:
                </p>
                <a
                  href="https://chromewebstore.google.com/detail/revpilot-sales-coach/EXTENSION_ID_HERE"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary inline-flex items-center gap-2 text-base px-6 py-3"
                >
                  <Chrome className="w-5 h-5" />
                  Add to Chrome — It&apos;s Free
                </a>
              </div>

              {/* Quick Start Steps */}
              <div className="border-t border-[rgba(94,234,212,0.1)] pt-4">
                <p className="text-white font-medium mb-3">After installing:</p>
                <ol className="space-y-2 text-sm">
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#5eead4] text-[#0a0f1c] flex items-center justify-center font-bold text-xs">1</span>
                    <p className="text-gray-400">Click the extension icon and log in with your RevPilot account</p>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#5eead4] text-[#0a0f1c] flex items-center justify-center font-bold text-xs">2</span>
                    <p className="text-gray-400">Join a Zoom call in Chrome (use web client, not desktop app)</p>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#5eead4] text-[#0a0f1c] flex items-center justify-center font-bold text-xs">3</span>
                    <p className="text-gray-400">Click &quot;Start Coaching&quot; in the overlay and get real-time tips!</p>
                  </li>
                </ol>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="https://zoom.us/wc/join"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary inline-flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Zoom Web
                </a>
              </div>

              {/* Manual Install Fallback */}
              <details className="mt-6 text-sm">
                <summary className="text-gray-500 hover:text-gray-300 cursor-pointer">
                  Manual installation (for developers)
                </summary>
                <div className="mt-3 pl-4 border-l border-gray-700 text-gray-400 space-y-2">
                  <p>1. <a href="/downloads/revpilot-extension.zip" download className="text-[#5eead4] hover:underline">Download the extension ZIP</a></p>
                  <p>2. Extract the ZIP file</p>
                  <p>3. Go to <code className="bg-[rgba(255,255,255,0.1)] px-2 py-0.5 rounded">chrome://extensions</code></p>
                  <p>4. Enable &quot;Developer mode&quot; (top right)</p>
                  <p>5. Click &quot;Load unpacked&quot; and select the extracted folder</p>
                </div>
              </details>
            </div>

            {/* Pro Tips */}
            <div className="bg-[rgba(255,152,85,0.05)] border border-[rgba(255,152,85,0.1)] rounded-xl p-4">
              <h4 className="font-medium text-white mb-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-[#ff9855]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Pro Tips
              </h4>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Use Zoom in Chrome (not the desktop app) for the overlay to work</li>
                <li>• Pin the extension icon for quick access</li>
                <li>• The coaching panel is only visible to you, not other call participants</li>
                <li>• Drag the panel to reposition it on your screen</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Sales Training Manual */}
        <div className="glass-card overflow-hidden">
          <div className="p-6 border-b border-[rgba(94,234,212,0.1)] bg-gradient-to-r from-[rgba(94,234,212,0.05)] to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5eead4] to-[#4fd1c5] flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-[#0a0f1c]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold gradient-text">Sales Training Manual</h2>
                <p className="text-gray-400 text-sm">Train the AI to coach you based on your preferred sales methodology</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <p className="text-gray-400 text-sm">
              Select a proven sales methodology or create your own custom approach. The AI will use this framework
              to provide relevant coaching suggestions during your calls.
            </p>

            {/* Methodology Options */}
            <div className="space-y-3">
              {/* Challenger Sale */}
              <div
                className={`border rounded-xl overflow-hidden transition-all cursor-pointer ${
                  salesMethodology === 'challenger'
                    ? 'border-[#5eead4] bg-[rgba(94,234,212,0.05)]'
                    : 'border-[rgba(255,255,255,0.1)] hover:border-[rgba(94,234,212,0.3)]'
                }`}
              >
                <div
                  className="p-4 flex items-start gap-4"
                  onClick={() => setSalesMethodology('challenger')}
                >
                  <input
                    type="radio"
                    name="methodology"
                    checked={salesMethodology === 'challenger'}
                    onChange={() => setSalesMethodology('challenger')}
                    className="mt-1 accent-[#5eead4]"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-white">The Challenger Sale</h3>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setMethodologyExpanded(methodologyExpanded === 'challenger' ? null : 'challenger')
                        }}
                        className="text-gray-400 hover:text-white"
                      >
                        <ChevronDown className={`w-5 h-5 transition-transform ${methodologyExpanded === 'challenger' ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">Challenge customer assumptions with insights. Teach, tailor, and take control.</p>
                    <p className="text-xs text-gray-500 mt-1">By Matthew Dixon & Brent Adamson</p>
                  </div>
                </div>
                {methodologyExpanded === 'challenger' && (
                  <div className="px-4 pb-4 border-t border-[rgba(255,255,255,0.05)] pt-4 ml-8">
                    <h4 className="text-sm font-medium text-white mb-2">Key Principles:</h4>
                    <ul className="text-sm text-gray-400 space-y-1">
                      <li>• <strong>Teach:</strong> Bring new insights that reframe how customers think</li>
                      <li>• <strong>Tailor:</strong> Customize your message to each stakeholder</li>
                      <li>• <strong>Take Control:</strong> Lead the conversation assertively, not aggressively</li>
                      <li>• <strong>Create Tension:</strong> Push prospects out of their comfort zone</li>
                      <li>• <strong>Reframe Problems:</strong> Help them see issues in a new light</li>
                    </ul>
                    <p className="text-xs text-gray-500 mt-3">Best for: Complex B2B sales, multiple decision-makers, differentiated solutions</p>
                  </div>
                )}
              </div>

              {/* NEPQ */}
              <div
                className={`border rounded-xl overflow-hidden transition-all cursor-pointer ${
                  salesMethodology === 'nepq'
                    ? 'border-[#5eead4] bg-[rgba(94,234,212,0.05)]'
                    : 'border-[rgba(255,255,255,0.1)] hover:border-[rgba(94,234,212,0.3)]'
                }`}
              >
                <div
                  className="p-4 flex items-start gap-4"
                  onClick={() => setSalesMethodology('nepq')}
                >
                  <input
                    type="radio"
                    name="methodology"
                    checked={salesMethodology === 'nepq'}
                    onChange={() => setSalesMethodology('nepq')}
                    className="mt-1 accent-[#5eead4]"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-white">NEPQ (Neuro-Emotional Persuasion Questioning)</h3>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setMethodologyExpanded(methodologyExpanded === 'nepq' ? null : 'nepq')
                        }}
                        className="text-gray-400 hover:text-white"
                      >
                        <ChevronDown className={`w-5 h-5 transition-transform ${methodologyExpanded === 'nepq' ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">Let prospects sell themselves through strategic questioning sequences.</p>
                    <p className="text-xs text-gray-500 mt-1">By Jeremy Miner (7th Level)</p>
                  </div>
                </div>
                {methodologyExpanded === 'nepq' && (
                  <div className="px-4 pb-4 border-t border-[rgba(255,255,255,0.05)] pt-4 ml-8">
                    <h4 className="text-sm font-medium text-white mb-2">The NEPQ Question Sequence:</h4>
                    <ul className="text-sm text-gray-400 space-y-1">
                      <li>1. <strong>Connection Questions:</strong> Build rapport and establish trust</li>
                      <li>2. <strong>Situation Questions:</strong> Understand their current state</li>
                      <li>3. <strong>Problem Awareness:</strong> Help them discover hidden problems</li>
                      <li>4. <strong>Solution Awareness:</strong> Guide them to see the path forward</li>
                      <li>5. <strong>Consequence Questions:</strong> Make them feel the cost of inaction</li>
                      <li>6. <strong>Commitment Questions:</strong> Let them decide on their own</li>
                    </ul>
                    <p className="text-xs text-gray-500 mt-3">Best for: High-ticket sales, reducing resistance, building trust quickly</p>
                  </div>
                )}
              </div>

              {/* Hormozi Method */}
              <div
                className={`border rounded-xl overflow-hidden transition-all cursor-pointer ${
                  salesMethodology === 'hormozi'
                    ? 'border-[#5eead4] bg-[rgba(94,234,212,0.05)]'
                    : 'border-[rgba(255,255,255,0.1)] hover:border-[rgba(94,234,212,0.3)]'
                }`}
              >
                <div
                  className="p-4 flex items-start gap-4"
                  onClick={() => setSalesMethodology('hormozi')}
                >
                  <input
                    type="radio"
                    name="methodology"
                    checked={salesMethodology === 'hormozi'}
                    onChange={() => setSalesMethodology('hormozi')}
                    className="mt-1 accent-[#5eead4]"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-white">Hormozi Method (CLOSER Framework)</h3>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setMethodologyExpanded(methodologyExpanded === 'hormozi' ? null : 'hormozi')
                        }}
                        className="text-gray-400 hover:text-white"
                      >
                        <ChevronDown className={`w-5 h-5 transition-transform ${methodologyExpanded === 'hormozi' ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">Make offers so good people feel stupid saying no. Master objection handling.</p>
                    <p className="text-xs text-gray-500 mt-1">By Alex Hormozi ($100M Offers)</p>
                  </div>
                </div>
                {methodologyExpanded === 'hormozi' && (
                  <div className="px-4 pb-4 border-t border-[rgba(255,255,255,0.05)] pt-4 ml-8">
                    <h4 className="text-sm font-medium text-white mb-2">CLOSER Framework:</h4>
                    <ul className="text-sm text-gray-400 space-y-1">
                      <li>• <strong>C - Clarify:</strong> Who are they? Why are they here?</li>
                      <li>• <strong>L - Label:</strong> Name their problem clearly</li>
                      <li>• <strong>O - Overview:</strong> Explore past failures (Circle of Pain)</li>
                      <li>• <strong>S - Sell:</strong> Present your solution with the Value Equation</li>
                      <li>• <strong>E - Explain:</strong> Break down exactly what they get</li>
                      <li>• <strong>R - Reinforce:</strong> Affirm their decision, build certainty</li>
                    </ul>
                    <h4 className="text-sm font-medium text-white mt-3 mb-2">AAA Objection Handling:</h4>
                    <ul className="text-sm text-gray-400 space-y-1">
                      <li>• <strong>Acknowledge:</strong> Repeat their concern neutrally</li>
                      <li>• <strong>Associate:</strong> Connect to past success stories</li>
                      <li>• <strong>Ask:</strong> Confidently ask for the sale again</li>
                    </ul>
                    <p className="text-xs text-gray-500 mt-3">Best for: High-value offers, persistent closing, overcoming objections</p>
                  </div>
                )}
              </div>

              {/* Custom Methodology */}
              <div
                className={`border rounded-xl overflow-hidden transition-all ${
                  salesMethodology === 'custom'
                    ? 'border-[#5eead4] bg-[rgba(94,234,212,0.05)]'
                    : 'border-[rgba(255,255,255,0.1)] hover:border-[rgba(94,234,212,0.3)]'
                }`}
              >
                <div
                  className="p-4 flex items-start gap-4 cursor-pointer"
                  onClick={() => setSalesMethodology('custom')}
                >
                  <input
                    type="radio"
                    name="methodology"
                    checked={salesMethodology === 'custom'}
                    onChange={() => setSalesMethodology('custom')}
                    className="mt-1 accent-[#5eead4]"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">Custom Methodology</h3>
                    <p className="text-sm text-gray-400 mt-1">Define your own sales philosophy and coaching approach</p>
                  </div>
                </div>
                {salesMethodology === 'custom' && (
                  <div className="px-4 pb-4 border-t border-[rgba(255,255,255,0.05)] pt-4 ml-8">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Describe your sales methodology and how you want the AI to coach you:
                    </label>
                    <textarea
                      value={customMethodology}
                      onChange={(e) => setCustomMethodology(e.target.value)}
                      className="input-field min-h-[150px] resize-y"
                      placeholder={`Example:
- Ask discovery questions before presenting solutions
- Focus on understanding pain points deeply
- Use the "Feel, Felt, Found" technique for objections
- Always confirm budget early in the conversation
- End each call with clear next steps
- Use assumptive closing techniques
- Key phrases to use: "What would it mean for you if..."
- Avoid: talking about features before understanding needs`}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Be specific about what coaching tips you want, question styles, objection handling approaches, and closing techniques.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveMethodology}
                disabled={saving}
                className="btn-primary flex items-center gap-2"
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-[#0a0a0f] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Methodology
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Fathom Integration */}
        <div className="glass-card">
          <div className="p-6 border-b border-[rgba(94,234,212,0.1)]">
            <div className="flex items-center gap-3">
              <Link className="w-5 h-5 text-[#5eead4]" />
              <h2 className="text-xl font-semibold gradient-text">Fathom Integration</h2>
              {fathomConnected && (
                <span className="flex items-center gap-1 text-sm bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
                  <CheckCircle className="w-3 h-3" />
                  Connected
                </span>
              )}
            </div>
            <p className="text-gray-400 text-sm mt-1">
              Connect your Fathom account to import and analyze your sales calls
            </p>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Fathom API Key</label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={fathomApiKey}
                    onChange={(e) => setFathomApiKey(e.target.value)}
                    className="input-field pr-10"
                    placeholder="Enter your Fathom API key"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  onClick={handleSaveFathom}
                  disabled={saving}
                  className="btn-primary flex items-center gap-2"
                >
                  {saving ? (
                    <div className="w-5 h-5 border-2 border-[#0a0a0f] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {fathomConnected ? 'Update' : 'Connect'}
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Get your API key from{' '}
                <a
                  href="https://fathom.video/settings/integrations"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#5eead4] hover:underline inline-flex items-center gap-1"
                >
                  Fathom Settings <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>

            {fathomConnected && (
              <div className="flex items-center justify-between bg-[rgba(94,234,212,0.05)] border border-[rgba(94,234,212,0.1)] rounded-xl p-4">
                <div>
                  <p className="text-white font-medium">Fathom is connected</p>
                  <p className="text-sm text-gray-400">You can now import calls from the Call Review page</p>
                </div>
                <button
                  onClick={handleDisconnectFathom}
                  className="text-sm text-red-400 hover:text-red-300 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Badges & Achievements */}
        <div className="glass-card">
          <div className="p-6 border-b border-[rgba(94,234,212,0.1)]">
            <div className="flex items-center gap-3">
              <Trophy className="w-5 h-5 text-[#5eead4]" />
              <h2 className="text-xl font-semibold gradient-text">Badges & Achievements</h2>
            </div>
            <p className="text-gray-400 text-sm mt-1">
              Track your progress and earn badges for your accomplishments
            </p>
          </div>

          {/* Current Streaks */}
          <div className="p-6 border-b border-[rgba(94,234,212,0.1)]">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" />
              Current Streaks
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['journal', 'habits', 'metrics', 'login'].map((streakType) => {
                const streak = userStreaks.find((s) => s.streak_type === streakType)
                const labels: Record<string, string> = {
                  journal: 'Journal',
                  habits: 'Habits',
                  metrics: 'Metrics',
                  login: 'Login',
                }
                return (
                  <div
                    key={streakType}
                    className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl p-4 text-center"
                  >
                    <p className="text-gray-400 text-sm mb-1">{labels[streakType]}</p>
                    <p className="text-2xl font-bold text-white">
                      {streak?.current_streak || 0}
                      <span className="text-sm font-normal text-gray-500 ml-1">days</span>
                    </p>
                    {streak?.longest_streak ? (
                      <p className="text-xs text-gray-500 mt-1">
                        Best: {streak.longest_streak} days
                      </p>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Badge Categories */}
          <div className="p-6 space-y-8">
            {/* Streak Badges */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Streak Badges</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {getBadgesByCategory('streak').map((badge) => {
                  const isEarned = userBadges.some((ub) => ub.badge_id === badge.id)
                  return (
                    <div
                      key={badge.id}
                      className={`rounded-xl p-4 text-center transition-all ${
                        isEarned
                          ? 'bg-[rgba(94,234,212,0.1)] border border-[rgba(94,234,212,0.3)]'
                          : 'bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] opacity-50'
                      }`}
                    >
                      <div className={`text-3xl mb-2 ${isEarned ? '' : 'grayscale'}`}>
                        {badge.icon}
                      </div>
                      <h4 className={`font-medium ${isEarned ? 'text-white' : 'text-gray-500'}`}>
                        {badge.name}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">{badge.description}</p>
                      {isEarned && (
                        <span className="inline-block mt-2 text-xs bg-[#5eead4]/20 text-[#5eead4] px-2 py-1 rounded-full">
                          Earned!
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Achievement Badges */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Achievement Badges</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {getBadgesByCategory('achievement').map((badge) => {
                  const isEarned = userBadges.some((ub) => ub.badge_id === badge.id)
                  return (
                    <div
                      key={badge.id}
                      className={`rounded-xl p-4 transition-all ${
                        isEarned
                          ? 'bg-[rgba(94,234,212,0.1)] border border-[rgba(94,234,212,0.3)]'
                          : 'bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] opacity-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`text-2xl ${isEarned ? '' : 'grayscale'}`}>
                          {badge.icon}
                        </div>
                        <div className="flex-1">
                          <h4 className={`font-medium ${isEarned ? 'text-white' : 'text-gray-500'}`}>
                            {badge.name}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">{badge.requirement}</p>
                          {isEarned && (
                            <span className="inline-block mt-2 text-xs bg-[#5eead4]/20 text-[#5eead4] px-2 py-1 rounded-full">
                              Earned!
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Milestone Badges */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Milestone Badges</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {getBadgesByCategory('milestone').map((badge) => {
                  const isEarned = userBadges.some((ub) => ub.badge_id === badge.id)
                  return (
                    <div
                      key={badge.id}
                      className={`rounded-xl p-4 transition-all ${
                        isEarned
                          ? 'bg-[rgba(94,234,212,0.1)] border border-[rgba(94,234,212,0.3)]'
                          : 'bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] opacity-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`text-2xl ${isEarned ? '' : 'grayscale'}`}>
                          {badge.icon}
                        </div>
                        <div className="flex-1">
                          <h4 className={`font-medium ${isEarned ? 'text-white' : 'text-gray-500'}`}>
                            {badge.name}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">{badge.requirement}</p>
                          {isEarned && (
                            <span className="inline-block mt-2 text-xs bg-[#5eead4]/20 text-[#5eead4] px-2 py-1 rounded-full">
                              Earned!
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Stats Summary */}
            <div className="bg-[rgba(94,234,212,0.05)] border border-[rgba(94,234,212,0.1)] rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Badges Earned</p>
                  <p className="text-3xl font-bold text-[#5eead4]">
                    {userBadges.length} / {BADGES.length}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-sm">Completion</p>
                  <p className="text-3xl font-bold text-white">
                    {Math.round((userBadges.length / BADGES.length) * 100)}%
                  </p>
                </div>
              </div>
              <div className="mt-4 bg-[rgba(255,255,255,0.1)] rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#5eead4] to-[#4fd1c5] transition-all duration-500"
                  style={{ width: `${(userBadges.length / BADGES.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Modal */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        product={editingProduct}
        userId={user?.id || ''}
        onSuccess={() => {
          fetchData()
          setIsProductModalOpen(false)
        }}
      />
    </DashboardLayout>
  )
}

// Product Modal Component
interface ProductModalProps {
  isOpen: boolean
  onClose: () => void
  product: Product | null
  userId: string
  onSuccess: () => void
}

function ProductModal({ isOpen, onClose, product, userId, onSuccess }: ProductModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    default_price: '',
    default_commission_percent: '',
    default_payment_count: '1',
    default_payment_cycle: 'monthly',
  })
  const [loading, setLoading] = useState(false)

  const { showToast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        default_price: product.default_price.toString(),
        default_commission_percent: product.default_commission_percent.toString(),
        default_payment_count: product.default_payment_count.toString(),
        default_payment_cycle: product.default_payment_cycle,
      })
    } else {
      setFormData({
        name: '',
        default_price: '',
        default_commission_percent: '',
        default_payment_count: '1',
        default_payment_cycle: 'monthly',
      })
    }
  }, [product, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const productData = {
        user_id: userId,
        name: formData.name,
        default_price: parseFloat(formData.default_price),
        default_commission_percent: parseFloat(formData.default_commission_percent),
        default_payment_count: parseInt(formData.default_payment_count),
        default_payment_cycle: formData.default_payment_cycle,
      }

      if (product) {
        await supabase.from('products').update(productData).eq('id', product.id)
        showToast('success', 'Product updated successfully')
      } else {
        await supabase.from('products').insert(productData)
        showToast('success', 'Product added successfully')
      }

      onSuccess()
    } catch (error) {
      showToast('error', 'Failed to save product')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={product ? 'Edit Product' : 'Add Product'}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Product Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            className="input-field"
            placeholder="Premium Coaching Package"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Default Price</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                value={formData.default_price}
                onChange={(e) => setFormData((prev) => ({ ...prev, default_price: e.target.value }))}
                className="input-field pl-8"
                placeholder="3000"
                step="0.01"
                min="0"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Commission %</label>
            <div className="relative">
              <input
                type="number"
                value={formData.default_commission_percent}
                onChange={(e) => setFormData((prev) => ({ ...prev, default_commission_percent: e.target.value }))}
                className="input-field pr-8"
                placeholder="10"
                step="0.1"
                min="0"
                max="100"
                required
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">%</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Payment Count</label>
            <input
              type="number"
              value={formData.default_payment_count}
              onChange={(e) => setFormData((prev) => ({ ...prev, default_payment_count: e.target.value }))}
              className="input-field"
              min="1"
              max="60"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Payment Cycle</label>
            <select
              value={formData.default_payment_cycle}
              onChange={(e) => setFormData((prev) => ({ ...prev, default_payment_cycle: e.target.value }))}
              className="select-field"
              required
            >
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
            {loading ? (
              <div className="w-5 h-5 border-2 border-[#0a0a0f] border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                {product ? 'Update Product' : 'Add Product'}
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}
