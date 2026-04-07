import type { ReactNode } from 'react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { AppLogo } from '@/components/app-logo'
import { ManualVatFields } from '@/components/manual-vat-fields'
import { requireAuthenticatedAppUser } from '@/lib/auth'
import { getRolePermissions } from '@/lib/auth-constants'
import {
  getPurchaseOrderById,
  getPOStatusClasses,
  PURCHASE_ORDER_STATUSES,
  updatePurchaseOrder,
} from '@/lib/purchases'
import { formatCurrency, formatDate, toDateInputValue } from '@/lib/projects'
import { parseVatApplicableValue } from '@/lib/vat'

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { appUser, db } = await requireAuthenticatedAppUser()
  const permissions = getRolePermissions(appUser.role)
  const { id } = await params
  const purchaseOrder = await getPurchaseOrderById(id, db)

  if (!purchaseOrder) {
    notFound()
  }

  async function updatePurchaseOrderDetails(formData: FormData) {
    'use server'

    const { appUser, db } = await requireAuthenticatedAppUser(['admin', 'manager', 'accountant'])
    const permissions = getRolePermissions(appUser.role)

    if (!permissions.canEditPurchaseOrders) {
      redirect('/access-denied')
    }

    const purchaseOrderId = formData.get('purchase_order_id') as string
    const expectedDelivery = formData.get('expected_delivery') as string
    const vatApplicable = parseVatApplicableValue(formData.get('vat_applicable'))
    const vatAmount = parseFloat(formData.get('vat_amount') as string) || 0
    const notes = formData.get('notes') as string
    const statusValue = formData.get('status') as string
    const selectedStatus = PURCHASE_ORDER_STATUSES.find((status) => status === statusValue)

    if (!purchaseOrderId || !selectedStatus) {
      return
    }

    await updatePurchaseOrder(purchaseOrderId, {
      expected_delivery: expectedDelivery || null,
      vat_applicable: vatApplicable,
      vat_amount: vatAmount,
      notes: notes || null,
      status: selectedStatus,
    }, db)

    redirect(`/purchases/${purchaseOrderId}`)
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
            <NavItem href="/purchases" label="Purchases" active />
            <NavItem href="/expenses" label="Expenses" />
            <NavItem href="/invoices" label="Invoices" />
            <NavItem href="/reports" label="Reports" />
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href="/purchases" className="text-sm text-slate-600 hover:text-slate-900">← Back to Purchase Orders</Link>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-sm font-medium text-slate-500">{purchaseOrder.po_number}</div>
              <h2 className="mt-1 text-2xl font-bold text-slate-900">{purchaseOrder.vendor_name}</h2>
              <p className="mt-1 text-sm text-slate-600">{purchaseOrder.project_name}</p>
              {purchaseOrder.notes && <p className="mt-2 text-sm text-slate-500">{purchaseOrder.notes}</p>}
            </div>
            <div className="flex flex-col items-start gap-3 sm:items-end">
              <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${getPOStatusClasses(purchaseOrder.status)}`}>
                {purchaseOrder.status}
              </span>
              <Link
                href={`/purchases/${purchaseOrder.id}/print`}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Print / PDF
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard title="Order Date" value={formatDate(purchaseOrder.order_date)} />
            <SummaryCard title="Expected Delivery" value={formatDate(purchaseOrder.expected_delivery)} />
            <SummaryCard title="Subtotal" value={formatCurrency(purchaseOrder.subtotal)} />
            <SummaryCard title="VAT Amount" value={purchaseOrder.vat_applicable ? formatCurrency(purchaseOrder.vat_amount) : 'Not Applicable'} />
            <SummaryCard title="Total Amount" value={formatCurrency(purchaseOrder.total_amount)} />
            <SummaryCard title="Received At" value={formatDate(purchaseOrder.received_at)} />
          </div>
        </div>

        {permissions.canEditPurchaseOrders && (
          <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Edit Purchase Order</h3>
            <p className="mt-1 text-sm text-slate-600">
              Update the delivery plan or status here. Marking a PO as fully received will stamp the received date automatically.
            </p>

            <form action={updatePurchaseOrderDetails} className="mt-6 space-y-6">
              <input type="hidden" name="purchase_order_id" value={purchaseOrder.id} />

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Status" htmlFor="status">
                  <select
                    id="status"
                    name="status"
                    defaultValue={purchaseOrder.status}
                    className={inputClassName}
                  >
                    {PURCHASE_ORDER_STATUSES.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Expected Delivery" htmlFor="expected_delivery">
                  <input
                    id="expected_delivery"
                    name="expected_delivery"
                    type="date"
                    defaultValue={toDateInputValue(purchaseOrder.expected_delivery)}
                    className={inputClassName}
                  />
                </Field>
              </div>

              <ManualVatFields
                idPrefix="purchase-edit"
                initialVatApplicable={purchaseOrder.vat_applicable}
                initialVatAmount={purchaseOrder.vat_amount}
              />

              <Field label="Notes" htmlFor="notes">
                <textarea
                  id="notes"
                  name="notes"
                  rows={4}
                  defaultValue={purchaseOrder.notes || ''}
                  className={textareaClassName}
                />
              </Field>

              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Save Purchase Order Changes
              </button>
            </form>
          </section>
        )}

        <div className="mt-8">
          <h3 className="text-lg font-semibold text-slate-900">Items</h3>
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {purchaseOrder.items.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No items were found for this purchase order.</div>
            ) : (
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Item</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Qty</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Received</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Unit</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Unit Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {purchaseOrder.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{item.item_name}</div>
                        {item.description && <div className="text-xs text-slate-500">{item.description}</div>}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{item.quantity}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{item.received_quantity}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{item.unit}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{formatCurrency(item.unit_price)}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-900">{formatCurrency(item.total_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
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
