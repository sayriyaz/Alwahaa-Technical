import type { ReactNode } from 'react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { AppLogo } from '@/components/app-logo'
import { InvoiceItemsField } from '@/components/invoice-items-field'
import { requireAuthenticatedAppUser } from '@/lib/auth'
import { getRolePermissions } from '@/lib/auth-constants'
import {
  EDITABLE_INVOICE_STATUSES,
  getInvoiceById,
  getInvoiceStatusClasses,
  updateInvoice,
  updateInvoiceItems,
} from '@/lib/invoices'
import { formatCurrency, formatDate, toDateInputValue } from '@/lib/projects'

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { appUser, db } = await requireAuthenticatedAppUser()
  const permissions = getRolePermissions(appUser.role)
  const { id } = await params
  const invoice = await getInvoiceById(id, db)

  if (!invoice) {
    notFound()
  }

  const canEditStatus = EDITABLE_INVOICE_STATUSES.includes(invoice.status as (typeof EDITABLE_INVOICE_STATUSES)[number])

  async function updateInvoiceDetails(formData: FormData) {
    'use server'

    const { appUser, db } = await requireAuthenticatedAppUser(['admin', 'manager', 'accountant'])
    const permissions = getRolePermissions(appUser.role)

    if (!permissions.canEditInvoices) {
      redirect('/access-denied')
    }

    const invoiceId = formData.get('invoice_id') as string
    const dueDate = formData.get('due_date') as string
    const description = formData.get('description') as string
    const notes = formData.get('notes') as string
    const statusValue = formData.get('status') as string
    const selectedStatus = EDITABLE_INVOICE_STATUSES.find((status) => status === statusValue)

    if (!invoiceId) return

    // Parse line items
    const itemDescriptions = formData.getAll('item_description[]') as string[]
    const itemQuantities = formData.getAll('item_quantity[]') as string[]
    const itemUnits = formData.getAll('item_unit[]') as string[]
    const itemPrices = formData.getAll('item_price[]') as string[]
    const itemVatApplicables = formData.getAll('item_vat_applicable[]') as string[]
    const itemVatRates = formData.getAll('item_vat_rate[]') as string[]

    const items = itemDescriptions.map((desc, i) => {
      const qty = parseFloat(itemQuantities[i]) || 0
      const price = parseFloat(itemPrices[i]) || 0
      const vatApplicable = itemVatApplicables[i] === 'true'
      const vatRate = vatApplicable ? (parseFloat(itemVatRates[i]) || 0) : 0
      const totalPrice = qty * price
      const vatAmount = Math.round(totalPrice * vatRate) / 100
      return {
        description: desc,
        quantity: qty,
        unit: itemUnits[i] || null,
        unit_price: price,
        total_price: totalPrice,
        vat_applicable: vatApplicable,
        vat_rate: vatRate,
        vat_amount: vatAmount,
      }
    }).filter((item) => item.description && item.unit_price > 0)

    const subtotal = items.reduce((s, it) => s + it.total_price, 0)
    const vatAmount = items.reduce((s, it) => s + it.vat_amount, 0)

    await updateInvoiceItems(invoiceId, items, db)

    const updates: Parameters<typeof updateInvoice>[1] = {
      due_date: dueDate || null,
      subtotal,
      vat_applicable: vatAmount > 0,
      vat_amount: vatAmount,
      total_amount: subtotal + vatAmount,
      description: description || null,
      notes: notes || null,
    }

    if (selectedStatus) updates.status = selectedStatus

    await updateInvoice(invoiceId, updates, db)

    redirect(`/invoices/${invoiceId}`)
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
        <div className="mb-6">
          <Link href="/invoices" className="text-sm text-slate-600 hover:text-slate-900">← Back to Invoices</Link>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-sm font-medium text-slate-500">{invoice.invoice_number}</div>
              <h2 className="mt-1 text-2xl font-bold text-slate-900">{invoice.client_name}</h2>
              <p className="mt-1 text-sm text-slate-600">{invoice.project_name}</p>
              {invoice.project_code ? <p className="text-sm text-slate-500">{invoice.project_code}</p> : null}
              {invoice.description && <p className="mt-2 text-sm text-slate-500">{invoice.description}</p>}
            </div>
            <div className="flex flex-col items-start gap-3 sm:items-end">
              <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${getInvoiceStatusClasses(invoice.status)}`}>
                {invoice.status}
              </span>
              <Link
                href={`/invoices/${invoice.id}/print`}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Print / PDF
              </Link>
              {permissions.canManageReceipts && invoice.amount_paid > 0 && (
                <Link
                  href={`/receipts?invoice_id=${invoice.id}`}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  View Receipts
                </Link>
              )}
              {permissions.canManageReceipts && invoice.balance_due > 0 && invoice.status !== 'Cancelled' && (
                <Link
                  href={`/receipts/new?invoice_id=${invoice.id}&amount=${invoice.balance_due.toFixed(2)}`}
                  className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Record Payment
                </Link>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard title="Project No" value={invoice.project_code || '-'} />
            <SummaryCard title="Invoice Date" value={formatDate(invoice.invoice_date)} />
            <SummaryCard title="Due Date" value={formatDate(invoice.due_date)} />
            <SummaryCard title="Subtotal" value={formatCurrency(invoice.subtotal)} />
            <SummaryCard title="VAT Amount" value={invoice.vat_applicable ? formatCurrency(invoice.vat_amount) : 'Not Applicable'} />
            <SummaryCard title="Total Amount" value={formatCurrency(invoice.total_amount)} />
            <SummaryCard title="Amount Paid" value={formatCurrency(invoice.amount_paid)} />
            <SummaryCard title="Balance Due" value={formatCurrency(invoice.balance_due)} />
          </div>

          {(invoice.phase_name || invoice.notes) && (
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <InfoBlock title="Related Phase" value={invoice.phase_name || '-'} />
              <InfoBlock title="Notes" value={invoice.notes || '-'} />
            </div>
          )}
        </div>

        {permissions.canEditInvoices && (
          <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Edit Invoice</h3>
            <p className="mt-1 text-sm text-slate-600">
              Update billing details here. Payment status and balance still update automatically when receipts are recorded.
            </p>
            {!canEditStatus && (
              <p className="mt-2 text-sm text-slate-500">
                This invoice status is now driven by payment activity, so only non-financial fields can be updated here.
              </p>
            )}

            <form action={updateInvoiceDetails} className="mt-6 space-y-6">
              <input type="hidden" name="invoice_id" value={invoice.id} />

              <div className="grid gap-4 md:grid-cols-2">
                {canEditStatus ? (
                  <Field label="Status" htmlFor="status">
                    <select
                      id="status"
                      name="status"
                      defaultValue={invoice.status}
                      className={inputClassName}
                    >
                      {EDITABLE_INVOICE_STATUSES.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </Field>
                ) : (
                  <Field label="Status" htmlFor="status_display">
                    <input
                      id="status_display"
                      value={invoice.status}
                      readOnly
                      className={`${inputClassName} bg-slate-50 text-slate-500`}
                    />
                  </Field>
                )}
                <Field label="Due Date" htmlFor="due_date">
                  <input
                    id="due_date"
                    name="due_date"
                    type="date"
                    defaultValue={toDateInputValue(invoice.due_date)}
                    className={inputClassName}
                  />
                </Field>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Line Items</label>
                <InvoiceItemsField initialItems={invoice.items.map((item) => ({
                  description: item.description,
                  quantity: item.quantity,
                  unit: item.unit,
                  unit_price: item.unit_price,
                  vat_applicable: item.vat_applicable ?? false,
                  vat_rate: item.vat_rate ?? 0,
                }))} />
              </div>

              <Field label="Description" htmlFor="description">
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  defaultValue={invoice.description || ''}
                  className={textareaClassName}
                />
              </Field>

              <Field label="Notes" htmlFor="notes">
                <textarea
                  id="notes"
                  name="notes"
                  rows={4}
                  defaultValue={invoice.notes || ''}
                  className={textareaClassName}
                />
              </Field>

              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Save Invoice Changes
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

function InfoBlock({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="text-sm font-medium text-slate-500">{title}</div>
      <div className="mt-2 text-sm text-slate-700">{value}</div>
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
