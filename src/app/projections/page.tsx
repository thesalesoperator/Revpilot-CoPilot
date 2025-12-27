'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import {
  Calculator,
  Plus,
  Trash2,
  TrendingUp,
  DollarSign,
  Target,
  Sparkles,
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import type { Product } from '@/types/database'

interface ProjectedSale {
  id: string
  productName: string
  totalPrice: number
  upfrontPayment: number
  commissionPercent: number
  quantity: number
}

export default function ProjectionsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [projectedSales, setProjectedSales] = useState<ProjectedSale[]>([])
  const [loading, setLoading] = useState(true)

  const { user } = useAuth()
  const supabase = createClient()

  const fetchProducts = useCallback(async () => {
    if (!user) return

    try {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)

      if (data) setProducts(data)
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }, [user, supabase])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const addProjectedSale = () => {
    const newSale: ProjectedSale = {
      id: Math.random().toString(36).substr(2, 9),
      productName: '',
      totalPrice: 0,
      upfrontPayment: 0,
      commissionPercent: 10,
      quantity: 1,
    }
    setProjectedSales([...projectedSales, newSale])
  }

  const updateProjectedSale = (id: string, field: keyof ProjectedSale, value: string | number) => {
    setProjectedSales(
      projectedSales.map((sale) =>
        sale.id === id ? { ...sale, [field]: value } : sale
      )
    )
  }

  const removeProjectedSale = (id: string) => {
    setProjectedSales(projectedSales.filter((sale) => sale.id !== id))
  }

  const selectProduct = (id: string, productId: string) => {
    const product = products.find((p) => p.id === productId)
    if (product) {
      setProjectedSales(
        projectedSales.map((sale) =>
          sale.id === id
            ? {
                ...sale,
                productName: product.name,
                totalPrice: product.default_price,
                commissionPercent: product.default_commission_percent,
              }
            : sale
        )
      )
    }
  }

  // Calculate projections
  const projectionTotals = projectedSales.reduce(
    (acc, sale) => {
      const totalForSale = sale.totalPrice * sale.quantity
      const upfrontForSale = sale.upfrontPayment * sale.quantity
      const commissionOnUpfront = upfrontForSale * (sale.commissionPercent / 100)
      const commissionOnTotal = totalForSale * (sale.commissionPercent / 100)

      return {
        totalSales: acc.totalSales + sale.quantity,
        totalContractedValue: acc.totalContractedValue + totalForSale,
        totalUpfront: acc.totalUpfront + upfrontForSale,
        totalOutstanding: acc.totalOutstanding + (totalForSale - upfrontForSale),
        guaranteedCommission: acc.guaranteedCommission + commissionOnUpfront,
        potentialCommission: acc.potentialCommission + (commissionOnTotal - commissionOnUpfront),
        totalCommission: acc.totalCommission + commissionOnTotal,
      }
    },
    {
      totalSales: 0,
      totalContractedValue: 0,
      totalUpfront: 0,
      totalOutstanding: 0,
      guaranteedCommission: 0,
      potentialCommission: 0,
      totalCommission: 0,
    }
  )

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
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Sales Projections</h1>
            <p className="text-gray-400">Calculate your potential earnings with different scenarios</p>
          </div>
          <button onClick={addProjectedSale} className="btn-primary flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add Projection
          </button>
        </div>

        {/* Quick Scenario Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => {
              const newSales: ProjectedSale[] = Array(5).fill(null).map(() => ({
                id: Math.random().toString(36).substr(2, 9),
                productName: 'Standard Package',
                totalPrice: 3000,
                upfrontPayment: 1000,
                commissionPercent: 10,
                quantity: 1,
              }))
              setProjectedSales([...projectedSales, ...newSales])
            }}
            className="glass-card p-6 text-left hover:border-[rgba(94,234,212,0.3)] transition-all group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-[rgba(94,234,212,0.1)] group-hover:bg-[rgba(94,234,212,0.2)] transition-colors">
                <Target className="w-5 h-5 text-[#5eead4]" />
              </div>
              <span className="text-sm text-gray-400">Quick Add</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">5 Sales Scenario</h3>
            <p className="text-sm text-gray-500">Add 5 standard sales to see projections</p>
          </button>

          <button
            onClick={() => {
              const newSales: ProjectedSale[] = Array(10).fill(null).map(() => ({
                id: Math.random().toString(36).substr(2, 9),
                productName: 'Standard Package',
                totalPrice: 3000,
                upfrontPayment: 1000,
                commissionPercent: 10,
                quantity: 1,
              }))
              setProjectedSales([...projectedSales, ...newSales])
            }}
            className="glass-card p-6 text-left hover:border-[rgba(94,234,212,0.3)] transition-all group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-[rgba(255,152,85,0.1)] group-hover:bg-[rgba(255,152,85,0.2)] transition-colors">
                <TrendingUp className="w-5 h-5 text-[#ffbe57]" />
              </div>
              <span className="text-sm text-gray-400">Quick Add</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">10 Sales Scenario</h3>
            <p className="text-sm text-gray-500">Add 10 sales to project a strong month</p>
          </button>

          <button
            onClick={() => setProjectedSales([])}
            className="glass-card p-6 text-left hover:border-[rgba(255,0,67,0.3)] transition-all group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-[rgba(255,0,67,0.1)] group-hover:bg-[rgba(255,0,67,0.2)] transition-colors">
                <Sparkles className="w-5 h-5 text-[#ff6b8a]" />
              </div>
              <span className="text-sm text-gray-400">Reset</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Clear All</h3>
            <p className="text-sm text-gray-500">Start fresh with a new projection</p>
          </button>
        </div>

        {/* Projection Summary */}
        {projectedSales.length > 0 && (
          <div className="border-gradient">
            <div className="bg-[rgba(0,16,46,0.9)] rounded-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <Calculator className="w-6 h-6 text-[#5eead4]" />
                <h2 className="text-xl font-semibold gradient-text">Projection Summary</h2>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Total Sales</p>
                  <p className="text-2xl font-bold text-white">{projectionTotals.totalSales}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Total Value</p>
                  <p className="text-2xl font-bold text-white">{formatCurrency(projectionTotals.totalContractedValue)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Cash Upfront</p>
                  <p className="text-2xl font-bold text-[#5eead4]">{formatCurrency(projectionTotals.totalUpfront)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Outstanding</p>
                  <p className="text-2xl font-bold text-[#ffbe57]">{formatCurrency(projectionTotals.totalOutstanding)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Guaranteed</p>
                  <p className="text-2xl font-bold text-[#5eead4]">{formatCurrency(projectionTotals.guaranteedCommission)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Potential</p>
                  <p className="text-2xl font-bold text-[#ffbe57]">{formatCurrency(projectionTotals.potentialCommission)}</p>
                </div>
                <div className="bg-[rgba(94,234,212,0.1)] rounded-xl p-4 -m-2">
                  <p className="text-sm text-[#5eead4] mb-1">Total Commission</p>
                  <p className="text-2xl font-bold gradient-text">{formatCurrency(projectionTotals.totalCommission)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Projected Sales List */}
        <div className="glass-card">
          <div className="p-6 border-b border-[rgba(94,234,212,0.1)]">
            <h2 className="text-xl font-semibold gradient-text">Projected Sales</h2>
          </div>

          {projectedSales.length === 0 ? (
            <div className="p-12 text-center">
              <Calculator className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No projections yet</h3>
              <p className="text-gray-400 mb-6">Add projected sales to calculate potential earnings</p>
              <button onClick={addProjectedSale} className="btn-primary inline-flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Add Your First Projection
              </button>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              {projectedSales.map((sale, index) => (
                <div
                  key={sale.id}
                  className="bg-[rgba(94,234,212,0.02)] border border-[rgba(94,234,212,0.1)] rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-400">Projection #{index + 1}</span>
                    <button
                      onClick={() => removeProjectedSale(sale.id)}
                      className="p-2 rounded-lg hover:bg-[rgba(255,0,67,0.1)] text-gray-400 hover:text-[#ff6b8a] transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Product</label>
                      {products.length > 0 ? (
                        <select
                          value=""
                          onChange={(e) => selectProduct(sale.id, e.target.value)}
                          className="select-field text-sm"
                        >
                          <option value="">Select or type...</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={sale.productName}
                          onChange={(e) => updateProjectedSale(sale.id, 'productName', e.target.value)}
                          className="input-field text-sm"
                          placeholder="Product name"
                        />
                      )}
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Price</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                        <input
                          type="number"
                          value={sale.totalPrice || ''}
                          onChange={(e) => updateProjectedSale(sale.id, 'totalPrice', parseFloat(e.target.value) || 0)}
                          className="input-field text-sm pl-7"
                          placeholder="3000"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Upfront</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                        <input
                          type="number"
                          value={sale.upfrontPayment || ''}
                          onChange={(e) => updateProjectedSale(sale.id, 'upfrontPayment', parseFloat(e.target.value) || 0)}
                          className="input-field text-sm pl-7"
                          placeholder="1000"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Commission</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={sale.commissionPercent || ''}
                          onChange={(e) => updateProjectedSale(sale.id, 'commissionPercent', parseFloat(e.target.value) || 0)}
                          className="input-field text-sm pr-7"
                          placeholder="10"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Quantity</label>
                      <input
                        type="number"
                        value={sale.quantity || ''}
                        onChange={(e) => updateProjectedSale(sale.id, 'quantity', parseInt(e.target.value) || 1)}
                        className="input-field text-sm"
                        min="1"
                        placeholder="1"
                      />
                    </div>

                    <div className="bg-[rgba(94,234,212,0.1)] rounded-xl p-3 flex flex-col justify-center">
                      <p className="text-xs text-gray-400">Est. Commission</p>
                      <p className="text-lg font-bold text-[#5eead4]">
                        {formatCurrency(sale.totalPrice * sale.quantity * (sale.commissionPercent / 100))}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={addProjectedSale}
                className="w-full py-4 border-2 border-dashed border-[rgba(94,234,212,0.2)] rounded-xl text-gray-400 hover:text-[#5eead4] hover:border-[rgba(94,234,212,0.4)] transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Another Projection
              </button>
            </div>
          )}
        </div>

        {/* Goal Setting Section */}
        {projectedSales.length > 0 && (
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <DollarSign className="w-6 h-6 text-[#ffbe57]" />
              <h2 className="text-xl font-semibold gradient-text-orange">Commission Goals</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[rgba(255,255,255,0.02)] rounded-xl p-6 text-center">
                <p className="text-sm text-gray-400 mb-2">To earn $5,000/month you need</p>
                <p className="text-3xl font-bold text-white mb-1">
                  {projectionTotals.totalCommission > 0
                    ? Math.ceil(5000 / (projectionTotals.totalCommission / projectionTotals.totalSales))
                    : '-'}
                </p>
                <p className="text-sm text-gray-500">sales at current average</p>
              </div>

              <div className="bg-[rgba(255,255,255,0.02)] rounded-xl p-6 text-center">
                <p className="text-sm text-gray-400 mb-2">To earn $10,000/month you need</p>
                <p className="text-3xl font-bold text-white mb-1">
                  {projectionTotals.totalCommission > 0
                    ? Math.ceil(10000 / (projectionTotals.totalCommission / projectionTotals.totalSales))
                    : '-'}
                </p>
                <p className="text-sm text-gray-500">sales at current average</p>
              </div>

              <div className="bg-[rgba(255,255,255,0.02)] rounded-xl p-6 text-center">
                <p className="text-sm text-gray-400 mb-2">To earn $20,000/month you need</p>
                <p className="text-3xl font-bold text-white mb-1">
                  {projectionTotals.totalCommission > 0
                    ? Math.ceil(20000 / (projectionTotals.totalCommission / projectionTotals.totalSales))
                    : '-'}
                </p>
                <p className="text-sm text-gray-500">sales at current average</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
