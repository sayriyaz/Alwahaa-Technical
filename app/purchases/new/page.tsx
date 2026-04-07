import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AppLogo } from '@/components/app-logo'
import { ManualVatFields } from '@/components/manual-vat-fields'
import { requireAuthenticatedAppUser } from '@/lib/auth'
import { getRolePermissions } from '@/lib/auth-constants'
import { createPurchaseOrder } from '@/lib/purchases'
import { getVendors } from '@/lib/vendors'
import { getProjects } from '@/lib/projects'
import { parseVatApplicableValue } from '@/lib/vat'

export default async function NewPurchaseOrderPage() {
  const { appUser, db } = await requireAuthenticatedAppUser(['admin', 'manager', 'accountant'])
  const permissions = getRolePermissions(appUser.role)

  if (!permissions.canCreatePurchaseOrders) {
    redirect('/access-denied')
  }

  const [vendors, projects] = await Promise.all([
    getVendors(db),
    getProjects(db),
  ])

  async function handleSubmit(formData: FormData) {
    'use server'

    const { appUser, db } = await requireAuthenticatedAppUser(['admin', 'manager', 'accountant'])
    const permissions = getRolePermissions(appUser.role)

    if (!permissions.canCreatePurchaseOrders) {
      redirect('/access-denied')
    }

    const vendorId = formData.get('vendor_id') as string
    const projectId = formData.get('project_id') as string
    const expectedDelivery = formData.get('expected_delivery') as string
    const vatApplicable = parseVatApplicableValue(formData.get('vat_applicable'))
    const vatAmount = parseFloat(formData.get('vat_amount') as string) || 0
    const notes = formData.get('notes') as string

    // Parse items (simplified for demo - in production use dynamic form)
    const itemNames = formData.getAll('item_name[]') as string[]
    const itemDescriptions = formData.getAll('item_description[]') as string[]
    const itemQuantities = formData.getAll('item_quantity[]') as string[]
    const itemUnits = formData.getAll('item_unit[]') as string[]
    const itemPrices = formData.getAll('item_price[]') as string[]

    const items = itemNames
      .map((name, i) => ({
        item_name: name,
        description: itemDescriptions[i] || null,
        quantity: parseFloat(itemQuantities[i]) || 1,
        unit: itemUnits[i] || 'pcs',
        unit_price: parseFloat(itemPrices[i]) || 0,
        total_price: (parseFloat(itemQuantities[i]) || 1) * (parseFloat(itemPrices[i]) || 0),
        received_quantity: 0,
      }))
      .filter((item) => item.item_name && item.unit_price > 0)

    if (!vendorId || items.length === 0) {
      return
    }

    const po = await createPurchaseOrder(
      {
        vendor_id: vendorId,
        project_id: projectId || null,
        expected_delivery: expectedDelivery || null,
        vat_applicable: vatApplicable,
        vat_amount: vatAmount,
        status: 'Draft',
        notes: notes || null,
      },
      items,
      db
    )

    if (po) {
      redirect('/purchases')
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
            <NavItem href="/purchases" label="Purchases" active />
            <NavItem href="/expenses" label="Expenses" />
            <NavItem href="/invoices" label="Invoices" />
            <NavItem href="/reports" label="Reports" />
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href="/purchases" className="text-sm text-slate-600 hover:text-slate-900">← Back to Purchase Orders</Link>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">New Purchase Order</h2>
          <p className="mt-1 text-sm text-slate-600">Create a purchase order for materials or services</p>

          <form action={handleSubmit} className="mt-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="vendor_id" className="block text-sm font-medium text-slate-900">Vendor *</label>
                <select
                  name="vendor_id"
                  id="vendor_id"
                  required
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
                  className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
                >
                  <option value="">General Inventory</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <ManualVatFields idPrefix="purchase-create" initialVatApplicable initialVatAmount={0} />

            <div>
              <label htmlFor="expected_delivery" className="block text-sm font-medium text-slate-900">Expected Delivery</label>
              <input
                type="date"
                name="expected_delivery"
                id="expected_delivery"
                className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
              />
            </div>

            {/* Items Section - Simplified for single item */}
            <div className="border-t border-slate-200 pt-6">
              <h3 className="text-sm font-medium text-slate-900">Items</h3>

              <div className="mt-4 grid grid-cols-12 gap-4">
                <div className="col-span-4">
                  <label className="block text-xs font-medium text-slate-500">Item Name *</label>
                  <input
                    type="text"
                    name="item_name[]"
                    placeholder="e.g., Pool Tiles"
                    required
                    className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs font-medium text-slate-500">Description</label>
                  <input
                    type="text"
                    name="item_description[]"
                    placeholder="Size, color, etc."
                    className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-500">Qty *</label>
                  <input
                    type="number"
                    name="item_quantity[]"
                    defaultValue="1"
                    min="0.01"
                    step="0.01"
                    required
                    className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-slate-500">Unit</label>
                  <input
                    type="text"
                    name="item_unit[]"
                    defaultValue="sqm"
                    className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-500">Price (AED) *</label>
                  <input
                    type="number"
                    name="item_price[]"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    required
                    className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-slate-900">Notes</label>
              <textarea
                name="notes"
                id="notes"
                rows={2}
                placeholder="Delivery instructions, special requirements..."
                className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Create Purchase Order
              </button>
              <Link
                href="/purchases"
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
