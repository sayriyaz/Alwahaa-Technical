import type { ReactNode } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppLogo } from '@/components/app-logo'
import { requireAuthenticatedAppUser } from '@/lib/auth'
import { getRolePermissions } from '@/lib/auth-constants'
import { deleteClient, getClients, updateClient } from '@/lib/clients'

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string | string[] }>
}) {
  const { appUser, db } = await requireAuthenticatedAppUser()
  const permissions = getRolePermissions(appUser.role)
  const resolvedSearchParams = await searchParams
  const editingClientId = Array.isArray(resolvedSearchParams.edit)
    ? resolvedSearchParams.edit[0] || ''
    : resolvedSearchParams.edit || ''
  const clients = await getClients(db)
  const editingClient = clients.find((client) => client.id === editingClientId)

  if (!permissions.canManageClients) {
    redirect('/access-denied')
  }

  async function updateClientDetails(formData: FormData) {
    'use server'

    const { appUser, db } = await requireAuthenticatedAppUser(['admin', 'manager', 'accountant'])
    const permissions = getRolePermissions(appUser.role)

    if (!permissions.canManageClients) {
      redirect('/access-denied')
    }

    const clientId = formData.get('client_id') as string
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const phone = formData.get('phone') as string
    const address = formData.get('address') as string
    const emiratesId = formData.get('emirates_id') as string
    const trnNumber = formData.get('trn_number') as string
    const notes = formData.get('notes') as string

    if (!clientId || !name || !phone) {
      return
    }

    await updateClient(clientId, {
      name,
      email: email || null,
      phone,
      address: address || null,
      emirates_id: emiratesId || null,
      trn_number: trnNumber || null,
      notes: notes || null,
    }, db)

    redirect('/clients')
  }

  async function deleteClientAction(formData: FormData) {
    'use server'

    const { appUser, db } = await requireAuthenticatedAppUser(['admin', 'manager', 'accountant'])
    const permissions = getRolePermissions(appUser.role)

    if (!permissions.canManageClients) {
      redirect('/access-denied')
    }

    const clientId = formData.get('client_id') as string

    if (!clientId) {
      return
    }

    await deleteClient(clientId, db)
    redirect('/clients')
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

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Clients</h2>
          <Link
            href="/clients/new"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            + New Client
          </Link>
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Emirates ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">TRN</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{client.name}</div>
                    {client.address && <div className="text-xs text-slate-500">{client.address}</div>}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <div>{client.phone}</div>
                    {client.email && <div className="text-xs">{client.email}</div>}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{client.emirates_id || '-'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{client.trn_number || '-'}</td>
                  <td className="px-6 py-4 text-right text-sm">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/clients?edit=${client.id}`}
                        className="font-medium text-slate-700 hover:text-slate-900"
                      >
                        Edit
                      </Link>
                      <form action={deleteClientAction}>
                        <input type="hidden" name="client_id" value={client.id} />
                        <button
                          type="submit"
                          className="font-medium text-rose-600 hover:text-rose-700"
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No clients found. Add clients before creating projects or invoices.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {editingClient && (
          <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Edit Client</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Update client contact and billing details here.
                </p>
              </div>
              <Link
                href="/clients"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </Link>
            </div>

            <form action={updateClientDetails} className="mt-6 space-y-6">
              <input type="hidden" name="client_id" value={editingClient.id} />

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Client Name" htmlFor="name">
                  <input id="name" name="name" type="text" required defaultValue={editingClient.name} className={inputClassName} />
                </Field>
                <Field label="Phone" htmlFor="phone">
                  <input id="phone" name="phone" type="tel" required defaultValue={editingClient.phone} className={inputClassName} />
                </Field>
                <Field label="Email" htmlFor="email">
                  <input id="email" name="email" type="email" defaultValue={editingClient.email || ''} className={inputClassName} />
                </Field>
                <Field label="Emirates ID" htmlFor="emirates_id">
                  <input id="emirates_id" name="emirates_id" type="text" defaultValue={editingClient.emirates_id || ''} className={inputClassName} />
                </Field>
                <Field label="TRN Number" htmlFor="trn_number">
                  <input id="trn_number" name="trn_number" type="text" defaultValue={editingClient.trn_number || ''} className={inputClassName} />
                </Field>
              </div>

              <Field label="Address" htmlFor="address">
                <textarea id="address" name="address" rows={3} defaultValue={editingClient.address || ''} className={textareaClassName} />
              </Field>

              <Field label="Notes" htmlFor="notes">
                <textarea id="notes" name="notes" rows={3} defaultValue={editingClient.notes || ''} className={textareaClassName} />
              </Field>

              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Save Client Changes
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

const inputClassName = 'mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm'
const textareaClassName = 'mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm'

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
