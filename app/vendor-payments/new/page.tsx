import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AppLogo } from '@/components/app-logo'
import { ManualVatFields } from '@/components/manual-vat-fields'
import { requireAuthenticatedAppUser } from '@/lib/auth'
import { getRolePermissions } from '@/lib/auth-constants'
import { createVendorPayment, VENDOR_PAYMENT_METHODS } from '@/lib/receipts'
import { getVendors } from '@/lib/vendors'
import { getProjects } from '@/lib/projects'
import { getPurchaseOrders } from '@/lib/purchases'
import { parseVatApplicableValue } from '@/lib/vat'

export default async function NewVendorPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{
    vendor_id?: string | string[]
    project_id?: string | string[]
    purchase_order_id?: string | string[]
  }>
}) {
  const { appUser, db } = await requireAuthenticatedAppUser(['admin', 'manager', 'accountant'])
  const permissions = getRolePermissions(appUser.role)

  if (!permissions.canManageVendorPayments) {
    redirect('/access-denied')
  }

  const resolvedSearchParams = await searchParams
  const selectedVendorId = Array.isArray(resolvedSearchParams.vendor_id)
    ? resolvedSearchParams.vendor_id[0] || ''
    : resolvedSearchParams.vendor_id || ''
  const selectedProjectId = Array.isArray(resolvedSearchParams.project_id)
    ? resolvedSearchParams.project_id[0] || ''
    : resolvedSearchParams.project_id || ''

  const [vendors, projects, vendorPOs] = await Promise.all([
    getVendors(db),
    getProjects(db),
    selectedVendorId ? getPurchaseOrders(db, { vendorId: selectedVendorId }) : Promise.resolve([]),
  ])

  async function handleSubmit(formData: FormData) {
    'use server'

    const { appUser, db } = await requireAuthenticatedAppUser(['admin', 'manager', 'accountant'])
    const permissions = getRolePermissions(appUser.role)

    if (!permissions.canManageVendorPayments) {
      redirect('/access-denied')
    }

    const vendorId = formData.get('vendor_id') as string
    const projectId = formData.get('project_id') as string
    const purchaseOrderId = formData.get('purchase_order_id') as string
    const amount = parseFloat(formData.get('amount') as string) || 0
    const vatApplicable = parseVatApplicableValue(formData.get('vat_applicable'))
    const vatAmount = parseFloat(formData.get('vat_amount') as string) || 0
    const paymentMethod = formData.get('payment_method') as string
    const paymentDate = formData.get('payment_date') as string
    const referenceNumber = formData.get('reference_number') as string
    const bankName = formData.get('bank_name') as string
    const notes = formData.get('notes') as string
    const selectedPaymentMethod = VENDOR_PAYMENT_METHODS.find((method) => method === paymentMethod)

    if (!vendorId || amount <= 0 || !selectedPaymentMethod) {
      return
    }

    const payment = await createVendorPayment({
      vendor_id: vendorId,
      purchase_order_id: purchaseOrderId || null,
      project_id: projectId || null,
      amount,
      vat_applicable: vatApplicable,
      vat_amount: vatAmount,
      payment_method: selectedPaymentMethod,
      payment_date: paymentDate || new Date().toISOString().split('T')[0],
      reference_number: referenceNumber || null,
      bank_name: bankName || null,
      notes: notes || null,
    }, db)

    if (payment) {
      const redirectParams = new URLSearchParams()
      if (vendorId) redirectParams.set('vendor_id', vendorId)
      if (projectId) redirectParams.set('project_id', projectId)
      redirectParams.set('success', 'created')
      const redirectTarget = redirectParams.size > 0
        ? `/vendor-payments?${redirectParams.toString()}`
        : '/vendor-payments'
      redirect(redirectTarget)
    }
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
            <NavItem href="/vendor-payments" label="Vendor Payments" active />
            <NavItem href="/reports" label="Reports" />
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href="/vendor-payments" className="text-sm text-slate-600 hover:text-slate-900">← Back to Vendor Payments</Link>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Pay Vendor</h2>
          <p className="mt-1 text-sm text-slate-600">Record a payment to a supplier or contractor</p>

          <form action={handleSubmit} className="mt-6 space-y-6">
            <div>
              <label htmlFor="vendor_id" className="block text-sm font-medium text-slate-900">Vendor *</label>
              <select
                name="vendor_id"
                id="vendor_id"
                required
                defaultValue={selectedVendorId}
                className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
              >
                <option value="">Select a vendor</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="project_id" className="block text-sm font-medium text-slate-900">Project (optional)</label>
              <select
                name="project_id"
                id="project_id"
                defaultValue={selectedProjectId}
                className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
              >
                <option value="">General Payment</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="purchase_order_id" className="block text-sm font-medium text-slate-900">Purchase Order (optional)</label>
              <select
                name="purchase_order_id"
                id="purchase_order_id"
                className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
              >
                <option value="">Standalone payment</option>
                {vendorPOs.map((po) => (
                  <option key={po.id} value={po.id}>{po.po_number} — {po.project_name}</option>
                ))}
              </select>
              {!selectedVendorId && (
                <p className="mt-1 text-xs text-slate-500">Select a vendor above to see their purchase orders.</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-slate-900">Amount Paid (AED) *</label>
                <input
                  type="number"
                  name="amount"
                  id="amount"
                  required
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="payment_date" className="block text-sm font-medium text-slate-900">Payment Date</label>
                <input
                  type="date"
                  name="payment_date"
                  id="payment_date"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
                />
              </div>
            </div>
            <ManualVatFields idPrefix="vendor-payment-create" initialVatApplicable initialVatAmount={0} />
            <p className="text-xs text-slate-500">
              Enter the full paid amount here. VAT is recorded separately below and is not auto-calculated.
            </p>

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
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="reference_number" className="block text-sm font-medium text-slate-900">Reference #</label>
                <input
                  type="text"
                  name="reference_number"
                  id="reference_number"
                  placeholder="Check number, transaction ID"
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
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Record Payment
              </button>
              <Link
                href="/vendor-payments"
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
