import { notFound } from 'next/navigation'
import {
  DocumentAmountBreakdown,
  DocumentInfoGrid,
  DocumentPrintLayout,
  DocumentTextBlock,
} from '@/components/document-print-layout'
import { requireAuthenticatedAppUser } from '@/lib/auth'
import { getPurchaseOrderById } from '@/lib/purchases'
import { formatCurrency, formatDate } from '@/lib/projects'

export default async function PurchaseOrderPrintPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { db } = await requireAuthenticatedAppUser()
  const { id } = await params
  const purchaseOrder = await getPurchaseOrderById(id, db)

  if (!purchaseOrder) {
    notFound()
  }

  return (
    <DocumentPrintLayout
      backHref={`/purchases/${purchaseOrder.id}`}
      backLabel="Back to Purchase Order"
      documentLabel="Purchase Order"
      documentNumber={purchaseOrder.po_number}
      title={purchaseOrder.vendor_name || 'Vendor Purchase Order'}
      subtitle={purchaseOrder.project_name || undefined}
      documentDate={formatDate(purchaseOrder.order_date)}
    >
      <DocumentInfoGrid
        columns={4}
        items={[
          { label: 'Order Date', value: formatDate(purchaseOrder.order_date) },
          { label: 'Expected Delivery', value: formatDate(purchaseOrder.expected_delivery) },
          { label: 'Status', value: purchaseOrder.status },
          { label: 'Received At', value: formatDate(purchaseOrder.received_at) },
        ]}
      />

      <section className="document-keep-together overflow-hidden rounded-xl border border-slate-200 bg-white/56">
        <table className="min-w-full table-fixed divide-y divide-slate-200">
          <thead style={{ backgroundColor: 'var(--doc-accent)' }}>
            <tr>
              <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-white">Item</th>
              <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-white">Qty</th>
              <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-white">Received</th>
              <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-white">Unit</th>
              <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-white">Unit Price</th>
              <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-white">Line Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white/30">
            {purchaseOrder.items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-slate-900">{item.item_name}</div>
                  {item.description ? <div className="mt-1 text-xs text-slate-500">{item.description}</div> : null}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">{item.quantity}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{item.received_quantity}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{item.unit}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{formatCurrency(item.unit_price)}</td>
                <td className="px-4 py-3 text-sm font-medium text-slate-900">{formatCurrency(item.total_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_88mm]">
        <div>{purchaseOrder.notes ? <DocumentTextBlock title="Notes" value={purchaseOrder.notes} /> : null}</div>

        <DocumentAmountBreakdown
          title="PO Breakdown"
          rows={[
            { label: 'Subtotal', value: formatCurrency(purchaseOrder.subtotal) },
            { label: 'VAT', value: purchaseOrder.vat_applicable ? formatCurrency(purchaseOrder.vat_amount) : 'Not Applicable' },
          ]}
          totalLabel="Total Amount"
          totalValue={formatCurrency(purchaseOrder.total_amount)}
          totalAmount={purchaseOrder.total_amount}
        />
      </div>
    </DocumentPrintLayout>
  )
}
