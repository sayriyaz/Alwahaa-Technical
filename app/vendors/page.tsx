import type { ReactNode } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppLogo } from '@/components/app-logo'
import { requireAuthenticatedAppUser } from '@/lib/auth'
import { getRolePermissions, type AppPermissions } from '@/lib/auth-constants'
import { CONTRACTOR_PARTY_TYPES } from '@/lib/contractors'
import { deleteParty, getParties, PARTY_TYPES, type Party, type PartySource, updateParty } from '@/lib/parties'
import { formatCurrency } from '@/lib/projects'

const inputClassName = 'mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm'
const textareaClassName = 'mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm'
const PARTY_SORTS = ['name_asc', 'name_desc', 'type_asc', 'type_desc'] as const
type PartySort = (typeof PARTY_SORTS)[number]

function canManagePartySource(_source: PartySource, permissions: AppPermissions) {
  return permissions.canManageVendors
}

function sortParties(parties: Party[], sort: PartySort) {
  const sorted = [...parties]

  switch (sort) {
    case 'name_desc':
      return sorted.sort((left, right) => right.name.localeCompare(left.name))
    case 'type_asc':
      return sorted.sort((left, right) => {
        const typeComparison = left.type.localeCompare(right.type)
        return typeComparison !== 0 ? typeComparison : left.name.localeCompare(right.name)
      })
    case 'type_desc':
      return sorted.sort((left, right) => {
        const typeComparison = right.type.localeCompare(left.type)
        return typeComparison !== 0 ? typeComparison : left.name.localeCompare(right.name)
      })
    case 'name_asc':
    default:
      return sorted.sort((left, right) => left.name.localeCompare(right.name))
  }
}

function getNextSort(currentSort: PartySort, field: 'name' | 'type'): PartySort {
  if (field === 'name') {
    return currentSort === 'name_asc' ? 'name_desc' : 'name_asc'
  }

  return currentSort === 'type_asc' ? 'type_desc' : 'type_asc'
}

function getSortIndicator(currentSort: PartySort, field: 'name' | 'type') {
  if (field === 'name') {
    if (currentSort === 'name_asc') return '↑'
    if (currentSort === 'name_desc') return '↓'
    return '↕'
  }

  if (currentSort === 'type_asc') return '↑'
  if (currentSort === 'type_desc') return '↓'
  return '↕'
}

function getPartyTypeClasses(type: Party['type']) {
  switch (type) {
    case 'Direct Client':   return 'bg-blue-50 text-blue-700'
    case 'Main Contractor': return 'bg-sky-50 text-sky-700'
    case 'Developer':       return 'bg-indigo-50 text-indigo-700'
    case 'Commercial':      return 'bg-purple-50 text-purple-700'
    case 'Government':      return 'bg-cyan-50 text-cyan-700'
    case 'Consultant':      return 'bg-violet-50 text-violet-700'
    case 'Vendor':          return 'bg-amber-50 text-amber-700'
    case 'Subcontractor':   return 'bg-emerald-50 text-emerald-700'
    default:                return 'bg-slate-100 text-slate-700'
  }
}

