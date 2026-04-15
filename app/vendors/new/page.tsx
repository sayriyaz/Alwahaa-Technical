import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AppLogo } from '@/components/app-logo'
import { requireAuthenticatedAppUser } from '@/lib/auth'
import { createParty, ALL_PARTY_TYPES, CLIENT_PARTY_TYPES, SUPPLIER_PARTY_TYPES, type PartyType } from '@/lib/parties'

// Icons for each party type group
const PARTY_TYPE_GROUPS = [
  {
    label: 'Clients',
    description: 'Parties who award you the project',
    types: CLIENT_PARTY_TYPES,
  },
  {
    label: 'Suppliers & Subcontractors',
    description: 'Parties you buy from or subcontract to',
    types: SUPPLIER_PARTY_TYPES,
  },
] as const

export default async function NewPartyPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; return_to?: string }>
}) {
  const { appUser } = await requireAuthenticatedAppUser(['admin', 'manager', 'accountant'])

  const resolvedSearchParams = await searchParams
  const requestedType = resolvedSearchParams.type || ''
  const defaultType = (ALL_PARTY_TYPES as readonly string[]).includes(requestedType)
    ? (requestedType as PartyType)
    : 'Direct Client'
  const returnTo = resolvedSearchParams.return_to || ''

  async function handleSubmit(formData: FormData) {
    'use server'

    const { db } = await requireAuthenticatedAppUser(['admin', 'manager', 'accountant'])
    const typeValue = formData.get('party_type') as string
    const selectedType = ALL_PARTY_TYPES.find((t) => t === typeValue)

    if (!selectedType) redirect('/access-denied')

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

    if (!party) redirect('/vendors?error=create_failed')

    if (returnTo) {
      const nextUrl = new URL(returnTo, 'http://localhost')
      if (CLIENT_PARTY_TYPES.includes(selectedType as typeof CLIENT_PARTY_TYPES[number])) {
        nextUrl.searchParams.set('client_id', party.record_id)
      } else {
        nextUrl.searchParams.set('vendor_id', party.record_id)
      }
      redirect(`${nextUrl.pathname}${nextUrl.search}`)
    }

    redirect('/vendors?success=created')
  }

  return (
    <div className="min-h-screen" style={{ background: '#F5F5F7', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <style>{`
        .fi { display:block; width:100%; padding:10px 14px; font-size:15px; line-height:1.5; color:#1D1D1F; background:#fff; border:1px solid #D2D2D7; border-radius:10px; outline:none; transition:border-color 0.15s,box-shadow 0.15s; box-sizing:border-box; }
        .fi:focus { border-color:#007AFF; box-shadow:0 0 0 3px rgba(0,122,255,0.15); }
        textarea.fi { resize:vertical; }
      `}</style>

      {/* Header */}
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
                  item.href === '/vendors' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 hidden sm:block">{appUser?.full_name || appUser?.email}</span>
            <form action="/api/auth/logout" method="POST">
              <button type="submit" className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-10">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-8">
          <Link href="/vendors" className="text-sm text-blue-600 hover:text-blue-700 font-medium">Parties</Link>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><polyline points="9 18 15 12 9 6"/></svg>
          <span className="text-sm text-gray-500">New Party</span>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight" style={{ color: '#1D1D1F' }}>New Party</h1>
          <p className="mt-1.5 text-base" style={{ color: '#6E6E73' }}>Add a client, vendor, contractor, or subcontractor.</p>
        </div>

        <form action={handleSubmit} className="space-y-4">

          {/* Party Type */}
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <h2 className="text-base font-semibold mb-4" style={{ color: '#1D1D1F' }}>Party Type</h2>
            <div className="space-y-3">
              {PARTY_TYPE_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#6E6E73' }}>{group.label}</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {group.types.map((type) => (
                      <label key={type} className="flex items-center gap-2 cursor-pointer rounded-xl px-3 py-2.5" style={{ border: '1px solid #D2D2D7', background: '#FAFAFA' }}>
                        <input type="radio" name="party_type" value={type} defaultChecked={type === defaultType} className="accent-blue-600" />
                        <span className="text-sm font-medium" style={{ color: '#1D1D1F' }}>{type}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Basic Info */}
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <h2 className="text-base font-semibold mb-4" style={{ color: '#1D1D1F' }}>Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#1D1D1F' }}>Name <span className="text-red-500">*</span></label>
                <input type="text" name="name" required placeholder="e.g., Al Futtaim Group" className="fi" />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#1D1D1F' }}>Contact Person</label>
                  <input type="text" name="contact_person" placeholder="e.g., Ahmed Al Mansouri" className="fi" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#1D1D1F' }}>Phone</label>
                  <input type="text" name="phone" placeholder="+971 50 000 0000" className="fi" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#1D1D1F' }}>Email</label>
                  <input type="email" name="email" placeholder="email@company.com" className="fi" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#1D1D1F' }}>TRN Number</label>
                  <input type="text" name="trn_number" placeholder="Tax Registration No." className="fi" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#1D1D1F' }}>Address</label>
                <textarea name="address" rows={2} placeholder="Company address" className="fi" />
              </div>
            </div>
          </div>

          {/* Optional Details */}
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <h2 className="text-base font-semibold mb-4" style={{ color: '#1D1D1F' }}>Optional Details</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#1D1D1F' }}>Emirates ID <span className="text-xs" style={{ color: '#6E6E73' }}>(clients)</span></label>
                  <input type="text" name="emirates_id" placeholder="784-XXXX-XXXXXXX-X" className="fi" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#1D1D1F' }}>Payment Terms <span className="text-xs" style={{ color: '#6E6E73' }}>(suppliers)</span></label>
                  <input type="text" name="payment_terms" placeholder="e.g., Net 30" className="fi" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#1D1D1F' }}>Notes</label>
                <textarea name="notes" rows={2} placeholder="Any additional notes…" className="fi" />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button type="submit" className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: '#007AFF' }}>
              Create Party
            </button>
            <Link href={returnTo || '/vendors'} className="px-6 py-2.5 rounded-xl text-sm font-semibold" style={{ background: '#E5E5EA', color: '#1D1D1F' }}>
              Cancel
            </Link>
          </div>

        </form>
      </main>
    </div>
  )
}
