import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppLogo } from '@/components/app-logo'
import { requireAuthenticatedAppUser } from '@/lib/auth'
import {
  EDITABLE_INVOICE_STATUSES,
  deleteInvoice,
  getInvoices,
  getInvoiceStatusClasses,
  updateInvoice,
} from '@/lib/invoices'
import { formatCurrency, formatDate } from '@/lib/projects'
import { getRolePermissions } from '@/lib/auth-constants'

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>
}) {
  const { appUser, db } = await requireAuthenticatedAppUser()
  const permissions = getRolePermissions(appUser.role)
  const resolvedSearchParams = await searchParams
  const errorCode = Array.isArray(resolvedSearchParams.error)
    ? resolvedSearchParams.error[0] || ''
    : resolvedSearchParams.error || ''
  const invoices = await getInvoices(db)

  async function updateInvoiceStatusAction(formData: FormData) {
    'use server'

    const { appUser, db } = await requireAuthenticatedAppUser(['admin', 'manager', 'accountant'])
    const permissions = getRolePermissions(appUser.role)

    if (!permissions.canEditInvoices) {
      redirect('/access-denied')
    }

    const invoiceId = formData.get('invoice_id') as string
    const statusValue = formData.get('status') as string
    const selectedStatus = EDITABLE_INVOICE_STATUSES.find((status) => status === statusValue)

    if (!invoiceId || !selectedStatus) {
      return
    }

    await updateInvoice(invoiceId, { status: selectedStatus }, db)
    redirect('/invoices')
  }

  async function deleteInvoiceAction(formData: FormData) {
    'use server'

    const { appUser, db } = await requireAuthenticatedAppUser(['admin'])
    const permissions = getRolePermissions(appUser.role)

    if (!permissions.canDeleteInvoices) {
      redirect('/access-denied')
    }

    const invoiceId = formData.get('invoice_id') as string

    if (!invoiceId) {
      return
    }

    const { count: receiptCount } = await db
      .from('receipts')
      .select('id', { count: 'exact', head: true })
      .eq('invoice_id', invoiceId)

    if ((receiptCount || 0) > 0) {
      redirect('/invoices?error=has_receipts')
    }

    const deleted = await deleteInvoice(invoiceId, db)

    if (!deleted) {
      redirect('/invoices?error=delete_failed')
    }

    redirect('/invoices')
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
            <NavItem href="/reports" label="Reports" />
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Invoices</h2>
          {permissions.canCreateInvoices && (
            <Link
              href="/invoices/new"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              + New Invoice
            </Link>
          )}
        </div>

        {errorCode === 'has_receipts' && (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            This invoice cannot be deleted because payment receipts are already linked to it.
          </div>
        )}

        {errorCode === 'delete_failed' && (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            Invoice deletion failed. It may still be linked to other records.
          </div>
        )}

        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Invoice #</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Due Date</th>
                {permissions.canEditInvoices && (
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <Link href={`/invoices/${invoice.id}`} className="font-medium text-slate-900 hover:text-slate-700">
                      {invoice.invoice_number}
                    </Link>
                    <div className="text-xs text-slate-500">{formatDate(invoice.invoice_date)}</div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{invoice.client_name}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{invoice.project_name}</td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm font-medium text-slate-900">{formatCurrency(invoice.total_amount)}</div>
                    {invoice.balance_due > 0 && (
                      <div className="text-xs text-rose-600">
                        Due: {formatCurrency(invoice.balance_due)}
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {permissions.canEditInvoices && EDITABLE_INVOICE_STATUSES.includes(invoice.status as (typeof EDITABLE_INVOICE_STATUSES)[number]) ? (
                      <form action={updateInvoiceStatusAction} className="flex items-center gap-2">
                        <input type="hidden" name="invoice_id" value={invoice.id} />
                        <select
                          name="status"
                          defaultValue={invoice.status}
                          className="rounded-lg border-slate-300 px-3 py-1.5 text-sm shadow-sm focus:border-slate-900 focus:ring-slate-900"
                        >
                          {EDITABLE_INVOICE_STATUSES.map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Update
                        </button>
                      </form>
                    ) : (
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getInvoiceStatusClasses(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                    {formatDate(invoice.due_date)}
                  </td>
                  {permissions.canEditInvoices && (
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <div className="flex items-center gap-3">
                        <Link href={`/invoices/${invoice.id}`} className="font-medium text-slate-700 hover:text-slate-900">
                          Edit
                        </Link>
                        <Link href={`/invoices/${invoice.id}/print`} className="font-medium text-sky-700 hover:text-sky-800">
                          Print
                        </Link>
                        {permissions.canManageReceipts && invoice.amount_paid > 0 ? (
                          <Link
                            href={`/receipts?invoice_id=${invoice.id}`}
                            className="font-medium text-sky-700 hover:text-sky-800"
                          >
                            Receipts
                          </Link>
                        ) : permissions.canDeleteInvoices && invoice.amount_paid === 0 ? (
                          <form action={deleteInvoiceAction}>
                            <input type="hidden" name="invoice_id" value={invoice.id} />
                            <button
                              type="submit"
                              className="font-medium text-rose-600 hover:text-rose-700"
                            >
                              Delete
                            </button>
                          </form>
                        ) : permissions.canDeleteInvoices ? (
                          <span className="text-xs text-slate-400">Has receipts</span>
                        ) : null}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={permissions.canEditInvoices ? 7 : 6} className="px-6 py-8 text-center text-slate-500">
                    No invoices found. Create your first invoice to bill clients.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
