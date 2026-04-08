import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AppLogo } from '@/components/app-logo'
import { requireAuthenticatedAppUser } from '@/lib/auth'
import { getRolePermissions } from '@/lib/auth-constants'
import { createClient } from '@/lib/clients'

export default async function NewClientPage({
  searchParams,
}: {
  searchParams: Promise<{ return_to?: string | string[] }>
}) {
  const { appUser } = await requireAuthenticatedAppUser(['admin', 'manager', 'accountant'])
  const permissions = getRolePermissions(appUser.role)
  const resolvedSearchParams = await searchParams
  const returnTo = Array.isArray(resolvedSearchParams.return_to)
    ? resolvedSearchParams.return_to[0] || ''
    : resolvedSearchParams.return_to || ''

  if (!permissions.canManageClients) {
    redirect('/access-denied')
  }

  async function handleSubmit(formData: FormData) {
    'use server'

    const { appUser, db } = await requireAuthenticatedAppUser(['admin', 'manager', 'accountant'])
    const permissions = getRolePermissions(appUser.role)

    if (!permissions.canManageClients) {
      redirect('/access-denied')
    }

    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const phone = formData.get('phone') as string
    const address = formData.get('address') as string
    const emiratesId = formData.get('emirates_id') as string
    const trnNumber = formData.get('trn_number') as string
    const notes = formData.get('notes') as string

    if (!name || !phone) {
      return
    }

    const client = await createClient({
      name,
      email: email || null,
      phone,
      address: address || null,
      emirates_id: emiratesId || null,
      trn_number: trnNumber || null,
      notes: notes || null,
    }, db)

    if (client) {
      if (returnTo) {
        const nextUrl = new URL(returnTo, 'http://localhost')
        nextUrl.searchParams.set('client_id', client.id)
        redirect(`${nextUrl.pathname}${nextUrl.search}`)
      }

      redirect('/clients')
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
          <Link href={returnTo || '/clients'} className="text-sm text-slate-600 hover:text-slate-900">
            ← Back
          </Link>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">New Client</h2>
          <p className="mt-1 text-sm text-slate-600">Add a new client to the system</p>

          <form action={handleSubmit} className="mt-6 space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-900">Client Name *</label>
              <input
                type="text"
                name="name"
                id="name"
                required
                placeholder="e.g., Ahmed Al-Rashid"
                className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-900">Email</label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  placeholder="client@example.com"
                  className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-slate-900">Phone *</label>
                <input
                  type="tel"
                  name="phone"
                  id="phone"
                  required
                  placeholder="+971 50 123 4567"
                  className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-slate-900">Address</label>
              <textarea
                name="address"
                id="address"
                rows={2}
                placeholder="Full address..."
                className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="emirates_id" className="block text-sm font-medium text-slate-900">Emirates ID</label>
                <input
                  type="text"
                  name="emirates_id"
                  id="emirates_id"
                  placeholder="784-XXXX-XXXXXXX-X"
                  className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="trn_number" className="block text-sm font-medium text-slate-900">TRN Number</label>
                <input
                  type="text"
                  name="trn_number"
                  id="trn_number"
                  placeholder="Tax Registration Number"
                  className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-slate-900">Notes</label>
              <textarea
                name="notes"
                id="notes"
                rows={2}
                placeholder="Any additional information..."
                className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Create Client
              </button>
              <Link
                href={returnTo || '/clients'}
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
