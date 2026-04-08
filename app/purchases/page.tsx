import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppLogo } from '@/components/app-logo'
import { requireAuthenticatedAppUser } from '@/lib/auth'
import { deletePurchaseOrder, getPurchaseOrders, getPOStatusClasses } from '@/lib/purchases'
import { formatCurrency, formatDate } from '@/lib/projects'
import { getRolePermissions } from '@/lib/auth-constants'

export default async function PurchasesPage() {
  const { appUser, db } = await requireAuthenticatedAppUser()
  const permissions = getRolePermissions(appUser.role)
  const pos = await getPurchaseOrders(db)

  async function deletePurchaseOrderAction(formData: FormData) {
    'use server'

    const { appUser, db } = await requireAuthenticatedAppUser(['admin', 'manager'])
    const permissions = getRolePermissions(appUser.role)

    if (!permissions.canDeletePurchaseOrders) {
      redirect('/access-denied')
    }

    const purchaseOrderId = formData.get('purchase_order_id') as string

    if (!purchaseOrderId) {
      return
    }

    await deletePurchaseOrder(purchaseOrderId, db)
    redirect('/purchases')
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
            <NavItem href="/vendor-payments" label="Vendor Payments" />
            <NavItem href="/reports" label="Reports" />
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Purchase Orders</h2>
          {permissions.canCreatePurchaseOrders && (
            <Link
              href="/purchases/new"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              + New Purchase Order
            </Link>
          )}
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">PO #</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Vendor</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Expected Delivery</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {pos.map((po) => (
                <tr key={po.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <Link href={`/purchases/${po.id}`} className="font-medium text-slate-900 hover:text-slate-700">
                      {po.po_number}
                    </Link>
                    <div className="text-xs text-slate-500">{formatDate(po.order_date)}</div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{po.vendor_name}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{po.project_name}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-900">
                    {formatCurrency(po.total_amount)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getPOStatusClasses(po.status)}`}>
                      {po.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                    {formatDate(po.expected_delivery)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <div className="flex items-center gap-3">
                      <Link href={`/purchases/${po.id}`} className="font-medium text-slate-700 hover:text-slate-900">
                        Edit
                      </Link>
                      <Link href={`/purchases/${po.id}/print`} className="font-medium text-sky-700 hover:text-sky-800">
                        Print
                      </Link>
                      {permissions.canDeletePurchaseOrders && (
                        <form action={deletePurchaseOrderAction}>
                          <input type="hidden" name="purchase_order_id" value={po.id} />
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
              {pos.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    No purchase orders found. Create POs to track vendor orders.
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
