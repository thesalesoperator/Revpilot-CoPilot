'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  Plus,
  Edit2,
  Trash2,
  RotateCcw,
  Package,
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import StatCard from '@/components/ui/StatCard'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate, formatPercent, calculateSaleMetrics, generatePaymentSchedule } from '@/lib/utils'
import type { Sale, Product, PaymentRecord } from '@/types/database'

interface SaleWithPayments extends Sale {
  payment_records?: PaymentRecord[]
}

export default function DashboardPage() {
  const [sales, setSales] = useState<SaleWithPayments[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSale, setEditingSale] = useState<Sale | null>(null)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [selectedSalePayments, setSelectedSalePayments] = useState<PaymentRecord[]>([])
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)

  const { user } = useAuth()
  const { showToast } = useToast()
  const supabase = createClient()

  const fetchData = useCallback(async () => {
    if (!user) return

    try {
      const [salesRes, productsRes] = await Promise.all([
        supabase
          .from('sales')
          .select('*, payment_records(*)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('products')
          .select('*')
          .eq('user_id', user.id),
      ])

      if (salesRes.data) setSales(salesRes.data)
      if (productsRes.data) setProducts(productsRes.data)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [user, supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Calculate metrics
  const metrics = sales.reduce(
    (acc, sale) => {
      if (sale.status === 'refunded') return acc

      const saleMetrics = calculateSaleMetrics(
        sale.total_package_price,
        sale.cash_collected_upfront,
        sale.commission_percent,
        sale.payment_count
      )

      // Calculate collected from payments
      const paidPayments = sale.payment_records?.filter(p => p.status === 'paid') || []
      const totalPaidFromPayments = paidPayments.reduce((sum, p) => sum + p.amount, 0)
      const actualCashCollected = sale.cash_collected_upfront + totalPaidFromPayments - sale.cash_collected_upfront

      return {
        totalCashCollected: acc.totalCashCollected + sale.cash_collected_upfront + totalPaidFromPayments - sale.cash_collected_upfront,
        totalContractedValue: acc.totalContractedValue + saleMetrics.totalContractedValue,
        outstandingCash: acc.outstandingCash + (sale.total_package_price - sale.cash_collected_upfront - totalPaidFromPayments + sale.cash_collected_upfront),
        guaranteedCommission: acc.guaranteedCommission + (sale.cash_collected_upfront + totalPaidFromPayments - sale.cash_collected_upfront) * (sale.commission_percent / 100),
        potentialCommission: acc.potentialCommission + (sale.total_package_price - sale.cash_collected_upfront - totalPaidFromPayments + sale.cash_collected_upfront) * (sale.commission_percent / 100),
        remainingPayments: acc.remainingPayments + (sale.payment_records?.filter(p => p.status === 'pending').length || 0),
      }
    },
    {
      totalCashCollected: 0,
      totalContractedValue: 0,
      outstandingCash: 0,
      guaranteedCommission: 0,
      potentialCommission: 0,
      remainingPayments: 0,
    }
  )

  // Recalculate metrics correctly
  const correctedMetrics = sales.reduce(
    (acc, sale) => {
      if (sale.status === 'refunded') return acc

      const paidPayments = sale.payment_records?.filter(p => p.status === 'paid') || []
      const totalPaid = paidPayments.reduce((sum, p) => sum + p.amount, 0)
      const outstanding = sale.total_package_price - totalPaid
      const pendingPayments = sale.payment_records?.filter(p => p.status === 'pending').length || 0

      return {
        totalCashCollected: acc.totalCashCollected + totalPaid,
        totalContractedValue: acc.totalContractedValue + sale.total_package_price,
        outstandingCash: acc.outstandingCash + outstanding,
        guaranteedCommission: acc.guaranteedCommission + (totalPaid * sale.commission_percent / 100),
        potentialCommission: acc.potentialCommission + (outstanding * sale.commission_percent / 100),
        remainingPayments: acc.remainingPayments + pendingPayments,
      }
    },
    {
      totalCashCollected: 0,
      totalContractedValue: 0,
      outstandingCash: 0,
      guaranteedCommission: 0,
      potentialCommission: 0,
      remainingPayments: 0,
    }
  )

  const handleAddSale = () => {
    setEditingSale(null)
    setIsModalOpen(true)
  }

  const handleEditSale = (sale: Sale) => {
    setEditingSale(sale)
    setIsModalOpen(true)
  }

  const handleDeleteSale = async (saleId: string) => {
    if (!confirm('Are you sure you want to delete this sale?')) return

    try {
      // Delete payment records first
      await supabase.from('payment_records').delete().eq('sale_id', saleId)
      // Delete sale
      await supabase.from('sales').delete().eq('id', saleId)

      showToast('success', 'Sale deleted successfully')
      fetchData()
    } catch (error) {
      showToast('error', 'Failed to delete sale')
    }
  }

  const handleRefund = async (sale: Sale) => {
    if (!confirm('Mark this sale as refunded?')) return

    try {
      await supabase
        .from('sales')
        .update({
          status: 'refunded',
          refund_date: new Date().toISOString(),
          refund_amount: sale.total_package_price,
        })
        .eq('id', sale.id)

      showToast('success', 'Sale marked as refunded')
      fetchData()
    } catch (error) {
      showToast('error', 'Failed to process refund')
    }
  }

  const handleViewPayments = (sale: Sale) => {
    setSelectedSale(sale)
    const saleWithPayments = sales.find(s => s.id === sale.id)
    setSelectedSalePayments(saleWithPayments?.payment_records || [])
    setIsPaymentModalOpen(true)
  }

  const handleMarkPaymentPaid = async (paymentId: string) => {
    try {
      await supabase
        .from('payment_records')
        .update({
          status: 'paid',
          paid_date: new Date().toISOString(),
        })
        .eq('id', paymentId)

      showToast('success', 'Payment marked as paid')
      fetchData()
      // Refresh payment modal data
      const updatedSale = sales.find(s => s.id === selectedSale?.id)
      if (updatedSale) {
        setSelectedSalePayments(updatedSale.payment_records || [])
      }
    } catch (error) {
      showToast('error', 'Failed to update payment')
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
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Sales Dashboard</h1>
            <p className="text-gray-400">Track your sales and commissions</p>
          </div>
          <button onClick={handleAddSale} className="btn-primary flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add Sale
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard
            title="Total Cash Collected"
            value={formatCurrency(correctedMetrics.totalCashCollected)}
            icon={DollarSign}
            variant="success"
          />
          <StatCard
            title="Total Contracted Value"
            value={formatCurrency(correctedMetrics.totalContractedValue)}
            icon={TrendingUp}
          />
          <StatCard
            title="Outstanding Cash"
            value={formatCurrency(correctedMetrics.outstandingCash)}
            icon={Clock}
            variant="warning"
          />
          <StatCard
            title="Remaining Payments"
            value={correctedMetrics.remainingPayments.toString()}
            icon={Package}
          />
          <StatCard
            title="Guaranteed Commission"
            value={formatCurrency(correctedMetrics.guaranteedCommission)}
            icon={CheckCircle}
            variant="success"
          />
          <StatCard
            title="Potential Commission"
            value={formatCurrency(correctedMetrics.potentialCommission)}
            icon={TrendingUp}
            variant="warning"
          />
        </div>

        {/* Sales Table */}
        <div className="glass-card overflow-hidden">
          <div className="p-6 border-b border-[rgba(0,255,193,0.1)]">
            <h2 className="text-xl font-semibold gradient-text">Your Sales</h2>
          </div>

          {sales.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No sales yet</h3>
              <p className="text-gray-400 mb-6">Add your first sale to start tracking commissions</p>
              <button onClick={handleAddSale} className="btn-primary inline-flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Add Your First Sale
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Client / Product</th>
                    <th>Sale Date</th>
                    <th>Total Price</th>
                    <th>Cash Collected</th>
                    <th>Commission %</th>
                    <th>Payments</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => {
                    const paidPayments = sale.payment_records?.filter(p => p.status === 'paid').length || 0
                    const totalPayments = sale.payment_count

                    return (
                      <tr key={sale.id}>
                        <td>
                          <div>
                            <p className="font-medium text-white">{sale.client_name}</p>
                            <p className="text-sm text-gray-400">{sale.product_name}</p>
                          </div>
                        </td>
                        <td className="text-gray-300">{formatDate(sale.sale_date)}</td>
                        <td className="text-white font-medium">{formatCurrency(sale.total_package_price)}</td>
                        <td className="text-[#00ffc1]">{formatCurrency(sale.cash_collected_upfront)}</td>
                        <td className="text-gray-300">{formatPercent(sale.commission_percent)}</td>
                        <td>
                          <button
                            onClick={() => handleViewPayments(sale)}
                            className="text-sm text-[#00ffc1] hover:underline"
                          >
                            {paidPayments}/{totalPayments} paid
                          </button>
                        </td>
                        <td>
                          {sale.status === 'refunded' ? (
                            <span className="badge badge-danger">Refunded</span>
                          ) : paidPayments === totalPayments ? (
                            <span className="badge badge-success">Completed</span>
                          ) : (
                            <span className="badge badge-warning">Active</span>
                          )}
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditSale(sale)}
                              className="p-2 rounded-lg hover:bg-[rgba(0,255,193,0.1)] text-gray-400 hover:text-[#00ffc1] transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {sale.status !== 'refunded' && (
                              <button
                                onClick={() => handleRefund(sale)}
                                className="p-2 rounded-lg hover:bg-[rgba(255,190,87,0.1)] text-gray-400 hover:text-[#ffbe57] transition-colors"
                                title="Mark Refunded"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteSale(sale.id)}
                              className="p-2 rounded-lg hover:bg-[rgba(255,0,67,0.1)] text-gray-400 hover:text-[#ff6b8a] transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Sale Modal */}
      <SaleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        sale={editingSale}
        products={products}
        userId={user?.id || ''}
        onSuccess={() => {
          fetchData()
          setIsModalOpen(false)
        }}
      />

      {/* Payment Schedule Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Payment Schedule"
        size="lg"
      >
        {selectedSale && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-400">Client</p>
                <p className="text-white font-medium">{selectedSale.client_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Product</p>
                <p className="text-white font-medium">{selectedSale.product_name}</p>
              </div>
            </div>

            <div className="space-y-3">
              {selectedSalePayments
                .sort((a, b) => a.payment_number - b.payment_number)
                .map((payment) => (
                  <div
                    key={payment.id}
                    className={`p-4 rounded-xl border ${
                      payment.status === 'paid'
                        ? 'bg-[rgba(0,255,193,0.05)] border-[rgba(0,255,193,0.2)]'
                        : 'bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.1)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            payment.status === 'paid'
                              ? 'bg-[rgba(0,255,193,0.2)] text-[#00ffc1]'
                              : 'bg-[rgba(255,255,255,0.1)] text-gray-400'
                          }`}
                        >
                          {payment.payment_number}
                        </div>
                        <div>
                          <p className="text-white font-medium">{formatCurrency(payment.amount)}</p>
                          <p className="text-sm text-gray-400">
                            Due: {formatDate(payment.due_date)}
                            {payment.paid_date && ` • Paid: ${formatDate(payment.paid_date)}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {payment.status === 'paid' ? (
                          <span className="badge badge-success">Paid</span>
                        ) : (
                          <>
                            <span className="badge badge-warning">Pending</span>
                            <button
                              onClick={() => handleMarkPaymentPaid(payment.id)}
                              className="btn-secondary text-sm py-2 px-3"
                            >
                              Mark Paid
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  )
}

// Sale Modal Component
interface SaleModalProps {
  isOpen: boolean
  onClose: () => void
  sale: Sale | null
  products: Product[]
  userId: string
  onSuccess: () => void
}

function SaleModal({ isOpen, onClose, sale, products, userId, onSuccess }: SaleModalProps) {
  const [formData, setFormData] = useState({
    client_name: '',
    product_name: '',
    product_id: '',
    total_package_price: '',
    cash_collected_upfront: '',
    commission_percent: '',
    payment_count: '1',
    payment_cycle: 'monthly',
    sale_date: new Date().toISOString().split('T')[0],
    notes: '',
  })
  const [loading, setLoading] = useState(false)

  const { showToast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    if (sale) {
      setFormData({
        client_name: sale.client_name,
        product_name: sale.product_name,
        product_id: sale.product_id || '',
        total_package_price: sale.total_package_price.toString(),
        cash_collected_upfront: sale.cash_collected_upfront.toString(),
        commission_percent: sale.commission_percent.toString(),
        payment_count: sale.payment_count.toString(),
        payment_cycle: sale.payment_cycle,
        sale_date: sale.sale_date.split('T')[0],
        notes: sale.notes || '',
      })
    } else {
      setFormData({
        client_name: '',
        product_name: '',
        product_id: '',
        total_package_price: '',
        cash_collected_upfront: '',
        commission_percent: '',
        payment_count: '1',
        payment_cycle: 'monthly',
        sale_date: new Date().toISOString().split('T')[0],
        notes: '',
      })
    }
  }, [sale, isOpen])

  const handleProductSelect = (productId: string) => {
    if (!productId) {
      setFormData((prev) => ({ ...prev, product_id: '', product_name: '' }))
      return
    }

    const product = products.find((p) => p.id === productId)
    if (product) {
      setFormData((prev) => ({
        ...prev,
        product_id: product.id,
        product_name: product.name,
        total_package_price: product.default_price.toString(),
        commission_percent: product.default_commission_percent.toString(),
        payment_count: product.default_payment_count.toString(),
        payment_cycle: product.default_payment_cycle,
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const saleData = {
        user_id: userId,
        client_name: formData.client_name,
        product_name: formData.product_name,
        product_id: formData.product_id || null,
        total_package_price: parseFloat(formData.total_package_price),
        cash_collected_upfront: parseFloat(formData.cash_collected_upfront),
        commission_percent: parseFloat(formData.commission_percent),
        payment_count: parseInt(formData.payment_count),
        payment_cycle: formData.payment_cycle,
        sale_date: formData.sale_date,
        notes: formData.notes || null,
        status: 'active',
      }

      if (sale) {
        // Update existing sale
        await supabase.from('sales').update(saleData).eq('id', sale.id)
        showToast('success', 'Sale updated successfully')
      } else {
        // Create new sale
        const { data: newSale, error: saleError } = await supabase
          .from('sales')
          .insert(saleData)
          .select()
          .single()

        if (saleError) throw saleError

        // Generate payment schedule
        const paymentSchedule = generatePaymentSchedule(
          saleData.total_package_price,
          saleData.cash_collected_upfront,
          saleData.payment_count,
          saleData.payment_cycle,
          new Date(saleData.sale_date)
        )

        // Insert payment records
        const paymentRecords = paymentSchedule.map((payment) => ({
          sale_id: newSale.id,
          payment_number: payment.paymentNumber,
          amount: payment.amount,
          due_date: payment.dueDate.toISOString(),
          status: payment.status,
          paid_date: payment.status === 'paid' ? new Date().toISOString() : null,
        }))

        await supabase.from('payment_records').insert(paymentRecords)
        showToast('success', 'Sale added successfully')
      }

      onSuccess()
    } catch (error) {
      console.error('Error saving sale:', error)
      showToast('error', 'Failed to save sale')
    } finally {
      setLoading(false)
    }
  }

  // Calculate preview
  const totalPrice = parseFloat(formData.total_package_price) || 0
  const upfront = parseFloat(formData.cash_collected_upfront) || 0
  const commissionPct = parseFloat(formData.commission_percent) || 0
  const paymentCount = parseInt(formData.payment_count) || 1
  const installmentAmount = paymentCount > 1 ? (totalPrice - upfront) / (paymentCount - 1) : 0
  const guaranteedCommission = upfront * (commissionPct / 100)
  const potentialCommission = (totalPrice - upfront) * (commissionPct / 100)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={sale ? 'Edit Sale' : 'Add New Sale'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Client Name</label>
            <input
              type="text"
              value={formData.client_name}
              onChange={(e) => setFormData((prev) => ({ ...prev, client_name: e.target.value }))}
              className="input-field"
              placeholder="John Smith"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Product {products.length > 0 && '(or select saved)'}
            </label>
            {products.length > 0 ? (
              <select
                value={formData.product_id}
                onChange={(e) => handleProductSelect(e.target.value)}
                className="select-field"
              >
                <option value="">Custom product...</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={formData.product_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, product_name: e.target.value }))}
                className="input-field"
                placeholder="Product name"
                required
              />
            )}
          </div>

          {products.length > 0 && !formData.product_id && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">Product Name</label>
              <input
                type="text"
                value={formData.product_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, product_name: e.target.value }))}
                className="input-field"
                placeholder="Enter product name"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Total Package Price</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                value={formData.total_package_price}
                onChange={(e) => setFormData((prev) => ({ ...prev, total_package_price: e.target.value }))}
                className="input-field pl-8"
                placeholder="5000"
                step="0.01"
                min="0"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Cash Collected Upfront</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                value={formData.cash_collected_upfront}
                onChange={(e) => setFormData((prev) => ({ ...prev, cash_collected_upfront: e.target.value }))}
                className="input-field pl-8"
                placeholder="1000"
                step="0.01"
                min="0"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Commission Percent</label>
            <div className="relative">
              <input
                type="number"
                value={formData.commission_percent}
                onChange={(e) => setFormData((prev) => ({ ...prev, commission_percent: e.target.value }))}
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
            <label className="block text-sm font-medium text-gray-300 mb-2">Number of Payments</label>
            <input
              type="number"
              value={formData.payment_count}
              onChange={(e) => setFormData((prev) => ({ ...prev, payment_count: e.target.value }))}
              className="input-field"
              min="1"
              max="60"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Payment Cycle</label>
            <select
              value={formData.payment_cycle}
              onChange={(e) => setFormData((prev) => ({ ...prev, payment_cycle: e.target.value }))}
              className="select-field"
              required
            >
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Sale Date</label>
            <input
              type="date"
              value={formData.sale_date}
              onChange={(e) => setFormData((prev) => ({ ...prev, sale_date: e.target.value }))}
              className="input-field"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">Notes (optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              className="input-field min-h-[80px] resize-none"
              placeholder="Any additional notes about this sale..."
            />
          </div>
        </div>

        {/* Preview */}
        {totalPrice > 0 && (
          <div className="bg-[rgba(0,255,193,0.05)] border border-[rgba(0,255,193,0.2)] rounded-xl p-4">
            <h4 className="text-sm font-medium text-[#00ffc1] mb-3">Commission Preview</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Installment Amount</p>
                <p className="text-white font-medium">{formatCurrency(installmentAmount)}</p>
              </div>
              <div>
                <p className="text-gray-400">Remaining Payments</p>
                <p className="text-white font-medium">{Math.max(0, paymentCount - 1)}</p>
              </div>
              <div>
                <p className="text-gray-400">Guaranteed Commission</p>
                <p className="text-[#00ffc1] font-medium">{formatCurrency(guaranteedCommission)}</p>
              </div>
              <div>
                <p className="text-gray-400">Potential Commission</p>
                <p className="text-[#ffbe57] font-medium">{formatCurrency(potentialCommission)}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
            {loading ? (
              <div className="w-5 h-5 border-2 border-[#00102e] border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                {sale ? 'Update Sale' : 'Add Sale'}
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}
