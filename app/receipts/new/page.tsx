import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AppLogo } from '@/components/app-logo'
import { PaymentAmountField } from '@/components/payment-amount-field'
import { requireAuthenticatedAppUser } from '@/lib/auth'
import { getRolePermissions } from '@/lib/auth-constants'
import { createReceipt, RECEIPT_PAYMENT_METHODS } from '@/lib/receipts'
import { getOutstandingInvoices } from '@/lib/invoices'
import { parseVatApplicableValue } from '@/lib/vat'

export default async function NewReceiptPage({
  searchParams,
}: {
  searchParams: Promise<{ invoice_id?: string | string[]; amount?: string | string[]; error?: string }>
}) {
  const { appUser, db } = await requireAuthenticatedAppUser(['admin', 'manager', 'accountant'])
  const permissions = getRolePermissions(appUser.role)
  const resolvedSearchParams = await searchParams
  const selectedInvoiceId = Array.isArray(resolvedSearchParams.invoice_id)
    ? resolvedSearchParams.invoice_id[0] || ''
    : resolvedSearchParams.invoice_id || ''
  const prefilledAmount = Array.isArray(resolvedSearchParams.amount)
    ? resolvedSearchParams.amount[0] || ''
    : resolvedSearchParams.amount || ''
  const errorCode = resolvedSearchParams.error || ''

  if (!permissions.canManageReceipts) {
    redirect('/access-denied')
  }

  const invoices = await getOutstandingInvoices(db)

  async function handleSubmit(formData: FormData) {
    'use server'

    const { appUser, db } = await requireAuthenticatedAppUser(['admin', 'manager', 'accountant'])
    const permissions = getRolePermissions(appUser.role)

    if (!permissions.canManageReceipts) {
      redirect('/access-denied')
    }

    const receiptNumber = (formData.get('receipt_number') as string || '').trim()
    const invoiceId = formData.get('invoice_id') as string
    const amount = parseFloat(formData.get('amount') as string) || 0
    const vatApplicable = parseVatApplicableValue(formData.get('vat_applicable'))
    const vatAmount = parseFloat(formData.get('vat_amount') as string) || 0
    const paymentMethod = formData.get('payment_method') as string
    const receiptDate = formData.get('receipt_date') as string
    const referenceNumber = formData.get('reference_number') as string
    const bankName = formData.get('bank_name') as string
    const notes = formData.get('notes') as string
    const selectedPaymentMethod = RECEIPT_PAYMENT_METHODS.find((method) => method === paymentMethod)

    if (!receiptNumber || !invoiceId || amount <= 0 || !selectedPaymentMethod) {
      return
    }

    // Look up the linked project and client so the receipt row stays denormalized correctly.
    const { data: invoice } = await db
      .from('invoices')
      .select('project_id, client_id')
      .eq('id', invoiceId)
      .single()

    if (!invoice) {
      return
    }

    const receipt = await createReceipt({
      receipt_number: receiptNumber,
      invoice_id: invoiceId,
      project_id: invoice.project_id,
      client_id: invoice.client_id,
      amount,
      vat_applicable: vatApplicable,
      vat_amount: vatAmount,
      payment_method: selectedPaymentMethod,
      receipt_date: receiptDate || new Date().toISOString().split('T')[0],
      reference_number: referenceNumber || null,
      bank_name: bankName || null,
      notes: notes || null,
    }, db)

    if (receipt && 'error' in receipt && receipt.error === 'duplicate_number') {
      redirect(`/receipts/new?error=duplicate_number&invoice_id=${invoiceId}`)
    }
    if (receipt) redirect(`/invoices/${invoiceId}`)
  }

  return (
    <div className="min-h-full">
      <header className="bg-slate-900 text-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <AppLogo />
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-300">Welcome, {appUser?.full_name || appUser?.email}</span>
              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
                >
                  Logout
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 py-2">
            <NavItem href="/" label="Dashboard" />
            <NavItem href="/projects" label="Projects" />
            <NavItem href="/vendors" label="Parties" />
            <NavItem href="/purchases" label="Purchases" />
            <NavItem href="/expenses" label="Expenses" />
            <NavItem href="/invoices" label="Invoices" />
            <NavItem href="/vendor-payments" label="Vendor Payments" />
            <NavItem href="/reports" label="Reports" />
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href="/invoices" className="text-sm text-slate-600 hover:text-slate-900">← Back to Invoices</Link>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Record Payment</h2>
          <p className="mt-1 text-sm text-slate-600">Record a client payment against an invoice</p>

          {errorCode === 'duplicate_number' && (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              ⚠️ That receipt number already exists. Please use a different number.
            </div>
          )}

          <form action={handleSubmit} className="mt-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">Receipt Number *</label>
              <input type="text" name="receipt_number" required placeholder="e.g., REC-2026-001" className="block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 sm:text-sm" />
            </div>

            <div>
              <label htmlFor="invoice_id" className="block text-sm font-medium text-slate-900">Invoice *</label>
              <select
                name="invoice_id"
                id="invoice_id"
                required
                defaultValue={selectedInvoiceId}
                className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
              >
                <option value="">Select an invoice</option>
                {invoices.map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.invoice_number} - {invoice.client_name} (Due: {invoice.balance_due} AED)
                  </option>
                ))}
              </select>
              {invoices.length === 0 && (
                <p className="mt-2 text-sm text-amber-600">No outstanding invoices found.</p>
              )}
            </div>

            <div>
              <label htmlFor="receipt_date" className="block text-sm font-medium text-slate-900">Receipt Date</label>
              <input
                type="date"
                name="receipt_date"
                id="receipt_date"
                defaultValue={new Date().toISOString().split('T')[0]}
                className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
              />
            </div>
            <PaymentAmountField
              initialAmount={parseFloat(prefilledAmount) || 0}
              amountLabel="Amount Received (AED)"
            />

            <div>
              <label htmlFor="payment_method" className="block text-sm font-medium text-slate-900">Payment Method *</label>
              <select
                name="payment_method"
                id="payment_method"
                required
                className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
              >
                <option value="">Select method</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
                <option value="Credit Card">Credit Card</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="reference_number" className="block text-sm font-medium text-slate-900">Reference #</label>
                <input
                  type="text"
                  name="reference_number"
                  id="reference_number"
                  placeholder="Cheque number, transaction ID"
                  className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="bank_name" className="block text-sm font-medium text-slate-900">Bank Name</label>
                <input
                  type="text"
                  name="bank_name"
                  id="bank_name"
                  placeholder="e.g., Emirates NBD"
                  className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-slate-900">Notes</label>
              <textarea
                name="notes"
                id="notes"
                rows={2}
                placeholder="Additional notes..."
                className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={invoices.length === 0}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Record Payment
              </button>
              <Link
                href="/invoices"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}

function NavItem({ href, label, active }: { href: string; label: string; active?: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
        active
          ? 'bg-slate-900 text-white'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      {label}
    </Link>
  )
}
