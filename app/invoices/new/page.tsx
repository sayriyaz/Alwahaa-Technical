import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AppLogo } from '@/components/app-logo'
import { InvoiceItemsField } from '@/components/invoice-items-field'
import { requireAuthenticatedAppUser } from '@/lib/auth'
import { getRolePermissions } from '@/lib/auth-constants'
import { createInvoice, EDITABLE_INVOICE_STATUSES } from '@/lib/invoices'
import { getProjects } from '@/lib/projects'
import { getContractors } from '@/lib/contractors'

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ client_id?: string; project_id?: string; error?: string }>
}) {
  const { appUser, db } = await requireAuthenticatedAppUser(['admin', 'manager', 'accountant'])
  const permissions = getRolePermissions(appUser.role)
  const resolvedSearchParams = await searchParams
  const preselectedClientId = resolvedSearchParams.client_id || ''
  const preselectedProjectId = resolvedSearchParams.project_id || ''
  const errorCode = resolvedSearchParams.error || ''

  if (!permissions.canCreateInvoices) redirect('/access-denied')

  const [projects, clients] = await Promise.all([
    getProjects(db),
    getContractors(db),
  ])

  async function handleSubmit(formData: FormData) {
    'use server'

    const { appUser, db } = await requireAuthenticatedAppUser(['admin', 'manager', 'accountant'])
    const permissions = getRolePermissions(appUser.role)
    if (!permissions.canCreateInvoices) redirect('/access-denied')

    const projectId = formData.get('project_id') as string
    const clientId = formData.get('client_id') as string
    const invoiceDate = formData.get('invoice_date') as string
    const dueDate = formData.get('due_date') as string
    const statusValue = formData.get('status') as string
    const description = formData.get('description') as string
    const notes = formData.get('notes') as string
    const selectedStatus = EDITABLE_INVOICE_STATUSES.find((s) => s === statusValue) || 'Sent'

    // Parse items with per-item VAT
    const itemDescriptions  = formData.getAll('item_description[]')  as string[]
    const itemQuantities    = formData.getAll('item_quantity[]')      as string[]
    const itemUnits         = formData.getAll('item_unit[]')          as string[]
    const itemPrices        = formData.getAll('item_price[]')         as string[]
    const itemVatApplicable = formData.getAll('item_vat_applicable[]') as string[]
    const itemVatRates      = formData.getAll('item_vat_rate[]')      as string[]

    const items = itemDescriptions
      .map((desc, i) => {
        const qty       = parseFloat(itemQuantities[i]) || 1
        const price     = parseFloat(itemPrices[i]) || 0
        const vatAppl   = itemVatApplicable[i] === 'true'
        const vatRate   = parseFloat(itemVatRates[i]) || 5
        const subtotal  = qty * price
        const vatAmt    = vatAppl ? Math.round(subtotal * vatRate) / 100 : 0
        return {
          description:    desc,
          quantity:       qty,
          unit:           itemUnits[i] || 'lumpsum',
          unit_price:     price,
          total_price:    subtotal,
          vat_applicable: vatAppl,
          vat_rate:       vatAppl ? vatRate : 0,
          vat_amount:     vatAmt,
        }
      })
      .filter((item) => item.description && item.unit_price > 0)

    const invoiceNumber = (formData.get('invoice_number') as string || '').trim()
    if (!projectId || !clientId || !invoiceNumber || items.length === 0) return

    // Aggregate invoice-level VAT from items
    const subtotal  = items.reduce((s, it) => s + it.total_price, 0)
    const vatAmount = items.reduce((s, it) => s + it.vat_amount, 0)
    const vatApplicable = vatAmount > 0

    const invoice = await createInvoice(
      {
        invoice_number: invoiceNumber,
        project_id:     projectId,
        client_id:      clientId,
        invoice_date:   invoiceDate || new Date().toISOString().split('T')[0],
        due_date:       dueDate || null,
        description:    description || null,
        vat_applicable: vatApplicable,
        vat_amount:     vatAmount,
        phase_id:       null,
        status:         selectedStatus,
        notes:          notes || null,
      },
      items,
      db
    )

    if (invoice && 'error' in invoice && invoice.error === 'duplicate_number') {
      redirect(`/invoices/new?error=duplicate_number&project_id=${projectId}&client_id=${clientId}`)
    }
    if (invoice) redirect('/invoices')
    redirect(`/invoices/new?error=create_failed&project_id=${projectId}&client_id=${clientId}`)
  }

  return (
    <div className="min-h-full">
      <header className="bg-slate-900 text-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <AppLogo />
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-300">{appUser?.full_name || appUser?.email}</span>
              <form action="/api/auth/logout" method="POST">
                <button type="submit" className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700">Logout</button>
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

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <style>{`.fi{display:block;width:100%;padding:6px 10px;font-size:13px;color:#1D1D1F;background:#fff;border:1px solid #D2D2D7;border-radius:8px;outline:none;box-sizing:border-box;} .fi:focus{border-color:#007AFF;box-shadow:0 0 0 3px rgba(0,122,255,0.15);}`}</style>

        <div className="mb-6">
          <Link href="/invoices" className="text-sm text-slate-600 hover:text-slate-900">← Back to Invoices</Link>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">New Invoice</h2>
          <p className="mt-1 text-sm text-slate-600">VAT is set per line item below.</p>

          {errorCode === 'duplicate_number' && (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              ⚠️ That invoice number already exists. Please use a different number.
            </div>
          )}
          {errorCode === 'create_failed' && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Invoice could not be created. Please review and try again.
            </div>
          )}

          <form action={handleSubmit} className="mt-6 space-y-6">

            {/* Invoice Number */}
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">Invoice Number *</label>
              <input type="text" name="invoice_number" required placeholder="e.g., INV-2026-001" className="block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm" />
            </div>

            {/* Project & Client */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">Project *</label>
                <select name="project_id" required defaultValue={preselectedProjectId} className="block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm">
                  <option value="">Select a project</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.project_code} · {p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">Client *</label>
                <select name="client_id" required defaultValue={preselectedClientId} className="block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm">
                  <option value="">Select a client</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.party_type}</option>)}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  <Link href="/vendors/new?type=Direct+Client&return_to=/invoices/new" className="text-slate-900 underline">+ Add new client</Link>
                </p>
              </div>
            </div>

            {/* Dates & Status */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">Invoice Date</label>
                <input type="date" name="invoice_date" defaultValue={new Date().toISOString().split('T')[0]} className="block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">Due Date</label>
                <input type="date" name="due_date" className="block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">Status</label>
                <select name="status" defaultValue="Sent" className="block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 sm:text-sm">
                  {EDITABLE_INVOICE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">Description</label>
              <input type="text" name="description" placeholder="e.g., Milestone 1 Payment" className="block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 sm:text-sm" />
            </div>

            {/* Line Items with VAT */}
            <div className="border-t border-slate-200 pt-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Invoice Items <span className="text-xs font-normal text-slate-500 ml-1">— VAT is set per item</span></h3>
              <InvoiceItemsField />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">Notes</label>
              <textarea name="notes" rows={2} placeholder="Payment terms, bank details, etc." className="block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 sm:text-sm" />
            </div>

            <div className="flex gap-3 pt-4">
              <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">Create Invoice</button>
              <Link href="/invoices" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}

function NavItem({ href, label, active }: { href: string; label: string; active?: boolean }) {
  return (
    <Link href={href} className={`rounded-lg px-4 py-2 text-sm font-medium transition ${active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
      {label}
    </Link>
  )
}
