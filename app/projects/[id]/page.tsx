import type { ReactNode } from 'react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { AppLogo } from '@/components/app-logo'
import { ClearableDateInput } from '@/components/clearable-date-input'
import { ProjectCommercialFields } from '@/components/project-commercial-fields'
import { requireAuthenticatedAppUser } from '@/lib/auth'
import { getRolePermissions } from '@/lib/auth-constants'
import { getContractors } from '@/lib/contractors'
import {
  PROJECT_DOCUMENT_TYPES,
  deleteProjectDocument,
  getProjectDocuments,
  getProjectDocumentUrl,
  uploadProjectDocument,
} from '@/lib/project-documents'
import {
  PROJECT_PHASE_STATUSES,
  PROJECT_STATUSES,
  PROJECT_WORK_TYPES,
  createProjectPhase,
  formatCurrency,
  formatDate,
  getProjectById,
  getProjectStatusClasses,
  toDateInputValue,
  updateProject,
  updateProjectPhase,
} from '@/lib/projects'
import { parseVatApplicableValue } from '@/lib/vat'

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ documents?: string | string[] }>
}) {
  const { appUser, db } = await requireAuthenticatedAppUser()
  const permissions = getRolePermissions(appUser.role)
  const { id } = await params
  const resolvedSearchParams = await searchParams
  const documentStatus = Array.isArray(resolvedSearchParams.documents)
    ? resolvedSearchParams.documents[0] || ''
    : resolvedSearchParams.documents || ''
  const [project, contractors, projectDocuments] = await Promise.all([
    getProjectById(id, db),
    getContractors(db),
    getProjectDocuments(id, db),
  ])

  if (!project) {
    notFound()
  }

  async function updateProjectDetails(formData: FormData) {
    'use server'

    const { appUser, db } = await requireAuthenticatedAppUser()
    const permissions = getRolePermissions(appUser.role)

    if (!permissions.canEditProjects) {
      redirect('/access-denied')
    }

    const projectId = formData.get('project_id') as string
    const name = formData.get('name') as string
    const workTypeValue = formData.get('work_type') as string
    const mainContractorId = formData.get('main_contractor_id') as string
    const location = formData.get('location') as string
    const contractValue = parseFloat(formData.get('contract_value') as string) || 0
    const vatApplicable = parseVatApplicableValue(formData.get('vat_applicable'))
    const vatAmount = parseFloat(formData.get('vat_amount') as string) || 0
    const startDate = formData.get('start_date') as string
    const expectedCompletion = formData.get('expected_completion') as string
    const actualCompletion = formData.get('actual_completion') as string
    const statusValue = formData.get('status') as string
    const assignedTo = formData.get('assigned_to') as string
    const description = formData.get('description') as string
    const notes = formData.get('notes') as string

    const selectedStatus = PROJECT_STATUSES.find((status) => status === statusValue)
    const selectedWorkType = PROJECT_WORK_TYPES.find((workType) => workType === workTypeValue)

    if (!projectId || !name || !location || !selectedStatus || !selectedWorkType) {
      return
    }

    await updateProject(projectId, {
      name,
      work_type: selectedWorkType,
      main_contractor_id: mainContractorId || null,
      location,
      contract_value: contractValue,
      vat_applicable: vatApplicable,
      vat_amount: vatAmount,
      start_date: startDate || null,
      expected_completion: expectedCompletion || null,
      actual_completion: actualCompletion || null,
      status: selectedStatus,
      assigned_to: assignedTo || null,
      description: description || null,
      notes: notes || null,
    }, db)

    redirect(`/projects/${projectId}`)
  }

  async function uploadProjectDocumentAction(formData: FormData) {
    'use server'

    const { appUser, db } = await requireAuthenticatedAppUser(['admin', 'manager'])
    const permissions = getRolePermissions(appUser.role)

    if (!permissions.canEditProjects) {
      redirect('/access-denied')
    }

    const projectId = formData.get('project_id') as string
    const documentTypeValue = formData.get('document_type') as string
    const title = formData.get('title') as string
    const notes = formData.get('notes') as string
    const file = formData.get('file')
    const selectedDocumentType = PROJECT_DOCUMENT_TYPES.find((documentType) => documentType === documentTypeValue)

    if (!projectId || !title || !selectedDocumentType || !(file instanceof File) || file.size <= 0) {
      redirect(`/projects/${projectId || id}?documents=upload_failed`)
    }

    const uploadedDocument = await uploadProjectDocument({
      project_id: projectId,
      document_type: selectedDocumentType,
      title,
      notes: notes || null,
      uploaded_by: appUser.id,
    }, file, db)

    redirect(`/projects/${projectId}?documents=${uploadedDocument ? 'uploaded' : 'upload_failed'}`)
  }

  async function deleteProjectDocumentAction(formData: FormData) {
    'use server'

    const { appUser, db } = await requireAuthenticatedAppUser(['admin', 'manager'])
    const permissions = getRolePermissions(appUser.role)

    if (!permissions.canEditProjects) {
      redirect('/access-denied')
    }

    const projectId = formData.get('project_id') as string
    const documentId = formData.get('document_id') as string

    if (!projectId || !documentId) {
      redirect(`/projects/${projectId || id}?documents=delete_failed`)
    }

    const deleted = await deleteProjectDocument(documentId, db)

    redirect(`/projects/${projectId}?documents=${deleted ? 'deleted' : 'delete_failed'}`)
  }

  async function addProjectPhaseAction(formData: FormData) {
    'use server'

    const { appUser, db } = await requireAuthenticatedAppUser()
    const permissions = getRolePermissions(appUser.role)

    if (!permissions.canEditProjects) {
      redirect('/access-denied')
    }

    const projectId = formData.get('project_id') as string
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const estimatedCost = parseFloat(formData.get('estimated_cost') as string) || 0
    const actualCost = parseFloat(formData.get('actual_cost') as string) || 0
    const startDate = formData.get('start_date') as string
    const expectedEnd = formData.get('expected_end') as string
    const actualEnd = formData.get('actual_end') as string
    const completionPercentage = parseInt(formData.get('completion_percentage') as string, 10) || 0
    const statusValue = formData.get('status') as string
    const invoiceTrigger = formData.get('invoice_trigger') === 'on'

    const selectedStatus = PROJECT_PHASE_STATUSES.find((status) => status === statusValue)

    if (!projectId || !name || !selectedStatus) {
      return
    }

    await createProjectPhase({
      project_id: projectId,
      name,
      description: description || null,
      estimated_cost: estimatedCost,
      actual_cost: actualCost,
      start_date: startDate || null,
      expected_end: expectedEnd || null,
      actual_end: actualEnd || null,
      status: selectedStatus,
      completion_percentage: Math.min(Math.max(completionPercentage, 0), 100),
      invoice_trigger: invoiceTrigger,
    }, db)

    redirect(`/projects/${projectId}`)
  }

  async function updateProjectPhaseAction(formData: FormData) {
    'use server'

    const { appUser, db } = await requireAuthenticatedAppUser()
    const permissions = getRolePermissions(appUser.role)

    if (!permissions.canEditProjects) {
      redirect('/access-denied')
    }

    const projectId = formData.get('project_id') as string
    const phaseId = formData.get('phase_id') as string
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const estimatedCost = parseFloat(formData.get('estimated_cost') as string) || 0
    const actualCost = parseFloat(formData.get('actual_cost') as string) || 0
    const startDate = formData.get('start_date') as string
    const expectedEnd = formData.get('expected_end') as string
    const actualEnd = formData.get('actual_end') as string
    const completionPercentage = parseInt(formData.get('completion_percentage') as string, 10) || 0
    const statusValue = formData.get('status') as string
    const invoiceTrigger = formData.get('invoice_trigger') === 'on'

    const selectedStatus = PROJECT_PHASE_STATUSES.find((status) => status === statusValue)

    if (!projectId || !phaseId || !name || !selectedStatus) {
      return
    }

    await updateProjectPhase(phaseId, {
      name,
      description: description || null,
      estimated_cost: estimatedCost,
      actual_cost: actualCost,
      start_date: startDate || null,
      expected_end: expectedEnd || null,
      actual_end: actualEnd || null,
      status: selectedStatus,
      completion_percentage: Math.min(Math.max(completionPercentage, 0), 100),
      invoice_trigger: invoiceTrigger,
    }, db)

    redirect(`/projects/${projectId}`)
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
            <NavItem href="/projects" label="Projects" active />
            <NavItem href="/vendors" label="Parties" />
            <NavItem href="/purchases" label="Purchases" />
            <NavItem href="/expenses" label="Expenses" />
            <NavItem href="/invoices" label="Invoices" />
            <NavItem href="/reports" label="Reports" />
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href="/projects" className="text-sm text-slate-600 hover:text-slate-900">← Back to Projects</Link>
        </div>

        {documentStatus === 'uploaded' && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Project document uploaded successfully.
          </div>
        )}

        {documentStatus === 'deleted' && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Project document deleted successfully.
          </div>
        )}

        {(documentStatus === 'upload_failed' || documentStatus === 'delete_failed') && (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            Project document action failed. Please try again.
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-sm font-medium text-slate-500">{project.project_code}</div>
              <h2 className="mt-1 text-2xl font-bold text-slate-900">{project.name}</h2>
              <p className="mt-1 text-sm text-slate-600">{project.client_name}</p>
              <p className="text-sm text-slate-500">{project.location}</p>
              <p className="text-sm text-slate-500">
                {project.work_type === 'Subcontract'
                  ? `Main Contractor: ${project.main_contractor_name || 'Not assigned'}`
                  : 'Direct project'}
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Link
                  href={`/projects/${project.id}/client-summary`}
                  className="inline-flex rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Client Summary
                </Link>
                <Link
                  href={`/projects/${project.id}/client-summary`}
                  className="inline-flex rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Print / PDF
                </Link>
              </div>
            </div>
            <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${getProjectStatusClasses(project.status)}`}>
              {project.status}
            </span>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard title="Contract Value" value={formatCurrency(project.contract_value)} />
            <SummaryCard title="VAT" value={project.vat_applicable ? formatCurrency(project.vat_amount) : 'Not Applicable'} />
            <SummaryCard title="Total Amount" value={formatCurrency(project.total_amount)} />
            <SummaryCard title="Start Date" value={formatDate(project.start_date)} />
            <SummaryCard title="Expected Completion" value={formatDate(project.expected_completion)} />
            <SummaryCard title="Assigned To" value={project.assigned_to || '-'} />
            <SummaryCard title="Work Type" value={project.work_type} />
            <SummaryCard title="Main Contractor" value={project.main_contractor_name || '-'} />
          </div>

          {(project.description || project.notes) && (
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <InfoBlock title="Description" value={project.description} />
              <InfoBlock title="Notes" value={project.notes} />
            </div>
          )}
        </div>

        {permissions.canEditProjects && (
          <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Edit Project</h3>
                <p className="mt-1 text-sm text-slate-600">
                  There is no separate approval step. Update the project status and details here.
                </p>
              </div>
            </div>

            <form action={updateProjectDetails} className="mt-6 space-y-6">
              <input type="hidden" name="project_id" value={project.id} />

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Project Name" htmlFor="name">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    defaultValue={project.name}
                    className={inputClassName}
                  />
                </Field>
                <Field label="Work Type" htmlFor="work_type">
                  <select
                    id="work_type"
                    name="work_type"
                    defaultValue={project.work_type}
                    className={inputClassName}
                  >
                    {PROJECT_WORK_TYPES.map((workType) => (
                      <option key={workType} value={workType}>{workType}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Main Contractor" htmlFor="main_contractor_id">
                  <div className="space-y-2">
                    <select
                      id="main_contractor_id"
                      name="main_contractor_id"
                      defaultValue={project.main_contractor_id || ''}
                      className={inputClassName}
                    >
                      <option value="">Direct project / no main contractor</option>
                      {contractors.map((contractor) => (
                        <option key={contractor.id} value={contractor.id}>{contractor.name} ({contractor.party_type})</option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500">
                      <Link href="/vendors/new?type=Contractor" className="text-slate-900 underline">
                        + Add new contractor
                      </Link>
                      {' · '}
                      <Link href="/vendors" className="text-slate-900 underline">Manage parties</Link>
                    </p>
                  </div>
                </Field>
                <Field label="Location" htmlFor="location">
                  <input
                    id="location"
                    name="location"
                    type="text"
                    required
                    defaultValue={project.location}
                    className={inputClassName}
                  />
                </Field>
                <Field label="Status" htmlFor="status">
                  <select
                    id="status"
                    name="status"
                    defaultValue={project.status}
                    className={inputClassName}
                  >
                    {PROJECT_STATUSES.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Start Date" htmlFor="start_date">
                  <input
                    id="start_date"
                    name="start_date"
                    type="date"
                    defaultValue={toDateInputValue(project.start_date)}
                    className={inputClassName}
                  />
                </Field>
                <Field label="Expected Completion" htmlFor="expected_completion">
                  <input
                    id="expected_completion"
                    name="expected_completion"
                    type="date"
                    defaultValue={toDateInputValue(project.expected_completion)}
                    className={inputClassName}
                  />
                </Field>
                <Field label="Actual Completion" htmlFor="actual_completion">
                  <input
                    id="actual_completion"
                    name="actual_completion"
                    type="date"
                    defaultValue={toDateInputValue(project.actual_completion)}
                    className={inputClassName}
                  />
                </Field>
                <Field label="Project Manager" htmlFor="assigned_to">
                  <input
                    id="assigned_to"
                    name="assigned_to"
                    type="text"
                    defaultValue={project.assigned_to || ''}
                    className={inputClassName}
                  />
                </Field>
              </div>

              <ProjectCommercialFields
                initialContractValue={project.contract_value}
                initialVatApplicable={project.vat_applicable}
                initialVatAmount={project.vat_amount}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Description" htmlFor="description">
                  <textarea
                    id="description"
                    name="description"
                    rows={4}
                    defaultValue={project.description || ''}
                    className={textareaClassName}
                  />
                </Field>
                <Field label="Notes" htmlFor="notes">
                  <textarea
                    id="notes"
                    name="notes"
                    rows={4}
                    defaultValue={project.notes || ''}
                    className={textareaClassName}
                  />
                </Field>
              </div>

              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Save Project Changes
              </button>
            </form>
          </section>
        )}

        <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Project Documents</h3>
              <p className="mt-1 text-sm text-slate-600">
                Keep drawings, contracts, quotations, estimations, and related files under this project.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              Contract {formatCurrency(project.contract_value)}
              {project.vat_applicable ? ` + VAT ${formatCurrency(project.vat_amount)}` : ' · No VAT'}
              {` = ${formatCurrency(project.total_amount)}`}
            </div>
          </div>

          {permissions.canEditProjects && (
            <form action={uploadProjectDocumentAction} className="mt-6 grid gap-4 lg:grid-cols-5">
              <input type="hidden" name="project_id" value={project.id} />

              <Field label="Document Type" htmlFor="document_type">
                <select id="document_type" name="document_type" defaultValue="Drawing" className={inputClassName}>
                  {PROJECT_DOCUMENT_TYPES.map((documentType) => (
                    <option key={documentType} value={documentType}>{documentType}</option>
                  ))}
                </select>
              </Field>
              <Field label="Title" htmlFor="title">
                <input id="title" name="title" type="text" required placeholder="e.g., Approved pool drawing" className={inputClassName} />
              </Field>
              <Field label="File" htmlFor="file">
                <input id="file" name="file" type="file" required className={inputClassName} />
              </Field>
              <Field label="Notes" htmlFor="document_notes">
                <input id="document_notes" name="notes" type="text" placeholder="Optional notes" className={inputClassName} />
              </Field>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Upload Document
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {projectDocuments.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No project documents uploaded yet.</div>
            ) : (
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Document</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Uploaded</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Notes</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {projectDocuments.map((document) => (
                    <tr key={document.id}>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{document.title}</div>
                        <div className="text-xs text-slate-500">{document.file_name} · {formatFileSize(document.file_size)}</div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{document.document_type}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        <div>{formatDate(document.created_at)}</div>
                        <div className="text-xs text-slate-500">{document.uploaded_by_name || 'Unknown user'}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{document.notes || '-'}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            href={getProjectDocumentUrl(document.file_path)}
                            target="_blank"
                            className="font-medium text-slate-700 hover:text-slate-900"
                          >
                            Open
                          </Link>
                          {permissions.canEditProjects && (
                            <form action={deleteProjectDocumentAction}>
                              <input type="hidden" name="project_id" value={project.id} />
                              <input type="hidden" name="document_id" value={document.id} />
                              <button type="submit" className="font-medium text-rose-600 hover:text-rose-700">
                                Delete
                              </button>
                            </form>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {project.totals && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-slate-900">Financial Snapshot</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <SummaryCard title="Purchases" value={formatCurrency(project.totals.total_purchases)} />
              <SummaryCard title="Expenses" value={formatCurrency(project.totals.total_expenses)} />
              <SummaryCard title="Invoiced" value={formatCurrency(project.totals.total_invoiced)} />
              <SummaryCard title="Received" value={formatCurrency(project.totals.total_received)} />
              <SummaryCard title="Vendor Payments" value={formatCurrency(project.totals.total_vendor_payments)} />
              <SummaryCard title="Profit Margin" value={`${project.totals.profit_margin.toFixed(2)}%`} />
            </div>
          </div>
        )}

        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Project Phases</h3>
          </div>

          {permissions.canEditProjects && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h4 className="text-base font-semibold text-slate-900">Add Phase</h4>
              <form action={addProjectPhaseAction} className="mt-4 space-y-4">
                <input type="hidden" name="project_id" value={project.id} />

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Field label="Phase Name" htmlFor="new_phase_name">
                    <input id="new_phase_name" name="name" type="text" required className={inputClassName} />
                  </Field>
                  <Field label="Status" htmlFor="new_phase_status">
                    <select id="new_phase_status" name="status" defaultValue="Pending" className={inputClassName}>
                      {PROJECT_PHASE_STATUSES.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Estimated Cost" htmlFor="new_phase_estimated_cost">
                    <input id="new_phase_estimated_cost" name="estimated_cost" type="number" min="0" step="0.01" defaultValue="0" className={inputClassName} />
                  </Field>
                  <Field label="Completion %" htmlFor="new_phase_completion">
                    <input id="new_phase_completion" name="completion_percentage" type="number" min="0" max="100" defaultValue="0" className={inputClassName} />
                  </Field>
                  <Field label="Start Date" htmlFor="new_phase_start_date">
                    <input id="new_phase_start_date" name="start_date" type="date" className={inputClassName} />
                  </Field>
                  <Field label="Expected End" htmlFor="new_phase_expected_end">
                    <input id="new_phase_expected_end" name="expected_end" type="date" className={inputClassName} />
                  </Field>
                  <Field label="Actual End" htmlFor="new_phase_actual_end">
                    <ClearableDateInput
                      id="new_phase_actual_end"
                      name="actual_end"
                      className={inputClassName}
                    />
                  </Field>
                  <Field label="Actual Cost" htmlFor="new_phase_actual_cost">
                    <input id="new_phase_actual_cost" name="actual_cost" type="number" min="0" step="0.01" defaultValue="0" className={inputClassName} />
                  </Field>
                </div>

                <Field label="Description" htmlFor="new_phase_description">
                  <textarea id="new_phase_description" name="description" rows={3} className={textareaClassName} />
                </Field>

                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" name="invoice_trigger" className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900" />
                  Mark this phase as invoice-triggering
                </label>

                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Add Phase
                </button>
              </form>
            </div>
          )}

          <div className="mt-4 space-y-4">
            {project.phases.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
                No phases added for this project yet.
              </div>
            ) : (
              project.phases.map((phase) => (
                <div key={phase.id} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h4 className="text-lg font-semibold text-slate-900">{phase.name}</h4>
                      {phase.description && <p className="mt-1 text-sm text-slate-600">{phase.description}</p>}
                    </div>
                    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                      {phase.status}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <SummaryCard title="Estimated" value={formatCurrency(phase.estimated_cost)} />
                    <SummaryCard title="Actual" value={formatCurrency(phase.actual_cost)} />
                    <SummaryCard title="Progress" value={`${phase.completion_percentage}%`} />
                    <SummaryCard title="Expected End" value={formatDate(phase.expected_end)} />
                    <SummaryCard title="Actual End" value={formatDate(phase.actual_end)} />
                  </div>

                  {permissions.canEditProjects && (
                    <form action={updateProjectPhaseAction} className="mt-6 space-y-4 border-t border-slate-200 pt-6">
                      <input type="hidden" name="project_id" value={project.id} />
                      <input type="hidden" name="phase_id" value={phase.id} />

                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Field label="Phase Name" htmlFor={`phase_name_${phase.id}`}>
                          <input id={`phase_name_${phase.id}`} name="name" type="text" required defaultValue={phase.name} className={inputClassName} />
                        </Field>
                        <Field label="Status" htmlFor={`phase_status_${phase.id}`}>
                          <select id={`phase_status_${phase.id}`} name="status" defaultValue={phase.status} className={inputClassName}>
                            {PROJECT_PHASE_STATUSES.map((status) => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Estimated Cost" htmlFor={`phase_estimated_${phase.id}`}>
                          <input id={`phase_estimated_${phase.id}`} name="estimated_cost" type="number" min="0" step="0.01" defaultValue={String(phase.estimated_cost)} className={inputClassName} />
                        </Field>
                        <Field label="Actual Cost" htmlFor={`phase_actual_${phase.id}`}>
                          <input id={`phase_actual_${phase.id}`} name="actual_cost" type="number" min="0" step="0.01" defaultValue={String(phase.actual_cost)} className={inputClassName} />
                        </Field>
                        <Field label="Progress %" htmlFor={`phase_progress_${phase.id}`}>
                          <input id={`phase_progress_${phase.id}`} name="completion_percentage" type="number" min="0" max="100" defaultValue={String(phase.completion_percentage)} className={inputClassName} />
                        </Field>
                        <Field label="Start Date" htmlFor={`phase_start_${phase.id}`}>
                          <input id={`phase_start_${phase.id}`} name="start_date" type="date" defaultValue={phase.start_date || ''} className={inputClassName} />
                        </Field>
                        <Field label="Expected End" htmlFor={`phase_expected_${phase.id}`}>
                          <input id={`phase_expected_${phase.id}`} name="expected_end" type="date" defaultValue={phase.expected_end || ''} className={inputClassName} />
                        </Field>
                        <Field label="Actual End" htmlFor={`phase_actual_end_${phase.id}`}>
                          <ClearableDateInput
                            id={`phase_actual_end_${phase.id}`}
                            name="actual_end"
                            defaultValue={phase.actual_end || ''}
                            className={inputClassName}
                          />
                        </Field>
                      </div>

                      <Field label="Description" htmlFor={`phase_description_${phase.id}`}>
                        <textarea
                          id={`phase_description_${phase.id}`}
                          name="description"
                          rows={3}
                          defaultValue={phase.description || ''}
                          className={textareaClassName}
                        />
                      </Field>

                      <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          name="invoice_trigger"
                          defaultChecked={phase.invoice_trigger}
                          className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                        Invoice trigger for this phase
                      </label>

                      <button
                        type="submit"
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Update Phase
                      </button>
                    </form>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

function formatFileSize(value: number) {
  if (value < 1024) {
    return `${value} B`
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

const inputClassName = 'mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm'
const textareaClassName = 'mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm'

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

function InfoBlock({ title, value }: { title: string; value: string | null }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="text-sm font-medium text-slate-500">{title}</div>
      <div className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{value || '-'}</div>
    </div>
  )
}

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
