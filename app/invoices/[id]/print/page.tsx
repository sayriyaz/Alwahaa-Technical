import { notFound } from 'next/navigation'
import {
  DocumentAmountBreakdown,
  DocumentBankDetails,
  DocumentInfoGrid,
  DocumentPrintLayout,
} from '@/components/document-print-layout'
import { requireAuthenticatedAppUser } from '@/lib/auth'
import { getInvoiceById } from '@/lib/invoices'
import { formatCurrency, formatDate } from '@/lib/projects'

export default async function InvoicePrintPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { db } = await requireAuthenticatedAppUser()
  const { id } = await params
  const invoice = await getInvoiceById(id, db)

  if (!invoice) {
    notFound()
  }

  return (
    <DocumentPrintLayout
      backHref={`/invoices/${invoice.id}`}
      backLabel="Back to Invoice"
      documentLabel="Invoice "
      documentNumber={invoice.invoice_number}
      title={invoice.client_name || 'Client Invoice'}
      subtitle={
        <>
          {invoice.project_name ? <div>{invoice.project_name}</div> : null}
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
            Project No: {invoice.project_code || '-'}
          </div>
          {invoice.client_address ? (
            <div className="mt-1 whitespace-pre-wrap text-[11px] normal-case tracking-normal text-slate-600">
              {invoice.client_address}
            </div>
          ) : null}
        </>
      }
      documentDate={formatDate(invoice.invoice_date)}
    >
      <DocumentInfoGrid
        columns={2}
        items={[
          { label: 'Invoice Date', value: formatDate(invoice.invoice_date) },
          { label: 'Due Date', value: formatDate(invoice.due_date) },
        ]}
      />

      <section className="document-keep-together overflow-hidden rounded-xl border border-slate-200 bg-white/56">
        <table className="min-w-full table-fixed divide-y divide-slate-200">
          <thead style={{ backgroundColor: 'var(--doc-accent)' }}>
            <tr>
              <th className="w-[42%] px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-white">Description</th>
              <th className="w-[10%] px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-white">Qty</th>
              <th className="w-[14%] px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-white">Unit</th>
              <th className="w-[16%] px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-white">Unit Price</th>
              <th className="w-[18%] px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-white">Line Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white/30">
            {invoice.items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 text-sm text-slate-700">{item.description}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{item.quantity}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{item.unit || '-'}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{formatCurrency(item.unit_price)}</td>
                <td className="px-4 py-3 text-sm font-medium text-slate-900">{formatCurrency(item.total_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="ml-auto w-full max-w-[80mm]">
        <DocumentAmountBreakdown
          title="Invoice Summary"
          rows={[
            { label: 'Subtotal', value: formatCurrency(invoice.subtotal) },
            { label: 'VAT', value: invoice.vat_applicable ? formatCurrency(invoice.vat_amount) : 'Not Applicable' },
            { label: 'Amount Paid', value: formatCurrency(invoice.amount_paid) },
            // { label: 'Balance Due', value: formatCurrency(invoice.balance_due) },
          ]}
          totalLabel="Total Amount"
          totalValue={formatCurrency(invoice.total_amount)}
          totalAmount={invoice.total_amount}
        />
      </div>

      <div className="mt-[8mm] w-full max-w-[90mm]">
        <DocumentBankDetails />
      </div>
    </DocumentPrintLayout>
  )
}
