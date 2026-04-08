import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AppLogo } from '@/components/app-logo'
import { ProjectCommercialFields } from '@/components/project-commercial-fields'
import { requireAuthenticatedAppUser } from '@/lib/auth'
import { getRolePermissions } from '@/lib/auth-constants'
import { getClients } from '@/lib/clients'
import { getContractors } from '@/lib/contractors'
import { createProject, PROJECT_STATUSES, PROJECT_WORK_TYPES } from '@/lib/projects'
import { parseVatApplicableValue } from '@/lib/vat'

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ client_id?: string | string[]; contractor_id?: string | string[] }>
}) {
  const { appUser, db } = await requireAuthenticatedAppUser(['admin', 'manager'])
  const permissions = getRolePermissions(appUser.role)
  const resolvedSearchParams = await searchParams
  const preselectedClientId = Array.isArray(resolvedSearchParams.client_id)
    ? resolvedSearchParams.client_id[0] || ''
    : resolvedSearchParams.client_id || ''
  const preselectedContractorId = Array.isArray(resolvedSearchParams.contractor_id)
    ? resolvedSearchParams.contractor_id[0] || ''
    : resolvedSearchParams.contractor_id || ''

  if (!permissions.canCreateProjects) {
    redirect('/access-denied')
  }

  const [clients, contractors] = await Promise.all([
    getClients(db),
    getContractors(db),
  ])

  async function handleSubmit(formData: FormData) {
    'use server'

    const { appUser, db } = await requireAuthenticatedAppUser(['admin', 'manager'])
    const permissions = getRolePermissions(appUser.role)

    if (!permissions.canCreateProjects) {
      redirect('/access-denied')
    }

    const name = formData.get('name') as string
    const clientId = formData.get('client_id') as string
    const workTypeValue = formData.get('work_type') as string
    const mainContractorId = formData.get('main_contractor_id') as string
    const location = formData.get('location') as string
    const contractValue = parseFloat(formData.get('contract_value') as string) || 0
    const vatApplicable = parseVatApplicableValue(formData.get('vat_applicable'))
    const vatAmount = parseFloat(formData.get('vat_amount') as string) || 0
    const startDate = formData.get('start_date') as string
    const expectedCompletion = formData.get('expected_completion') as string
    const statusValue = formData.get('status') as string
    const description = formData.get('description') as string
    const assignedTo = formData.get('assigned_to') as string
    const selectedStatus = PROJECT_STATUSES.find((status) => status === statusValue) || 'In Progress'
    const selectedWorkType = PROJECT_WORK_TYPES.find((workType) => workType === workTypeValue) || 'Direct'

    if (!name || !clientId || !location) {
      return // Handle error
    }

    const project = await createProject({
      name,
      client_id: clientId,
      work_type: selectedWorkType,
      main_contractor_id: mainContractorId || null,
      location,
      contract_value: contractValue,
      vat_applicable: vatApplicable,
      vat_amount: vatAmount,
      start_date: startDate || null,
      expected_completion: expectedCompletion || null,
      description,
      assigned_to: assignedTo,
      status: selectedStatus,
    }, db)

    if (project) {
      redirect(`/projects/${project.id}`)
    }
  }

  return (
    <div className="min-h-full">
      {/* Header */}
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

      {/* Navigation */}
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 py-2">
            <NavItem href="/" label="Dashboard" />
            <NavItem href="/projects" label="Projects" active />
            <NavItem href="/vendors" label="Parties" />
            <NavItem href="/purchases" label="Purchases" />
            <NavItem href="/expenses" label="Expenses" />
            <NavItem href="/invoices" label="Invoices" />
            <NavItem href="/vendor-payments" label="Vendor Payments" />
            <NavItem href="/reports" label="Reports" />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href="/projects" className="text-sm text-slate-600 hover:text-slate-900">← Back to Projects</Link>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">New Project</h2>
          <p className="mt-1 text-sm text-slate-600">Create a new pool construction project</p>

          <form action={handleSubmit} className="mt-6 space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-900">Project Name</label>
              <input
                type="text"
                name="name"
                id="name"
                required
                placeholder="e.g., Villa Pool - Arabian Ranches"
                className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="client_id" className="block text-sm font-medium text-slate-900">Client</label>
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
                <Link href="/vendors/new?type=Client&return_to=/projects/new" className="text-slate-900 underline">
                  + Add new client
                </Link>
                {' · '}
                <Link href="/vendors" className="text-slate-900 underline">Manage parties</Link>
              </p>
            </div>

            <div>
              <label htmlFor="work_type" className="block text-sm font-medium text-slate-900">Work Type</label>
              <select
                name="work_type"
                id="work_type"
                defaultValue={preselectedContractorId ? 'Subcontract' : 'Direct'}
                className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
              >
                {PROJECT_WORK_TYPES.map((workType) => (
                  <option key={workType} value={workType}>{workType}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="main_contractor_id" className="block text-sm font-medium text-slate-900">
                Main Contractor
              </label>
              <select
                name="main_contractor_id"
                id="main_contractor_id"
                defaultValue={preselectedContractorId}
                className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
              >
                <option value="">Direct project / no main contractor</option>
                {contractors.map((contractor) => (
                  <option key={contractor.id} value={contractor.id}>{contractor.name} ({contractor.party_type})</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                <Link href="/vendors/new?type=Contractor&return_to=/projects/new" className="text-slate-900 underline">
                  + Add new contractor
                </Link>
                {' · '}
                <Link href="/vendors" className="text-slate-900 underline">Manage parties</Link>
              </p>
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium text-slate-900">Location</label>
              <input
                type="text"
                name="location"
                id="location"
                required
                placeholder="e.g., Villa 12, Arabian Ranches, Dubai"
                className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
              />
            </div>

            <ProjectCommercialFields />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="start_date" className="block text-sm font-medium text-slate-900">Start Date</label>
                <input
                  type="date"
                  name="start_date"
                  id="start_date"
                  className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="expected_completion" className="block text-sm font-medium text-slate-900">Expected Completion</label>
                <input
                  type="date"
                  name="expected_completion"
                  id="expected_completion"
                  className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-slate-900">Status</label>
                <select
                  name="status"
                  id="status"
                  defaultValue="In Progress"
                  className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
                >
                  {PROJECT_STATUSES.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="assigned_to" className="block text-sm font-medium text-slate-900">Project Manager</label>
              <input
                type="text"
                name="assigned_to"
                id="assigned_to"
                placeholder="e.g., Ahmed Hassan"
                className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-slate-900">Description</label>
              <textarea
                name="description"
                id="description"
                rows={3}
                placeholder="Pool specifications, special requirements, etc."
                className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Create Project
              </button>
              <Link
                href="/projects"
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
