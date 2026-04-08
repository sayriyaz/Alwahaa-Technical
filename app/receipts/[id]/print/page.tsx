import { notFound } from 'next/navigation'
import {
  DocumentAmountBreakdown,
  DocumentInfoGrid,
  DocumentPrintLayout,
  DocumentTextBlock,
} from '@/components/document-print-layout'
import { requireAuthenticatedAppUser } from '@/lib/auth'
import { formatCurrency, formatDate } from '@/lib/projects'
import { getReceiptById } from '@/lib/receipts'

export default async function ReceiptPrintPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { db } = await requireAuthenticatedAppUser()
  const { id } = await params
  const receipt = await getReceiptById(id, db)

  if (!receipt) {
    notFound()
  }

  const totalReceived = receipt.amount + (receipt.vat_applicable ? receipt.vat_amount : 0)

  return (
    <DocumentPrintLayout
      backHref={`/receipts?invoice_id=${receipt.invoice_id}`}
      backLabel="Back to Receipts"
      documentLabel="Receipt"
      documentNumber={receipt.receipt_number}
      title={receipt.client_name || 'Client Receipt'}
      subtitle={receipt.project_name || undefined}
      documentDate={formatDate(receipt.receipt_date)}
    >
      <DocumentInfoGrid
        columns={4}
        items={[
          { label: 'Invoice', value: receipt.invoice_number || '-' },
          { label: 'Receipt Date', value: formatDate(receipt.receipt_date) },
          { label: 'Payment Method', value: receipt.payment_method },
          { label: 'Reference Number', value: receipt.reference_number || '-' },
          { label: 'Bank Name', value: receipt.bank_name || '-' },
          { label: 'Project', value: receipt.project_name || '-' },
          { label: 'Client', value: receipt.client_name || '-' },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>{receipt.notes ? <DocumentTextBlock title="Notes" value={receipt.notes} /> : null}</div>

        <DocumentAmountBreakdown
          title="Receipt Breakdown"
          rows={[
            { label: 'Amount Received', value: formatCurrency(receipt.amount) },
            { label: 'VAT', value: receipt.vat_applicable ? formatCurrency(receipt.vat_amount) : 'Not Applicable' },
          ]}
          totalLabel="Total Received"
          totalValue={formatCurrency(totalReceived)}
          totalAmount={totalReceived}
        />
      </div>
    </DocumentPrintLayout>
  )
}
