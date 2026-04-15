import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AppLogo } from '@/components/app-logo'
import { PoItemsField } from '@/components/po-items-field'
import { requireAuthenticatedAppUser } from '@/lib/auth'
import { getRolePermissions } from '@/lib/auth-constants'
import { createPurchaseOrder } from '@/lib/purchases'
import { getSupplierParties } from '@/lib/contractors'
import { getProjects } from '@/lib/projects'

export default async function NewPurchaseOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { appUser, db } = await requireAuthenticatedAppUser(['admin', 'manager', 'accountant'])
  const permissions = getRolePermissions(appUser.role)
  const resolvedSearchParams = await searchParams
  const errorCode = resolvedSearchParams.error || ''

  if (!permissions.canCreatePurchaseOrders) {
    redirect('/access-denied')
  }

  const [vendors, projects] = await Promise.all([
    getSupplierParties(db),
    getProjects(db),
  ])

  async function handleSubmit(formData: FormData) {
    'use server'

    const { appUser, db } = await requireAuthenticatedAppUser(['admin', 'manager', 'accountant'])
    const permissions = getRolePermissions(appUser.role)

    if (!permissions.canCreatePurchaseOrders) {
      redirect('/access-denied')
    }

    const vendorId        = formData.get('vendor_id') as string
    const projectId       = formData.get('project_id') as string
    const expectedDelivery= formData.get('expected_delivery') as string
    const notes           = formData.get('notes') as string
    const poNumber        = (formData.get('po_number') as string || '').trim()

    const itemNames         = formData.getAll('item_name[]')         as string[]
    const itemDescriptions  = formData.getAll('item_description[]')  as string[]
    const itemQuantities    = formData.getAll('item_quantity[]')      as string[]
    const itemUnits         = formData.getAll('item_unit[]')         as string[]
    const itemPrices        = formData.getAll('item_price[]')        as string[]
    const itemVatApplicable = formData.getAll('item_vat_applicable[]') as string[]
    const itemVatRates      = formData.getAll('item_vat_rate[]')     as string[]

    const items = itemNames
      .map((name, i) => {
        const qty      = parseFloat(itemQuantities[i]) || 1
        const price    = parseFloat(itemPrices[i]) || 0
        const vatAppl  = itemVatApplicable[i] === 'true'
        const vatRate  = parseFloat(itemVatRates[i]) || 5
        const subtotal = qty * price
        const vatAmt   = vatAppl ? Math.round(subtotal * vatRate) / 100 : 0
        return {
          item_name:       name,
          description:     itemDescriptions[i] || null,
          quantity:        qty,
          unit:            itemUnits[i] || 'pcs',
          unit_price:      price,
          total_price:     subtotal,
          vat_applicable:  vatAppl,
          vat_rate:        vatAppl ? vatRate : 0,
          vat_amount:      vatAmt,
          received_quantity: 0,
        }
      })
      .filter((item) => item.item_name && item.unit_price > 0)

    if (!vendorId || !poNumber || items.length === 0) return

    const vatAmount    = items.reduce((s, it) => s + it.vat_amount, 0)
    const vatApplicable = vatAmount > 0

    const po = await createPurchaseOrder(
      {
        po_number:         poNumber,
        vendor_id:         vendorId,
        project_id:        projectId || null,
        expected_delivery: expectedDelivery || null,
        vat_applicable:    vatApplicable,
        vat_amount:        vatAmount,
        status:            'Draft',
        notes:             notes || null,
      },
      items,
      db
    )

    if (po && 'error' in po && po.error === 'duplicate_number') {
      redirect('/purchases/new?error=duplicate_number')
    }
    if (po) redirect('/purchases')
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

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href="/purchases" className="text-sm text-slate-600 hover:text-slate-900">← Back to Purchase Orders</Link>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">New Purchase Order</h2>
          <p className="mt-1 text-sm text-slate-600">VAT is set per line item below.</p>
          <style>{`.fi{display:block;width:100%;padding:6px 10px;font-size:13px;color:#1D1D1F;background:#fff;border:1px solid #D2D2D7;border-radius:8px;outline:none;box-sizing:border-box;} .fi:focus{border-color:#007AFF;box-shadow:0 0 0 3px rgba(0,122,255,0.15);}`}</style>

          {errorCode === 'duplicate_number' && (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              ⚠️ That PO number already exists. Please use a different number.
            </div>
          )}

          <form action={handleSubmit} className="mt-6 space-y-6">
            {/* PO Number */}
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">PO Number *</label>
              <input type="text" name="po_number" required placeholder="e.g., PO-2026-001" className="block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 sm:text-sm" />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">Vendor / Subcontractor *</label>
                <select name="vendor_id" required className="block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 sm:text-sm">
                  <option value="">Select a vendor</option>
                  {vendors.map((v) => <option key={v.id} value={v.id}>{v.name} · {v.party_type}</option>)}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  <Link href="/vendors/new?type=Vendor&return_to=/purchases/new" className="text-slate-900 underline">+ Add vendor</Link>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">Project (optional)</label>
                <select name="project_id" className="block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 sm:text-sm">
                  <option value="">General / No project</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.project_code} · {p.name}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">Expected Delivery</label>
              <input type="date" name="expected_delivery" className="block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 sm:text-sm" />
            </div>

            {/* Line Items with per-item VAT */}
            <div className="border-t border-slate-200 pt-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Items <span className="text-xs font-normal text-slate-500 ml-1">— VAT is set per item</span></h3>
              <PoItemsField />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">Notes</label>
              <textarea name="notes" rows={2} placeholder="Delivery instructions, special requirements…" className="block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 sm:text-sm" />
            </div>

            <div className="flex gap-3 pt-4">
              <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">Create Purchase Order</button>
              <Link href="/purchases" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</Link>
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
