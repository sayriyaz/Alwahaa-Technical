import { notFound } from 'next/navigation'
import {
  DocumentAmountBreakdown,
  DocumentInfoGrid,
  DocumentPrintLayout,
  DocumentTextBlock,
} from '@/components/document-print-layout'
import { requireAuthenticatedAppUser } from '@/lib/auth'
import { formatCurrency, formatDate } from '@/lib/projects'
import { getVendorPaymentById } from '@/lib/receipts'

export default async function VendorPaymentPrintPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { db } = await requireAuthenticatedAppUser()
  const { id } = await params
  const payment = await getVendorPaymentById(id, db)

  if (!payment) {
    notFound()
  }

  const totalPaid = payment.amount + (payment.vat_applicable ? payment.vat_amount : 0)

  return (
    <DocumentPrintLayout
      backHref={`/vendor-payments?vendor_id=${payment.vendor_id}`}
      backLabel="Back to Vendor Payments"
      documentLabel="Vendor Payment"
      documentNumber={payment.payment_number}
      title={payment.vendor_name || 'Vendor Payment'}
      subtitle={payment.project_name || payment.po_number || 'Standalone payment'}
      documentDate={formatDate(payment.payment_date)}
    >
      <DocumentInfoGrid
        columns={4}
        items={[
          { label: 'Payment Date', value: formatDate(payment.payment_date) },
          { label: 'Payment Method', value: payment.payment_method },
          { label: 'Reference Number', value: payment.reference_number || '-' },
          { label: 'Bank Name', value: payment.bank_name || '-' },
          { label: 'Project', value: payment.project_name || 'General Payment' },
          { label: 'Purchase Order', value: payment.po_number || 'Standalone payment' },
          { label: 'Vendor', value: payment.vendor_name || '-' },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>{payment.notes ? <DocumentTextBlock title="Notes" value={payment.notes} /> : null}</div>

        <DocumentAmountBreakdown
          title="Payment Breakdown"
          rows={[
            { label: 'Base Amount', value: formatCurrency(payment.amount) },
            { label: 'VAT', value: payment.vat_applicable ? formatCurrency(payment.vat_amount) : 'Not Applicable' },
          ]}
          totalLabel="Total Paid"
          totalValue={formatCurrency(totalPaid)}
          totalAmount={totalPaid}
        />
      </div>
    </DocumentPrintLayout>
  )
}
