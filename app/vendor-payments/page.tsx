import type { ReactNode } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppLogo } from '@/components/app-logo'
import { ManualVatFields } from '@/components/manual-vat-fields'
import { requireAuthenticatedAppUser } from '@/lib/auth'
import { getRolePermissions } from '@/lib/auth-constants'
import {
  deleteVendorPayment,
  getVendorPayments,
  updateVendorPayment,
  VENDOR_PAYMENT_METHODS,
} from '@/lib/receipts'
import { formatCurrency, formatDate, getProjects } from '@/lib/projects'
import { getVendors } from '@/lib/vendors'
import { getPurchaseOrders } from '@/lib/purchases'
import { parseVatApplicableValue } from '@/lib/vat'

export default async function VendorPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    vendor_id?: string | string[]
    project_id?: string | string[]
    edit?: string | string[]
    error?: string | string[]
    success?: string | string[]
  }>
}) {
  const { appUser, db } = await requireAuthenticatedAppUser()
  const permissions = getRolePermissions(appUser.role)

  if (!permissions.canManageVendorPayments) {
    redirect('/access-denied')
  }

  const resolvedSearchParams = await searchParams
  const vendorId = Array.isArray(resolvedSearchParams.vendor_id)
    ? resolvedSearchParams.vendor_id[0] || ''
    : resolvedSearchParams.vendor_id || ''
  const projectId = Array.isArray(resolvedSearchParams.project_id)
    ? resolvedSearchParams.project_id[0] || ''
    : resolvedSearchParams.project_id || ''
  const editingPaymentId = Array.isArray(resolvedSearchParams.edit)
    ? resolvedSearchParams.edit[0] || ''
    : resolvedSearchParams.edit || ''
  const errorCode = Array.isArray(resolvedSearchParams.error)
    ? resolvedSearchParams.error[0] || ''
    : resolvedSearchParams.error || ''
  const successCode = Array.isArray(resolvedSearchParams.success)
    ? resolvedSearchParams.success[0] || ''
    : resolvedSearchParams.success || ''

  const filterParams = new URLSearchParams()
  if (vendorId) filterParams.set('vendor_id', vendorId)
  if (projectId) filterParams.set('project_id', projectId)

  const basePath = filterParams.size > 0 ? `/vendor-payments?${filterParams.toString()}` : '/vendor-payments'
  const newPaymentParams = new URLSearchParams()
  if (vendorId) newPaymentParams.set('vendor_id', vendorId)
  if (projectId) newPaymentParams.set('project_id', projectId)
  const payVendorHref = newPaymentParams.size > 0 ? `/vendor-payments/new?${newPaymentParams.toString()}` : '/vendor-payments/new'

  const [payments, vendors, projects] = await Promise.all([
    getVendorPayments(db, {
      vendorId: vendorId || undefined,
      projectId: projectId || undefined,
    }),
    getVendors(db),
    getProjects(db),
  ])
  const editingPayment = payments.find((payment) => payment.id === editingPaymentId)
  const editingPaymentPOs = editingPayment
    ? await getPurchaseOrders(db, { vendorId: editingPayment.vendor_id })
    : []

  function buildEditHref(paymentId: string) {
    const params = new URLSearchParams(filterParams)
    params.set('edit', paymentId)
    return `/vendor-payments?${params.toString()}`
  }

  function buildErrorHref(code: string) {
    const params = new URLSearchParams(filterParams)
    params.set('error', code)
    return `/vendor-payments?${params.toString()}`
  }

  function buildSuccessHref(code: string) {
    const params = new URLSearchParams(filterParams)
    params.set('success', code)
    return `/vendor-payments?${params.toString()}`
  }

  async function updateVendorPaymentAction(formData: FormData) {
    'use server'

    const { appUser, db } = await requireAuthenticatedAppUser(['admin', 'manager', 'accountant'])
    const permissions = getRolePermissions(appUser.role)

    if (!permissions.canManageVendorPayments) {
      redirect('/access-denied')
    }

    const paymentId = formData.get('payment_id') as string
    const returnTo = (formData.get('return_to') as string) || '/vendor-payments'
    const errorTo = (formData.get('error_to') as string) || '/vendor-payments?error=update_failed'
    const vendorId = formData.get('vendor_id') as string
    const projectId = formData.get('project_id') as string
    const purchaseOrderId = formData.get('purchase_order_id') as string
    const amount = parseFloat(formData.get('amount') as string) || 0
    const vatApplicable = parseVatApplicableValue(formData.get('vat_applicable'))
    const vatAmount = parseFloat(formData.get('vat_amount') as string) || 0
    const paymentDate = formData.get('payment_date') as string
    const paymentMethod = formData.get('payment_method') as string
    const referenceNumber = formData.get('reference_number') as string
    const bankName = formData.get('bank_name') as string
    const notes = formData.get('notes') as string
    const selectedPaymentMethod = VENDOR_PAYMENT_METHODS.find((method) => method === paymentMethod)

    if (!paymentId || !vendorId || amount <= 0 || !selectedPaymentMethod) {
      redirect(errorTo)
    }

    const updated = await updateVendorPayment(paymentId, {
      vendor_id: vendorId,
      purchase_order_id: purchaseOrderId || null,
      project_id: projectId || null,
      amount,
      vat_applicable: vatApplicable,
      vat_amount: vatAmount,
      payment_date: paymentDate || new Date().toISOString().split('T')[0],
      payment_method: selectedPaymentMethod,
      reference_number: referenceNumber || null,
      bank_name: bankName || null,
      notes: notes || null,
    }, db)

    if (!updated) {
      redirect(errorTo)
    }

    redirect(returnTo)
  }

  async function deleteVendorPaymentAction(formData: FormData) {
    'use server'

    const { appUser, db } = await requireAuthenticatedAppUser(['admin'])
    const permissions = getRolePermissions(appUser.role)

    if (!permissions.canDeleteVendorPayments) {
      redirect('/access-denied')
    }

    const paymentId = formData.get('payment_id') as string
    const returnTo = (formData.get('return_to') as string) || '/vendor-payments'
    const errorTo = (formData.get('error_to') as string) || '/vendor-payments?error=delete_failed'

    if (!paymentId) {
      redirect(errorTo)
    }

    const deleted = await deleteVendorPayment(paymentId, db)

    if (!deleted) {
      redirect(errorTo)
    }

    redirect(returnTo)
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

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Vendor Payments</h2>
            <p className="mt-1 text-sm text-slate-600">View, edit, and delete outgoing supplier payment records.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/vendors"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Back to Parties
            </Link>
            <Link
              href={payVendorHref}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              + Pay Vendor
            </Link>
          </div>
        </div>

        {errorCode === 'update_failed' && (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            Vendor payment update failed. Please try again.
          </div>
        )}

        {errorCode === 'delete_failed' && (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            Vendor payment deletion failed. Please try again.
          </div>
        )}

        {successCode === 'created' && (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Vendor payment recorded successfully.
          </div>
        )}

        {successCode === 'updated' && (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Vendor payment updated successfully.
          </div>
        )}

        {successCode === 'deleted' && (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Vendor payment deleted successfully.
          </div>
        )}

        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Payment #</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Vendor</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Project / PO</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="font-medium text-slate-900">{payment.payment_number}</div>
                    <div className="text-xs text-slate-500">{payment.reference_number || 'No reference'}</div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{payment.vendor_name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <div>{payment.project_name || 'General Payment'}</div>
                    <div className="text-xs text-slate-500">
                      {payment.po_number || (payment.project_id ? 'No PO linked' : 'Standalone payment')}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm font-medium text-slate-900">{formatCurrency(payment.amount)}</div>
                    <div className="text-xs text-slate-500">
                      {payment.vat_applicable ? `VAT ${formatCurrency(payment.vat_amount)}` : 'No VAT'}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{payment.payment_method}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{formatDate(payment.payment_date)}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/vendor-payments/${payment.id}/print`} className="font-medium text-sky-700 hover:text-sky-800">
                        Print
                      </Link>
                      <Link href={buildEditHref(payment.id)} className="font-medium text-slate-700 hover:text-slate-900">
                        Edit
                      </Link>
                      {permissions.canDeleteVendorPayments && (
                        <form action={deleteVendorPaymentAction}>
                          <input type="hidden" name="payment_id" value={payment.id} />
                          <input type="hidden" name="return_to" value={buildSuccessHref('deleted')} />
                          <input type="hidden" name="error_to" value={buildErrorHref('delete_failed')} />
                          <button
                            type="submit"
                            className="font-medium text-rose-600 hover:text-rose-700"
                          >
                            Delete
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    No vendor payments found for the current selection.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {editingPayment && (
          <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Edit Vendor Payment</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Update vendor payment details here.
                </p>
              </div>
              <Link
                href={basePath}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </Link>
            </div>

            <form action={updateVendorPaymentAction} className="mt-6 space-y-6">
              <input type="hidden" name="payment_id" value={editingPayment.id} />
              <input type="hidden" name="return_to" value={buildSuccessHref('updated')} />
              <input type="hidden" name="error_to" value={buildErrorHref('update_failed')} />

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Vendor" htmlFor="vendor_id">
                  <select id="vendor_id" name="vendor_id" defaultValue={editingPayment.vendor_id} className={inputClassName}>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Project" htmlFor="project_id">
                  <select id="project_id" name="project_id" defaultValue={editingPayment.project_id || ''} className={inputClassName}>
                    <option value="">General Payment</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Purchase Order" htmlFor="purchase_order_id">
                  <select id="purchase_order_id" name="purchase_order_id" defaultValue={editingPayment.purchase_order_id || ''} className={inputClassName}>
                    <option value="">Standalone payment</option>
                    {editingPaymentPOs.map((po) => (
                      <option key={po.id} value={po.id}>{po.po_number} — {po.project_name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Payment Date" htmlFor="payment_date">
                  <input
                    id="payment_date"
                    name="payment_date"
                    type="date"
                    defaultValue={editingPayment.payment_date}
                    className={inputClassName}
                  />
                </Field>
                <Field label="Amount Paid (AED)" htmlFor="amount">
                  <input
                    id="amount"
                    name="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    defaultValue={String(editingPayment.amount)}
                    className={inputClassName}
                  />
                </Field>
                <Field label="Payment Method" htmlFor="payment_method">
                  <select
                    id="payment_method"
                    name="payment_method"
                    defaultValue={editingPayment.payment_method}
                    className={inputClassName}
                  >
                    {VENDOR_PAYMENT_METHODS.map((method) => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <ManualVatFields
                idPrefix="vendor-payment-edit"
                initialVatApplicable={editingPayment.vat_applicable}
                initialVatAmount={editingPayment.vat_amount}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Reference #" htmlFor="reference_number">
                  <input
                    id="reference_number"
                    name="reference_number"
                    type="text"
                    defaultValue={editingPayment.reference_number || ''}
                    className={inputClassName}
                  />
                </Field>
                <Field label="Bank Name" htmlFor="bank_name">
                  <input
                    id="bank_name"
                    name="bank_name"
                    type="text"
                    defaultValue={editingPayment.bank_name || ''}
                    className={inputClassName}
                  />
                </Field>
              </div>

              <Field label="Notes" htmlFor="notes">
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  defaultValue={editingPayment.notes || ''}
                  className={textareaClassName}
                />
              </Field>

              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Save Vendor Payment Changes
              </button>
            </form>
          </section>
        )}
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

const inputClassName = 'mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm'
const textareaClassName = 'mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm'

function Field({
  children,
  htmlFor,
  label,
}: {
  children: ReactNode
  htmlFor: string
  label: string
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-900">
        {label}
      </label>
      {children}
    </div>
  )
}
