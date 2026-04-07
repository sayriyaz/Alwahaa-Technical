'use client'

import { useState } from 'react'

type ManualVatFieldsProps = {
  idPrefix: string
  initialVatApplicable?: boolean
  initialVatAmount?: number
  vatApplicableName?: string
  vatAmountName?: string
}

export function ManualVatFields({
  idPrefix,
  initialVatApplicable = false,
  initialVatAmount = 0,
  vatApplicableName = 'vat_applicable',
  vatAmountName = 'vat_amount',
}: ManualVatFieldsProps) {
  const [vatApplicable, setVatApplicable] = useState(initialVatApplicable)
  const [vatAmount, setVatAmount] = useState(initialVatAmount.toFixed(2))

  return (
    <div className="space-y-4">
      <input type="hidden" name={vatApplicableName} value={vatApplicable ? 'true' : 'false'} />
      <input type="hidden" name={vatAmountName} value={vatApplicable ? vatAmount : '0'} />

      <label
        htmlFor={`${idPrefix}-vat-applicable`}
        className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800"
      >
        <input
          id={`${idPrefix}-vat-applicable`}
          type="checkbox"
          checked={vatApplicable}
          onChange={(event) => {
            const nextValue = event.target.checked
            setVatApplicable(nextValue)
            if (!nextValue) {
              setVatAmount('0.00')
            }
          }}
          className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
        />
        VAT applicable
      </label>

      <div>
        <label htmlFor={`${idPrefix}-vat-amount`} className="block text-sm font-medium text-slate-900">
          VAT Amount (AED)
        </label>
        <input
          id={`${idPrefix}-vat-amount`}
          type="number"
          min="0"
          step="0.01"
          value={vatApplicable ? vatAmount : '0.00'}
          onChange={(event) => setVatAmount(event.target.value)}
          disabled={!vatApplicable}
          className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 sm:text-sm"
        />
        <p className="mt-1 text-xs text-slate-500">
          {vatApplicable
            ? 'Enter the VAT amount you want to apply for this record.'
            : 'VAT is marked as not applicable, so the saved VAT amount will be zero.'}
        </p>
      </div>
    </div>
  )
}
