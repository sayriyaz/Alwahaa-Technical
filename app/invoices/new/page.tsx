import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AppLogo } from '@/components/app-logo'
import { ManualVatFields } from '@/components/manual-vat-fields'
import { requireAuthenticatedAppUser } from '@/lib/auth'
import { getRolePermissions } from '@/lib/auth-constants'
import { createInvoice, EDITABLE_INVOICE_STATUSES } from '@/lib/invoices'
import { getProjects } from '@/lib/projects'
import { getClients } from '@/lib/clients'
import { parseVatApplicableValue } from '@/lib/vat'

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ client_id?: string | string[]; project_id?: string | string[]; error?: string | string[] }>
}) {
  const { appUser, db } = await requireAuthenticatedAppUser(['admin', 'manager', 'accountant'])
  const permissions = getRolePermissions(appUser.role)
  const resolvedSearchParams = await searchParams
  const preselectedClientId = Array.isArray(resolvedSearchParams.client_id)
    ? resolvedSearchParams.client_id[0] || ''
    : resolvedSearchParams.client_id || ''
  const preselectedProjectId = Array.isArray(resolvedSearchParams.project_id)
    ? resolvedSearchParams.project_id[0] || ''
    : resolvedSearchParams.project_id || ''
  const errorCode = Array.isArray(resolvedSearchParams.error)
    ? resolvedSearchParams.error[0] || ''
    : resolvedSearchParams.error || ''

  if (!permissions.canCreateInvoices) {
    redirect('/access-denied')
  }

  const [projects, clients] = await Promise.all([
    getProjects(db),
    getClients(db),
  ])

  async function handleSubmit(formData: FormData) {
    'use server'

    const { appUser, db } = await requireAuthenticatedAppUser(['admin', 'manager', 'accountant'])
    const permissions = getRolePermissions(appUser.role)

    if (!permissions.canCreateInvoices) {
      redirect('/access-denied')
    }

    const projectId = formData.get('project_id') as string
    const clientId = formData.get('client_id') as string
    const invoiceDate = formData.get('invoice_date') as string
    const dueDate = formData.get('due_date') as string
    const statusValue = formData.get('status') as string
    const description = formData.get('description') as string
    const vatApplicable = parseVatApplicableValue(formData.get('vat_applicable'))
    const vatAmount = parseFloat(formData.get('vat_amount') as string) || 0
    const notes = formData.get('notes') as string
    const selectedStatus = EDITABLE_INVOICE_STATUSES.find((status) => status === statusValue) || 'Sent'

    const { data: projectData, error: projectError } = await db
      .from('projects')
      .select('client_id')
      .eq('id', projectId)
      .single()

    const project = projectData as { client_id: string } | null

    if (projectError || !project) {
      redirect('/invoices/new?error=project_not_found')
    }

    if (project.client_id !== clientId) {
      redirect(`/invoices/new?error=client_mismatch&project_id=${projectId}&client_id=${project.client_id}`)
    }

    // Parse items
    const itemDescriptions = formData.getAll('item_description[]') as string[]
    const itemQuantities = formData.getAll('item_quantity[]') as string[]
    const itemUnits = formData.getAll('item_unit[]') as string[]
    const itemPrices = formData.getAll('item_price[]') as string[]

    const items = itemDescriptions
      .map((desc, i) => ({
        description: desc,
        quantity: parseFloat(itemQuantities[i]) || 1,
        unit: itemUnits[i] || null,
        unit_price: parseFloat(itemPrices[i]) || 0,
        total_price: (parseFloat(itemQuantities[i]) || 1) * (parseFloat(itemPrices[i]) || 0),
      }))
      .filter((item) => item.description && item.unit_price > 0)

    if (!projectId || !clientId || items.length === 0) {
      return
    }

    const invoice = await createInvoice(
      {
        project_id: projectId,
        client_id: clientId,
        invoice_date: invoiceDate || new Date().toISOString().split('T')[0],
        due_date: dueDate || null,
        description: description || null,
        vat_applicable: vatApplicable,
        vat_amount: vatAmount,
        phase_id: null,
        status: selectedStatus,
        notes: notes || null,
      },
      items,
      db
    )

    if (invoice) {
      redirect('/invoices')
    }

    redirect(`/invoices/new?error=create_failed&project_id=${projectId}&client_id=${clientId}`)
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

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href="/invoices" className="text-sm text-slate-600 hover:text-slate-900">← Back to Invoices</Link>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">New Invoice</h2>
          <p className="mt-1 text-sm text-slate-600">Create an invoice for a client</p>
          {errorCode ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {errorCode === 'client_mismatch'
                ? 'The selected project belongs to a different client. The form has been reset to that project client.'
                : errorCode === 'project_not_found'
                  ? 'The selected project could not be found. Please choose it again.'
                  : 'The invoice could not be created. Please review the details and try again.'}
            </div>
          ) : null}

          <form action={handleSubmit} className="mt-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="project_id" className="block text-sm font-medium text-slate-900">Project *</label>
                <select
                  name="project_id"
                  id="project_id"
                  required
                  defaultValue={preselectedProjectId}
                  className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
                >
                  <option value="">Select a project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>{project.project_code} · {project.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="client_id" className="block text-sm font-medium text-slate-900">Client *</label>
                <select
                  name="client_id"
                  id="client_id"
                  required
                  defaultValue={preselectedClientId}
                  className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
                >
                  <option value="">Select a client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  <Link href="/vendors/new?type=Client&return_to=/invoices/new" className="text-slate-900 underline">
                    + Add new client
                  </Link>
                  {' · '}
                  <Link href="/vendors" className="text-slate-900 underline">Manage parties</Link>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              <div>
                <label htmlFor="invoice_date" className="block text-sm font-medium text-slate-900">Invoice Date</label>
                <input
                  type="date"
                  name="invoice_date"
                  id="invoice_date"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="due_date" className="block text-sm font-medium text-slate-900">Due Date</label>
                <input
                  type="date"
                  name="due_date"
                  id="due_date"
                  className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-slate-900">Status</label>
                <select
                  name="status"
                  id="status"
                  defaultValue="Sent"
                  className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
                >
                  {EDITABLE_INVOICE_STATUSES.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>

            <ManualVatFields idPrefix="invoice-create" initialVatApplicable initialVatAmount={0} />

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-slate-900">Description</label>
              <input
                type="text"
                name="description"
                id="description"
                placeholder="e.g., Milestone 1 Payment"
                className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
              />
            </div>

            {/* Items Section */}
            <div className="border-t border-slate-200 pt-6">
              <h3 className="text-sm font-medium text-slate-900">Invoice Items</h3>

              <div className="mt-4 grid grid-cols-12 gap-4">
                <div className="col-span-5">
                  <label className="block text-xs font-medium text-slate-500">Description *</label>
                  <input
                    type="text"
                    name="item_description[]"
                    placeholder="e.g., Pool Excavation"
                    required
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
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-500">Unit</label>
                  <input
                    type="text"
                    name="item_unit[]"
                    defaultValue="lumpsum"
                    className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
                  />
                </div>
                <div className="col-span-3">
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
                placeholder="Payment terms, bank details, etc."
                className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Create Invoice
              </button>
              <Link
                href="/invoices"
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
