import { addWeeks, addMonths } from 'date-fns'

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

export function calculateInstallmentAmount(
  totalPrice: number,
  upfrontPayment: number,
  paymentCount: number
): number {
  if (paymentCount <= 1) return 0
  const remaining = totalPrice - upfrontPayment
  return remaining / (paymentCount - 1)
}

export function calculateCommission(amount: number, commissionPercent: number): number {
  return amount * (commissionPercent / 100)
}

export function getPaymentDueDate(
  startDate: Date,
  paymentNumber: number,
  paymentCycle: string
): Date {
  switch (paymentCycle) {
    case 'weekly':
      return addWeeks(startDate, paymentNumber)
    case 'biweekly':
      return addWeeks(startDate, paymentNumber * 2)
    case 'monthly':
      return addMonths(startDate, paymentNumber)
    case 'quarterly':
      return addMonths(startDate, paymentNumber * 3)
    default:
      return addMonths(startDate, paymentNumber)
  }
}

export function generatePaymentSchedule(
  totalPrice: number,
  upfrontPayment: number,
  paymentCount: number,
  paymentCycle: string,
  startDate: Date = new Date()
): Array<{
  paymentNumber: number
  amount: number
  dueDate: Date
  status: 'paid' | 'pending'
}> {
  const payments = []
  const installmentAmount = calculateInstallmentAmount(totalPrice, upfrontPayment, paymentCount)

  // First payment (upfront)
  payments.push({
    paymentNumber: 1,
    amount: upfrontPayment,
    dueDate: startDate,
    status: 'paid' as const,
  })

  // Remaining installments
  for (let i = 2; i <= paymentCount; i++) {
    payments.push({
      paymentNumber: i,
      amount: installmentAmount,
      dueDate: getPaymentDueDate(startDate, i - 1, paymentCycle),
      status: 'pending' as const,
    })
  }

  return payments
}

export function calculateSaleMetrics(
  totalPrice: number,
  upfrontPayment: number,
  commissionPercent: number,
  paymentCount: number
): {
  totalContractedValue: number
  cashCollected: number
  outstandingCash: number
  guaranteedCommission: number
  potentialCommission: number
  remainingPayments: number
  installmentAmount: number
} {
  const installmentAmount = calculateInstallmentAmount(totalPrice, upfrontPayment, paymentCount)
  const outstandingCash = totalPrice - upfrontPayment
  const guaranteedCommission = calculateCommission(upfrontPayment, commissionPercent)
  const potentialCommission = calculateCommission(outstandingCash, commissionPercent)

  return {
    totalContractedValue: totalPrice,
    cashCollected: upfrontPayment,
    outstandingCash,
    guaranteedCommission,
    potentialCommission,
    remainingPayments: Math.max(0, paymentCount - 1),
    installmentAmount,
  }
}

export function cn(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}