export default async function PartiesPage({
  searchParams,
}: {
  searchParams: Promise<{
    edit?: string | string[]
    success?: string | string[]
    error?: string | string[]
    payment_status?: string | string[]
    sort?: string | string[]
  }>
}) {
  const { appUser, db } = await requireAuthenticatedAppUser()
  const permissions = getRolePermissions(appUser.role)

  if (!permissions.canManageClients && !permissions.canManageVendors) {
    redirect('/access-denied')
  }

  const resolvedSearchParams = await searchParams
  const editingPartyKey = Array.isArray(resolvedSearchParams.edit)
    ? resolvedSearchParams.edit[0] || ''
    : resolvedSearchParams.edit || ''
  const successCode = Array.isArray(resolvedSearchParams.success)
    ? resolvedSearchParams.success[0] || ''
    : resolvedSearchParams.success || ''
  const errorCode = Array.isArray(resolvedSearchParams.error)
    ? resolvedSearchParams.error[0] || ''
    : resolvedSearchParams.error || ''
  const paymentStatus = Array.isArray(resolvedSearchParams.payment_status)
    ? resolvedSearchParams.payment_status[0] || ''
    : resolvedSearchParams.payment_status || ''
  const sortValue = Array.isArray(resolvedSearchParams.sort)
    ? resolvedSearchParams.sort[0] || ''
    : resolvedSearchParams.sort || ''
  const selectedSort = PARTY_SORTS.find((sort) => sort === sortValue) || 'name_asc'

  const parties = sortParties(await getParties(db), selectedSort)
  const editingParty = parties.find((party) => party.key === editingPartyKey)

  function buildSortHref(nextSort: PartySort) {
    const params = new URLSearchParams()

    if (editingPartyKey) params.set('edit', editingPartyKey)
    if (successCode) params.set('success', successCode)
    if (errorCode) params.set('error', errorCode)
    if (paymentStatus) params.set('payment_status', paymentStatus)
    params.set('sort', nextSort)

    return `/vendors?${params.toString()}`
  }

  async function updatePartyAction(formData: FormData) {
    'use server'

    const { appUser, db } = await requireAuthenticatedAppUser(['admin', 'manager', 'accountant'])
    const permissions = getRolePermissions(appUser.role)
    const source = formData.get('party_source') as PartySource
    const recordId = formData.get('party_id') as string
    const typeValue = formData.get('party_type') as string
    const selectedType = PARTY_TYPES.find((type) => type === typeValue) || 'Vendor'

    if (!source || !recordId || !canManagePartySource(source, permissions)) {
      redirect('/access-denied')
    }

    const updated = await updateParty(source, recordId, {
      type: selectedType,
      name: formData.get('name') as string,
      contact_person: (formData.get('contact_person') as string) || null,
      phone: (formData.get('phone') as string) || null,
      email: (formData.get('email') as string) || null,
      address: (formData.get('address') as string) || null,
      emirates_id: (formData.get('emirates_id') as string) || null,
      trn_number: (formData.get('trn_number') as string) || null,
      payment_terms: (formData.get('payment_terms') as string) || null,
      notes: (formData.get('notes') as string) || null,
    }, db)

    redirect(updated ? '/vendors?success=updated' : '/vendors?error=update_failed')
  }

  async function deletePartyAction(formData: FormData) {
    'use server'

    const { appUser, db } = await requireAuthenticatedAppUser(['admin', 'manager', 'accountant'])
    const permissions = getRolePermissions(appUser.role)
    const source = formData.get('party_source') as PartySource
    const recordId = formData.get('party_id') as string

    if (!source || !recordId || !canManagePartySource(source, permissions)) {
      redirect('/access-denied')
    }

    const deleted = await deleteParty(source, recordId, db)
    redirect(deleted ? '/vendors?success=deleted' : '/vendors?error=delete_failed')
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
            <NavItem href="/vendors" label="Parties" active />
            <NavItem href="/purchases" label="Purchases" />
            <NavItem href="/expenses" label="Expenses" />
            <NavItem href="/invoices" label="Invoices" />
            <NavItem href="/vendor-payments" label="Vendor Payments" />
            <NavItem href="/reports" label="Reports" />
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Parties</h2>
            <p className="mt-1 text-sm text-slate-600">
              Manage clients, vendors, contractors, subcontractors, and consultants in one place.
            </p>
          </div>
          <Link
            href="/vendors/new"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            + New Party
          </Link>
        </div>

        {paymentStatus === 'deleted' && (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Vendor payment deleted successfully.
          </div>
        )}

        {successCode === 'created' && (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Party created successfully.
          </div>
        )}

        {successCode === 'updated' && (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Party updated successfully.
          </div>
        )}

        {successCode === 'deleted' && (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Party deleted successfully.
          </div>
        )}

        {errorCode === 'update_failed' && (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            Party update failed. Please check the required fields and try again.
          </div>
        )}

        {errorCode === 'delete_failed' && (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            Party deletion failed. This record may still be linked to projects, invoices, purchase orders, or payments.
          </div>
        )}

        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  <Link
                    href={buildSortHref(getNextSort(selectedSort, 'name'))}
                    className="inline-flex items-center gap-1 hover:text-slate-700"
                  >
                    <span>Party</span>
                    <span>{getSortIndicator(selectedSort, 'name')}</span>
                  </Link>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  <Link
                    href={buildSortHref(getNextSort(selectedSort, 'type'))}
                    className="inline-flex items-center gap-1 hover:text-slate-700"
                  >
                    <span>Type</span>
                    <span>{getSortIndicator(selectedSort, 'type')}</span>
                  </Link>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Reference</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Commercials</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {parties.map((party) => (
                <tr key={party.key} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{party.name}</div>
                    {party.address && <div className="text-xs text-slate-500">{party.address}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getPartyTypeClasses(party.type)}`}>
                      {party.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {party.contact_person && <div>{party.contact_person}</div>}
                    <div>{party.phone || '-'}</div>
                    {party.email && <div className="text-xs">{party.email}</div>}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <div>TRN: {party.trn_number || '-'}</div>
                    {party.emirates_id && <div className="text-xs">Emirates ID: {party.emirates_id}</div>}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {party.payment_terms ? (
                      <div>{party.payment_terms}</div>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                    <div className="flex items-center justify-end gap-3">
                      {permissions.canManageVendorPayments && (
                        <Link
                          href={`/vendor-payments?vendor_id=${party.record_id}`}
                          className="font-medium text-sky-700 hover:text-sky-800"
                        >
                          Payments
                        </Link>
                      )}
                      {canManagePartySource(party.source, permissions) && (
                        <Link
                          href={`/vendors?edit=${party.key}`}
                          className="font-medium text-slate-700 hover:text-slate-900"
                        >
                          Edit
                        </Link>
                      )}
                      {canManagePartySource(party.source, permissions) && (
                        <form action={deletePartyAction}>
                          <input type="hidden" name="party_source" value={party.source} />
                          <input type="hidden" name="party_id" value={party.record_id} />
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
              {parties.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No parties found. Add a client, vendor, contractor, subcontractor, or consultant to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {editingParty && (
          <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Edit Party</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Update the selected record here. Vendor payment management stays available on vendor rows.
                </p>
              </div>
              <Link
                href="/vendors"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </Link>
            </div>

            <form action={updatePartyAction} className="mt-6 space-y-6">
              <input type="hidden" name="party_source" value={editingParty.source} />
              <input type="hidden" name="party_id" value={editingParty.record_id} />

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Party Type" htmlFor="party_type">
                  <select id="party_type" name="party_type" defaultValue={editingParty.type} className={inputClassName}>
                    {CONTRACTOR_PARTY_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Name" htmlFor="name">
                  <input id="name" name="name" type="text" required defaultValue={editingParty.name} className={inputClassName} />
                </Field>
                <Field label="Contact Person" htmlFor="contact_person">
                  <input id="contact_person" name="contact_person" type="text" defaultValue={editingParty.contact_person || ''} className={inputClassName} />
                </Field>
                <Field label="Phone" htmlFor="phone">
                  <input id="phone" name="phone" type="text" defaultValue={editingParty.phone || ''} className={inputClassName} />
                </Field>
                <Field label="Email" htmlFor="email">
                  <input id="email" name="email" type="email" defaultValue={editingParty.email || ''} className={inputClassName} />
                </Field>
                <Field label="TRN Number" htmlFor="trn_number">
                  <input id="trn_number" name="trn_number" type="text" defaultValue={editingParty.trn_number || ''} className={inputClassName} />
                </Field>
                <Field label="Emirates ID" htmlFor="emirates_id">
                  <input id="emirates_id" name="emirates_id" type="text" defaultValue={editingParty.emirates_id || ''} className={inputClassName} />
                </Field>
                <Field label="Payment Terms" htmlFor="payment_terms">
                  <input id="payment_terms" name="payment_terms" type="text" defaultValue={editingParty.payment_terms || ''} className={inputClassName} />
                </Field>
              </div>

              <Field label="Address" htmlFor="address">
                <textarea id="address" name="address" rows={3} defaultValue={editingParty.address || ''} className={textareaClassName} />
              </Field>

              <Field label="Notes" htmlFor="notes">
                <textarea id="notes" name="notes" rows={3} defaultValue={editingParty.notes || ''} className={textareaClassName} />
              </Field>

              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Save Party Changes
              </button>
            </form>
          </section>
        )}
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
