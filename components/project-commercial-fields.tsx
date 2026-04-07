'use client'

import { useMemo, useState } from 'react'
import { DEFAULT_VAT_RATE_PERCENT } from '@/lib/vat'

type ProjectCommercialFieldsProps = {
  initialContractValue?: number
  initialVatApplicable?: boolean
  initialVatAmount?: number
}

function parseAmount(value: string) {
  const parsedValue = parseFloat(value)
  return Number.isFinite(parsedValue) ? parsedValue : 0
}

function roundCurrencyAmount(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function calculateDefaultVatAmount(contractValue: number) {
  return roundCurrencyAmount(contractValue * 0.05)
}

export function ProjectCommercialFields({
  initialContractValue = 0,
  initialVatApplicable = true,
  initialVatAmount = 0,
}: ProjectCommercialFieldsProps) {
  const [contractValue, setContractValue] = useState(initialContractValue.toFixed(2))
  const [vatApplicable, setVatApplicable] = useState(initialVatApplicable)
  const [vatAmount, setVatAmount] = useState(
    (initialVatApplicable ? initialVatAmount : 0).toFixed(2)
  )
  const [vatManuallyAdjusted, setVatManuallyAdjusted] = useState(
    Math.abs(initialVatAmount - calculateDefaultVatAmount(initialContractValue)) > 0.009
  )

  const totalAmount = useMemo(() => {
    const baseAmount = parseAmount(contractValue)
    const currentVatAmount = vatApplicable ? parseAmount(vatAmount) : 0
    return roundCurrencyAmount(baseAmount + currentVatAmount).toFixed(2)
  }, [contractValue, vatAmount, vatApplicable])

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div>
        <label htmlFor="contract_value" className="block text-sm font-medium text-slate-900">
          Contract Value (AED)
        </label>
        <input
          id="contract_value"
          name="contract_value"
          type="number"
          min="0"
          step="0.01"
          value={contractValue}
          onChange={(event) => {
            const nextContractValue = event.target.value
            setContractValue(nextContractValue)
            if (vatApplicable && !vatManuallyAdjusted) {
              setVatAmount(calculateDefaultVatAmount(parseAmount(nextContractValue)).toFixed(2))
            }
          }}
          className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
        />
      </div>

      <div className="space-y-3 md:col-span-2">
        <input type="hidden" name="vat_applicable" value={vatApplicable ? 'true' : 'false'} />
        <input type="hidden" name="vat_amount" value={vatApplicable ? vatAmount : '0'} />

        <label
          htmlFor="project-vat-applicable"
          className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800"
        >
          <input
            id="project-vat-applicable"
            type="checkbox"
            checked={vatApplicable}
            onChange={(event) => {
              const nextValue = event.target.checked
              setVatApplicable(nextValue)
              setVatManuallyAdjusted(false)
              if (nextValue) {
                setVatAmount(calculateDefaultVatAmount(parseAmount(contractValue)).toFixed(2))
              } else {
                setVatAmount('0.00')
              }
            }}
            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
          />
          VAT applicable
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="project-vat-amount" className="block text-sm font-medium text-slate-900">
              VAT Amount (AED)
            </label>
            <input
              id="project-vat-amount"
              type="number"
              min="0"
              step="0.01"
              value={vatApplicable ? vatAmount : '0.00'}
              disabled={!vatApplicable}
              onChange={(event) => {
                setVatAmount(event.target.value)
                setVatManuallyAdjusted(true)
              }}
              className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 sm:text-sm"
            />
            <p className="mt-1 text-xs text-slate-500">
              VAT auto-fills at {DEFAULT_VAT_RATE_PERCENT}% of the contract value, but you can override it if needed.
            </p>
          </div>

          <div>
            <label htmlFor="project-total-amount" className="block text-sm font-medium text-slate-900">
              Total Amount (AED)
            </label>
            <input
              id="project-total-amount"
              type="number"
              value={totalAmount}
              readOnly
              className="mt-1 block w-full rounded-lg border-slate-300 bg-slate-50 px-3 py-2 text-slate-700 shadow-sm sm:text-sm"
            />
            <p className="mt-1 text-xs text-slate-500">
              Total amount is saved as Contract Value + VAT.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
