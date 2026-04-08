import type { ReactNode } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppLogo } from '@/components/app-logo'
import { ManualVatFields } from '@/components/manual-vat-fields'
import { requireAuthenticatedAppUser } from '@/lib/auth'
import { getRolePermissions } from '@/lib/auth-constants'
import {
  deleteReceipt,
  getReceipts,
  RECEIPT_PAYMENT_METHODS,
  updateReceipt,
} from '@/lib/receipts'
import { formatCurrency, formatDate } from '@/lib/projects'
import { parseVatApplicableValue } from '@/lib/vat'

export default async function ReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<{
    invoice_id?: string | string[]
    client_id?: string | string[]
    project_id?: string | string[]
    edit?: string | string[]
    error?: string | string[]
  }>
}) {
  const { appUser, db } = await requireAuthenticatedAppUser()
  const permissions = getRolePermissions(appUser.role)

  if (!permissions.canManageReceipts) {
    redirect('/access-denied')
  }

  const resolvedSearchParams = await searchParams
  const invoiceId = Array.isArray(resolvedSearchParams.invoice_id)
    ? resolvedSearchParams.invoice_id[0] || ''
    : resolvedSearchParams.invoice_id || ''
  const clientId = Array.isArray(resolvedSearchParams.client_id)
    ? resolvedSearchParams.client_id[0] || ''
    : resolvedSearchParams.client_id || ''
  const projectId = Array.isArray(resolvedSearchParams.project_id)
    ? resolvedSearchParams.project_id[0] || ''
    : resolvedSearchParams.project_id || ''
  const editingReceiptId = Array.isArray(resolvedSearchParams.edit)
    ? resolvedSearchParams.edit[0] || ''
    : resolvedSearchParams.edit || ''
  const errorCode = Array.isArray(resolvedSearchParams.error)
    ? resolvedSearchParams.error[0] || ''
    : resolvedSearchParams.error || ''

  const filterParams = new URLSearchParams()
  if (invoiceId) filterParams.set('invoice_id', invoiceId)
  if (clientId) filterParams.set('client_id', clientId)
  if (projectId) filterParams.set('project_id', projectId)

  const basePath = filterParams.size > 0 ? `/receipts?${filterParams.toString()}` : '/receipts'
  const recordPaymentHref = invoiceId ? `/receipts/new?invoice_id=${invoiceId}` : '/receipts/new'

  const receipts = await getReceipts(db, {
    invoiceId: invoiceId || undefined,
    clientId: clientId || undefined,
    projectId: projectId || undefined,
  })
  const editingReceipt = receipts.find((receipt) => receipt.id === editingReceiptId)

  function buildEditHref(receiptId: string) {
    const params = new URLSearchParams(filterParams)
    params.set('edit', receiptId)
    return `/receipts?${params.toString()}`
  }

  function buildErrorHref(code: string) {
    const params = new URLSearchParams(filterParams)
    params.set('error', code)
    return `/receipts?${params.toString()}`
  }

  async function updateReceiptAction(formData: FormData) {
    'use server'

    const { appUser, db } = await requireAuthenticatedAppUser(['admin', 'manager', 'accountant'])
    const permissions = getRolePermissions(appUser.role)

    if (!permissions.canManageReceipts) {
      redirect('/access-denied')
    }

    const receiptId = formData.get('receipt_id') as string
    const returnTo = (formData.get('return_to') as string) || '/receipts'
    const errorTo = (formData.get('error_to') as string) || '/receipts?error=update_failed'
    const receiptDate = formData.get('receipt_date') as string
    const amount = parseFloat(formData.get('amount') as string) || 0
    const vatApplicable = parseVatApplicableValue(formData.get('vat_applicable'))
    const vatAmount = parseFloat(formData.get('vat_amount') as string) || 0
    const paymentMethod = formData.get('payment_method') as string
    const referenceNumber = formData.get('reference_number') as string
    const bankName = formData.get('bank_name') as string
    const notes = formData.get('notes') as string
    const selectedPaymentMethod = RECEIPT_PAYMENT_METHODS.find((method) => method === paymentMethod)

    if (!receiptId || amount <= 0 || !selectedPaymentMethod) {
      redirect(errorTo)
    }

    const updated = await updateReceipt(receiptId, {
      receipt_date: receiptDate || new Date().toISOString().split('T')[0],
      amount,
      vat_applicable: vatApplicable,
      vat_amount: vatAmount,
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

  async function deleteReceiptAction(formData: FormData) {
    'use server'

    const { appUser, db } = await requireAuthenticatedAppUser(['admin'])
    const permissions = getRolePermissions(appUser.role)

    if (!permissions.canDeleteReceipts) {
      redirect('/access-denied')
    }

    const receiptId = formData.get('receipt_id') as string
    const returnTo = (formData.get('return_to') as string) || '/receipts'
    const errorTo = (formData.get('error_to') as string) || '/receipts?error=delete_failed'

    if (!receiptId) {
      redirect(errorTo)
    }

    const deleted = await deleteReceipt(receiptId, db)

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
            <NavItem href="/invoices" label="Invoices" active />
            <NavItem href="/vendor-payments" label="Vendor Payments" />
            <NavItem href="/reports" label="Reports" />
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Receipts</h2>
            <p className="mt-1 text-sm text-slate-600">View, edit, and delete client payment records.</p>
          </div>
          <div className="flex items-center gap-3">
            {invoiceId && (
              <Link
                href={`/invoices/${invoiceId}`}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                View Invoice
              </Link>
            )}
            <Link
              href={recordPaymentHref}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              + Record Payment
            </Link>
          </div>
        </div>

        {errorCode === 'update_failed' && (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            Receipt update failed. Please try again.
          </div>
        )}

        {errorCode === 'delete_failed' && (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            Receipt deletion failed. Please try again.
          </div>
        )}

        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Receipt #</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Invoice</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {receipts.map((receipt) => (
                <tr key={receipt.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="font-medium text-slate-900">{receipt.receipt_number}</div>
                    <div className="text-xs text-slate-500">{receipt.reference_number || 'No reference'}</div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                    <Link href={`/invoices/${receipt.invoice_id}`} className="font-medium text-slate-700 hover:text-slate-900">
                      {receipt.invoice_number || 'Invoice'}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{receipt.client_name}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{receipt.project_name}</td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm font-medium text-slate-900">{formatCurrency(receipt.amount)}</div>
                    <div className="text-xs text-slate-500">
                      {receipt.vat_applicable ? `VAT ${formatCurrency(receipt.vat_amount)}` : 'No VAT'}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{receipt.payment_method}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{formatDate(receipt.receipt_date)}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/receipts/${receipt.id}/print`} className="font-medium text-sky-700 hover:text-sky-800">
                        Print
                      </Link>
                      <Link href={buildEditHref(receipt.id)} className="font-medium text-slate-700 hover:text-slate-900">
                        Edit
                      </Link>
                      {permissions.canDeleteReceipts && (
                        <form action={deleteReceiptAction}>
                          <input type="hidden" name="receipt_id" value={receipt.id} />
                          <input type="hidden" name="return_to" value={basePath} />
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
              {receipts.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                    No receipts found for the current selection.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {editingReceipt && (
          <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Edit Receipt</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Update the payment amount or reference details here.
                </p>
              </div>
              <Link
                href={basePath}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </Link>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <SummaryCard title="Invoice" value={editingReceipt.invoice_number || '-'} />
              <SummaryCard title="Client" value={editingReceipt.client_name || '-'} />
              <SummaryCard title="Project" value={editingReceipt.project_name || '-'} />
            </div>

            <form action={updateReceiptAction} className="mt-6 space-y-6">
              <input type="hidden" name="receipt_id" value={editingReceipt.id} />
              <input type="hidden" name="return_to" value={basePath} />
              <input type="hidden" name="error_to" value={buildErrorHref('update_failed')} />

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Receipt Date" htmlFor="receipt_date">
                  <input
                    id="receipt_date"
                    name="receipt_date"
                    type="date"
                    defaultValue={editingReceipt.receipt_date}
                    className={inputClassName}
                  />
                </Field>
                <Field label="Amount Received (AED)" htmlFor="amount">
                  <input
                    id="amount"
                    name="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    defaultValue={String(editingReceipt.amount)}
                    className={inputClassName}
                  />
                </Field>
                <Field label="Payment Method" htmlFor="payment_method">
                  <select
                    id="payment_method"
                    name="payment_method"
                    defaultValue={editingReceipt.payment_method}
                    className={inputClassName}
                  >
                    {RECEIPT_PAYMENT_METHODS.map((method) => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <ManualVatFields
                idPrefix="receipt-edit"
                initialVatApplicable={editingReceipt.vat_applicable}
                initialVatAmount={editingReceipt.vat_amount}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Reference #" htmlFor="reference_number">
                  <input
                    id="reference_number"
                    name="reference_number"
                    type="text"
                    defaultValue={editingReceipt.reference_number || ''}
                    className={inputClassName}
                  />
                </Field>
                <Field label="Bank Name" htmlFor="bank_name">
                  <input
                    id="bank_name"
                    name="bank_name"
                    type="text"
                    defaultValue={editingReceipt.bank_name || ''}
                    className={inputClassName}
                  />
                </Field>
              </div>

              <Field label="Notes" htmlFor="notes">
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  defaultValue={editingReceipt.notes || ''}
                  className={textareaClassName}
                />
              </Field>

              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Save Receipt Changes
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

function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="text-sm text-slate-500">{title}</div>
      <div className="mt-1 text-lg font-semibold text-slate-900">{value}</div>
    </div>
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
