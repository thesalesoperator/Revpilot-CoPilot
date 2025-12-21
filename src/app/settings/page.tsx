'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Calendar,
  Package,
  Plus,
  Edit2,
  Trash2,
  Save,
  User,
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import type { Product, Settings, Profile } from '@/types/database'

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  const { user } = useAuth()
  const { showToast } = useToast()
  const supabase = createClient()

  const fetchData = useCallback(async () => {
    if (!user) return

    try {
      const [settingsRes, productsRes, profileRes] = await Promise.all([
        supabase.from('settings').select('*').eq('user_id', user.id).single(),
        supabase.from('products').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').eq('id', user.id).single(),
      ])

      if (settingsRes.data) setSettings(settingsRes.data)
      if (productsRes.data) setProducts(productsRes.data)
      if (profileRes.data) setProfile(profileRes.data)
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
          <div className="p-6 border-b border-[rgba(0,255,193,0.1)]">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-[#00ffc1]" />
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
                  <div className="w-5 h-5 border-2 border-[#00102e] border-t-transparent rounded-full animate-spin" />
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

        {/* Commission Pay Schedule */}
        <div className="glass-card">
          <div className="p-6 border-b border-[rgba(0,255,193,0.1)]">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-[#00ffc1]" />
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
                  <div className="w-5 h-5 border-2 border-[#00102e] border-t-transparent rounded-full animate-spin" />
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
          <div className="p-6 border-b border-[rgba(0,255,193,0.1)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-[#00ffc1]" />
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
                    className="bg-[rgba(0,255,193,0.02)] border border-[rgba(0,255,193,0.1)] rounded-xl p-4 flex items-center justify-between"
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
                        className="p-2 rounded-lg hover:bg-[rgba(0,255,193,0.1)] text-gray-400 hover:text-[#00ffc1] transition-colors"
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
              <div className="w-5 h-5 border-2 border-[#00102e] border-t-transparent rounded-full animate-spin" />
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
