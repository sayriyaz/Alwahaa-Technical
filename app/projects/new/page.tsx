import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AppLogo } from '@/components/app-logo'
import { ProjectCommercialFields } from '@/components/project-commercial-fields'
import { requireAuthenticatedAppUser } from '@/lib/auth'
import { getRolePermissions } from '@/lib/auth-constants'
import { getContractors } from '@/lib/contractors'
import { createProject, PROJECT_STATUSES, PROJECT_WORK_TYPES } from '@/lib/projects'
import { parseVatApplicableValue } from '@/lib/vat'

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ client_id?: string | string[] }>
}) {
  const { appUser, db } = await requireAuthenticatedAppUser(['admin', 'manager'])
  const permissions = getRolePermissions(appUser.role)
  const resolvedSearchParams = await searchParams
  const preselectedClientId = Array.isArray(resolvedSearchParams.client_id)
    ? resolvedSearchParams.client_id[0] || ''
    : resolvedSearchParams.client_id || ''
  if (!permissions.canCreateProjects) {
    redirect('/access-denied')
  }

  const clients = await getContractors(db)

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
    const location = formData.get('location') as string
    const contractValue = parseFloat(formData.get('contract_value') as string) || 0
    const vatApplicable = parseVatApplicableValue(formData.get('vat_applicable'))
    const vatAmount = parseFloat(formData.get('vat_amount') as string) || 0
    const startDate = formData.get('start_date') as string
    const expectedCompletion = formData.get('expected_completion') as string
    const statusValue = formData.get('status') as string
    const description = formData.get('description') as string
    const assignedTo = formData.get('assigned_to') as string
    const selectedStatus = PROJECT_STATUSES.find((s) => s === statusValue) || 'In Progress'
    const selectedWorkType = PROJECT_WORK_TYPES.find((w) => w === workTypeValue) || 'Direct'

    if (!name || !clientId || !location) return

    const project = await createProject({
      name,
      client_id: clientId,
      work_type: selectedWorkType,
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
    <div className="min-h-screen" style={{ background: '#F5F5F7', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* Top bar */}
      <header style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid #E5E5EA', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="mx-auto max-w-5xl px-6 py-3 flex items-center justify-between">
          <AppLogo />
          <nav className="hidden md:flex items-center gap-1">
            {[
              { href: '/', label: 'Dashboard' },
              { href: '/projects', label: 'Projects' },
              { href: '/vendors', label: 'Parties' },
              { href: '/purchases', label: 'Purchases' },
              { href: '/expenses', label: 'Expenses' },
              { href: '/invoices', label: 'Invoices' },
              { href: '/vendor-payments', label: 'Vendor Payments' },
              { href: '/reports', label: 'Reports' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  item.href === '/projects'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 hidden sm:block">{appUser?.full_name || appUser?.email}</span>
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto max-w-3xl px-6 py-10">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-8">
          <Link href="/projects" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            Projects
          </Link>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><polyline points="9 18 15 12 9 6"/></svg>
          <span className="text-sm text-gray-500">New Project</span>
        </div>

        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight" style={{ color: '#1D1D1F' }}>New Project</h1>
          <p className="mt-1.5 text-base" style={{ color: '#6E6E73' }}>Fill in the details to create a new pool construction project.</p>
        </div>

        <style>{`
          .fi { display:block; width:100%; padding:10px 14px; font-size:15px; line-height:1.5; color:#1D1D1F; background:#fff; border:1px solid #D2D2D7; border-radius:10px; outline:none; transition:border-color 0.15s, box-shadow 0.15s; box-sizing:border-box; }
          .fi:focus { border-color:#007AFF; box-shadow:0 0 0 3px rgba(0,122,255,0.15); }
          textarea.fi { resize:vertical; }
        `}</style>

        <form action={handleSubmit} className="space-y-4">

          {/* Section: Project Info */}
          <FormSection title="Project Details" icon="📋">
            <FormField label="Project Name" required>
              <input type="text" name="name" required placeholder="e.g., Saraf Villa Pool" className="fi" />
            </FormField>
            <FormField label="Location" required>
              <input type="text" name="location" required placeholder="e.g., Villa No. 5, Al Rashidiya, Dubai" className="fi" />
            </FormField>
            <FormField label="Description">
              <textarea name="description" rows={3} placeholder="Pool specifications, dimensions, special requirements…" className="fi" />
            </FormField>
          </FormSection>

          {/* Section: Client & Team */}
          <FormSection title="Client & Team" icon="👤">
            <FormField
              label="Client"
              required
              hint={
                <span>
                  <Link href="/clients/new?return_to=/projects/new" className="text-blue-600 hover:underline">+ Add client</Link>
                  {' · '}
                  <Link href="/clients" className="text-blue-600 hover:underline">Manage</Link>
                </span>
              }
            >
              <select name="client_id" required defaultValue={preselectedClientId} className="fi">
                <option value="">Select a client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} · {c.party_type}</option>
                ))}
              </select>
            </FormField>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Work Type">
                <select name="work_type" defaultValue="Direct" className="fi">
                  {PROJECT_WORK_TYPES.map((w) => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="Project Manager">
                <input type="text" name="assigned_to" placeholder="e.g., Habib Rahman" className="fi" />
              </FormField>
            </div>

          </FormSection>

          {/* Section: Contract Value */}
          <FormSection title="Commercial" icon="💰">
            <ProjectCommercialFields />
          </FormSection>

          {/* Section: Timeline */}
          <FormSection title="Timeline & Status" icon="📅">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField label="Start Date">
                <input type="date" name="start_date" className="fi" />
              </FormField>
              <FormField label="Expected Completion">
                <input type="date" name="expected_completion" className="fi" />
              </FormField>
              <FormField label="Status">
                <select name="status" defaultValue="In Progress" className="fi">
                  {PROJECT_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </FormField>
            </div>
          </FormSection>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ background: '#007AFF' }}
            >
              Create Project
            </button>
            <Link
              href="/projects"
              className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: '#E5E5EA', color: '#1D1D1F' }}
            >
              Cancel
            </Link>
          </div>

        </form>
      </main>
    </div>
  )
}

// ─── Helper components ────────────────────────────────────────────────────────

function FormSection({
  title,
  icon,
  children,
}: {
  title: string
  icon: string
  children: React.ReactNode
}) {
  return (
    <div
      className="rounded-2xl p-6 space-y-4"
      style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }}
    >
      <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
        <span className="text-lg">{icon}</span>
        <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#6E6E73' }}>{title}</h2>
      </div>
      {children}
    </div>
  )
}

function FormField({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: '#1D1D1F' }}>
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs" style={{ color: '#6E6E73' }}>{hint}</p>}
    </div>
  )
}
