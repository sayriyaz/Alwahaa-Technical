import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AppLogo } from '@/components/app-logo'
import { requireAuthenticatedAppUser } from '@/lib/auth'
import { getRolePermissions } from '@/lib/auth-constants'
import { createParty, PARTY_TYPES, type PartyType } from '@/lib/parties'

function canCreateType(type: PartyType, canManageClients: boolean, canManageVendors: boolean) {
  return type === 'Client' ? canManageClients : canManageVendors
}

export default async function NewPartyPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string | string[]; return_to?: string | string[] }>
}) {
  const { appUser } = await requireAuthenticatedAppUser(['admin', 'manager', 'accountant'])
  const permissions = getRolePermissions(appUser.role)

  if (!permissions.canManageClients && !permissions.canManageVendors) {
    redirect('/access-denied')
  }

  const resolvedSearchParams = await searchParams
  const requestedType = Array.isArray(resolvedSearchParams.type)
    ? resolvedSearchParams.type[0] || ''
    : resolvedSearchParams.type || ''
  const defaultType = PARTY_TYPES.find((type) => type === requestedType) || 'Vendor'
  const returnTo = Array.isArray(resolvedSearchParams.return_to)
    ? resolvedSearchParams.return_to[0] || ''
    : resolvedSearchParams.return_to || ''

  async function handleSubmit(formData: FormData) {
    'use server'

    const { appUser, db } = await requireAuthenticatedAppUser(['admin', 'manager', 'accountant'])
    const permissions = getRolePermissions(appUser.role)
    const typeValue = formData.get('party_type') as string
    const selectedType = PARTY_TYPES.find((type) => type === typeValue)

    if (!selectedType || !canCreateType(selectedType, permissions.canManageClients, permissions.canManageVendors)) {
      redirect('/access-denied')
    }

    const party = await createParty({
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

    if (!party) {
      redirect('/vendors?error=update_failed')
    }

    if (returnTo) {
      const nextUrl = new URL(returnTo, 'http://localhost')

      if (party.type === 'Client') {
        nextUrl.searchParams.set('client_id', party.record_id)
      } else if (party.type === 'Vendor') {
        nextUrl.searchParams.set('vendor_id', party.record_id)
      } else {
        nextUrl.searchParams.set('contractor_id', party.record_id)
      }

      redirect(`${nextUrl.pathname}${nextUrl.search}`)
    }

    redirect('/vendors?success=created')
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

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href={returnTo || '/vendors'} className="text-sm text-slate-600 hover:text-slate-900">← Back</Link>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">New Party</h2>
          <p className="mt-1 text-sm text-slate-600">
            Add a client, vendor, contractor, subcontractor, or consultant.
          </p>

          <form action={handleSubmit} className="mt-6 space-y-6">
            <div>
              <label htmlFor="party_type" className="block text-sm font-medium text-slate-900">Party Type *</label>
              <select
                name="party_type"
                id="party_type"
                defaultValue={defaultType}
                className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
              >
                {PARTY_TYPES.filter((type) => canCreateType(type, permissions.canManageClients, permissions.canManageVendors)).map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-900">Name *</label>
              <input
                type="text"
                name="name"
                id="name"
                required
                className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="contact_person" className="block text-sm font-medium text-slate-900">Contact Person</label>
                <input
                  type="text"
                  name="contact_person"
                  id="contact_person"
                  className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-slate-900">Phone</label>
                <input
                  type="text"
                  name="phone"
                  id="phone"
                  className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-900">Email</label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="trn_number" className="block text-sm font-medium text-slate-900">TRN Number</label>
                <input
                  type="text"
                  name="trn_number"
                  id="trn_number"
                  className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="emirates_id" className="block text-sm font-medium text-slate-900">Emirates ID</label>
                <input
                  type="text"
                  name="emirates_id"
                  id="emirates_id"
                  className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="payment_terms" className="block text-sm font-medium text-slate-900">Payment Terms</label>
                <input
                  type="text"
                  name="payment_terms"
                  id="payment_terms"
                  className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
                />
              </div>
            </div>

            <p className="text-xs text-slate-500">
              Use Emirates ID for client records. Payment terms apply to vendor records. Contractor-type records can be set as Contractor, Subcontractor, or Consultant.
            </p>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-slate-900">Address</label>
              <textarea
                name="address"
                id="address"
                rows={3}
                className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-slate-900">Notes</label>
              <textarea
                name="notes"
                id="notes"
                rows={3}
                className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Create Party
              </button>
              <Link
                href={returnTo || '/vendors'}
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
