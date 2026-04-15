'use client'

import { useState } from 'react'
import { DEFAULT_VAT_RATE_PERCENT } from '@/lib/vat'

type ItemRow = {
  id: number
  item_name: string
  description: string
  quantity: string
  unit: string
  unit_price: string
  vat_applicable: boolean
  vat_rate: string
}

export type PoInitialItem = {
  item_name: string
  description: string | null
  quantity: number
  unit: string | null
  unit_price: number
  vat_applicable: boolean
  vat_rate: number
}

function calcLine(item: ItemRow) {
  const qty = parseFloat(item.quantity) || 0
  const price = parseFloat(item.unit_price) || 0
  const subtotal = qty * price
  const vatRate = item.vat_applicable ? (parseFloat(item.vat_rate) || DEFAULT_VAT_RATE_PERCENT) : 0
  const vatAmt = Math.round(subtotal * vatRate) / 100
  return { subtotal, vatAmt, total: subtotal + vatAmt }
}

let nextId = 1

export function PoItemsField({ initialItems }: { initialItems?: PoInitialItem[] }) {
  const [rows, setRows] = useState<ItemRow[]>(() => {
    if (initialItems && initialItems.length > 0) {
      return initialItems.map((item) => ({
        id: nextId++,
        item_name: item.item_name,
        description: item.description || '',
        quantity: String(item.quantity),
        unit: item.unit || 'lumpsum',
        unit_price: String(item.unit_price),
        vat_applicable: item.vat_applicable,
        vat_rate: String(item.vat_rate || DEFAULT_VAT_RATE_PERCENT),
      }))
    }
    return [{ id: nextId++, item_name: '', description: '', quantity: '1', unit: 'lumpsum', unit_price: '', vat_applicable: true, vat_rate: String(DEFAULT_VAT_RATE_PERCENT) }]
  })

  function addRow() {
    setRows((prev) => [
      ...prev,
      { id: nextId++, item_name: '', description: '', quantity: '1', unit: 'lumpsum', unit_price: '', vat_applicable: true, vat_rate: String(DEFAULT_VAT_RATE_PERCENT) },
    ])
  }

  function removeRow(id: number) {
    setRows((prev) => prev.length > 1 ? prev.filter((r) => r.id !== id) : prev)
  }

  function update(id: number, field: keyof ItemRow, value: string | boolean) {
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, [field]: value } : r))
  }

  const totals = rows.reduce(
    (acc, row) => {
      const { subtotal, vatAmt } = calcLine(row)
      return { subtotal: acc.subtotal + subtotal, vat: acc.vat + vatAmt, total: acc.total + subtotal + vatAmt }
    },
    { subtotal: 0, vat: 0, total: 0 }
  )

  const fmt = (n: number) => n.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ borderBottom: '1px solid #E5E5EA' }}>
              <th className="text-left py-2 pr-3 text-xs font-semibold" style={{ color: '#6E6E73', width: '22%' }}>Item Name *</th>
              <th className="text-left py-2 pr-3 text-xs font-semibold" style={{ color: '#6E6E73', width: '16%' }}>Description</th>
              <th className="text-left py-2 pr-3 text-xs font-semibold" style={{ color: '#6E6E73', width: '7%' }}>Qty</th>
              <th className="text-left py-2 pr-3 text-xs font-semibold" style={{ color: '#6E6E73', width: '9%' }}>Unit</th>
              <th className="text-left py-2 pr-3 text-xs font-semibold" style={{ color: '#6E6E73', width: '13%' }}>Unit Price</th>
              <th className="text-center py-2 pr-3 text-xs font-semibold" style={{ color: '#6E6E73', width: '6%' }}>VAT</th>
              <th className="text-left py-2 pr-3 text-xs font-semibold" style={{ color: '#6E6E73', width: '7%' }}>Rate %</th>
              <th className="text-right py-2 pr-3 text-xs font-semibold" style={{ color: '#6E6E73', width: '12%' }}>Subtotal</th>
              <th className="text-right py-2 pr-3 text-xs font-semibold" style={{ color: '#6E6E73', width: '8%' }}>VAT Amt</th>
              <th style={{ width: '1%' }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const { subtotal, vatAmt } = calcLine(row)
              return (
                <tr key={row.id} style={{ borderBottom: '1px solid #F2F2F7' }}>
                  <td className="py-2 pr-3">
                    <input type="text" name="item_name[]" value={row.item_name} onChange={(e) => update(row.id, 'item_name', e.target.value)} required placeholder="e.g., Sand Filter" className="fi" />
                  </td>
                  <td className="py-2 pr-3">
                    <input type="text" name="item_description[]" value={row.description} onChange={(e) => update(row.id, 'description', e.target.value)} placeholder="Optional" className="fi" />
                  </td>
                  <td className="py-2 pr-3">
                    <input type="number" name="item_quantity[]" value={row.quantity} onChange={(e) => update(row.id, 'quantity', e.target.value)} min="0.01" step="0.01" className="fi" />
                  </td>
                  <td className="py-2 pr-3">
                    <input type="text" name="item_unit[]" value={row.unit} onChange={(e) => update(row.id, 'unit', e.target.value)} placeholder="pcs" className="fi" />
                  </td>
                  <td className="py-2 pr-3">
                    <input type="number" name="item_price[]" value={row.unit_price} onChange={(e) => update(row.id, 'unit_price', e.target.value)} min="0" step="0.01" placeholder="0.00" required className="fi" />
                  </td>
                  <td className="py-2 pr-3 text-center">
                    <input type="hidden" name="item_vat_applicable[]" value={row.vat_applicable ? 'true' : 'false'} />
                    <input type="checkbox" checked={row.vat_applicable} onChange={(e) => update(row.id, 'vat_applicable', e.target.checked)} className="w-4 h-4 accent-blue-600" />
                  </td>
                  <td className="py-2 pr-3">
                    <input type="number" name="item_vat_rate[]" value={row.vat_rate} onChange={(e) => update(row.id, 'vat_rate', e.target.value)} min="0" max="100" step="0.01" disabled={!row.vat_applicable} className="fi" style={{ opacity: row.vat_applicable ? 1 : 0.4 }} />
                  </td>
                  <td className="py-2 pr-3 text-right font-mono text-sm" style={{ color: '#1D1D1F' }}>{fmt(subtotal)}</td>
                  <td className="py-2 pr-3 text-right font-mono text-sm" style={{ color: '#1D1D1F' }}>{vatAmt > 0 ? fmt(vatAmt) : '—'}</td>
                  <td className="py-2">
                    <button type="button" onClick={() => removeRow(row.id)} className="text-gray-400 hover:text-red-500 transition-colors text-lg leading-none" title="Remove">×</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <button type="button" onClick={addRow} className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700">+ Add line item</button>

      <div className="mt-4 flex justify-end">
        <div className="w-64 space-y-1">
          <div className="flex justify-between text-sm" style={{ color: '#6E6E73' }}>
            <span>Subtotal</span><span className="font-mono">AED {fmt(totals.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm" style={{ color: '#6E6E73' }}>
            <span>VAT</span><span className="font-mono">AED {fmt(totals.vat)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold pt-2" style={{ borderTop: '1px solid #E5E5EA', color: '#1D1D1F' }}>
            <span>Total</span><span className="font-mono">AED {fmt(totals.total)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
