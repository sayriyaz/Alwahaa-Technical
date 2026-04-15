'use client'

import { useState } from 'react'
import { DEFAULT_VAT_RATE_PERCENT } from '@/lib/vat'

type Props = {
  initialAmount?: number
  initialVatApplicable?: boolean
  initialVatAmount?: number
  amountLabel?: string
}

export function PaymentAmountField({
  initialAmount = 0,
  initialVatApplicable = false,
  initialVatAmount = 0,
  amountLabel = 'Amount (AED)',
}: Props) {
  const [amount, setAmount] = useState(initialAmount > 0 ? String(initialAmount) : '')
  const [vatApplicable, setVatApplicable] = useState(initialVatApplicable)
  const [vatRate, setVatRate] = useState(DEFAULT_VAT_RATE_PERCENT)
  const [vatAmount, setVatAmount] = useState(() => {
    if (initialVatApplicable && initialVatAmount > 0) return String(initialVatAmount)
    return ''
  })

  const parsedAmount = parseFloat(amount) || 0
  const parsedVat = parseFloat(vatAmount) || 0
  const total = parsedAmount + (vatApplicable ? parsedVat : 0)

  const fmt = (n: number) =>
    n.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  function handleVatToggle(checked: boolean) {
    setVatApplicable(checked)
    if (checked && parsedAmount > 0) {
      setVatAmount(((parsedAmount * vatRate) / 100).toFixed(2))
    } else {
      setVatAmount('')
    }
  }

  function handleAmountChange(val: string) {
    setAmount(val)
    if (vatApplicable) {
      const base = parseFloat(val) || 0
      setVatAmount(((base * vatRate) / 100).toFixed(2))
    }
  }

  function handleVatRateChange(val: string) {
    const rate = parseFloat(val) || 0
    setVatRate(rate)
    if (vatApplicable) {
      setVatAmount(((parsedAmount * rate) / 100).toFixed(2))
    }
  }

  return (
    <div className="space-y-4">
      {/* Hidden fields for form submission */}
      <input type="hidden" name="vat_applicable" value={vatApplicable ? 'true' : 'false'} />
      <input type="hidden" name="vat_amount" value={vatApplicable ? (parsedVat.toFixed(2)) : '0'} />

      {/* Amount */}
      <div>
        <label className="block text-sm font-medium text-slate-900 mb-1">{amountLabel}</label>
        <input
          type="number"
          name="amount"
          value={amount}
          onChange={(e) => handleAmountChange(e.target.value)}
          min="0"
          step="0.01"
          required
          placeholder="0.00"
          className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
        />
      </div>

      {/* VAT toggle + rate + amount */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={vatApplicable}
            onChange={(e) => handleVatToggle(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
          />
          <span className="text-sm font-medium text-slate-800">VAT applicable</span>
        </label>

        {vatApplicable && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">VAT Rate (%)</label>
              <input
                type="number"
                value={vatRate}
                onChange={(e) => handleVatRateChange(e.target.value)}
                min="0"
                max="100"
                step="0.01"
                className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">VAT Amount (AED)</label>
              <input
                type="number"
                value={vatAmount}
                onChange={(e) => setVatAmount(e.target.value)}
                min="0"
                step="0.01"
                placeholder="Auto-calculated"
                className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>
        )}
      </div>

      {/* Total */}
      {parsedAmount > 0 && (
        <div className="flex justify-end">
          <div className="text-sm space-y-1 text-right">
            <div className="text-slate-500">Amount: <span className="font-mono text-slate-700">AED {fmt(parsedAmount)}</span></div>
            {vatApplicable && parsedVat > 0 && (
              <div className="text-slate-500">VAT: <span className="font-mono text-slate-700">AED {fmt(parsedVat)}</span></div>
            )}
            <div className="font-semibold text-slate-900 border-t border-slate-200 pt-1">
              Total: <span className="font-mono">AED {fmt(total)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
