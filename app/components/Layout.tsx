import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppLogo } from '@/components/app-logo'
import { requireAuthenticatedAppUser, type AppUserRecord } from '@/lib/auth'
import { getRolePermissions, type AppRole } from '@/lib/auth-constants'

interface LayoutProps {
  children: React.ReactNode
  allowedRoles?: AppRole[]
}

interface NavItemProps {
  href: string
  label: string
  active?: boolean
}

export async function Layout({ children, allowedRoles }: LayoutProps) {
  const auth = await requireAuthenticatedAppUser(allowedRoles)

  if (!auth.appUser) {
    redirect('/access-denied')
  }

  const { appUser } = auth

  return (
    <div className="min-h-full">
      <Header appUser={appUser} />
      <Navigation />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}

function Header({ appUser }: { appUser: AppUserRecord }) {
  return (
    <header className="bg-slate-900 text-white">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <AppLogo />
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-300">
              Welcome, {appUser.full_name || appUser.email}
            </span>
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
              >
                Logout
              </button>
            </form>
          </div>
        </div>
      </div>
    </header>
  )
}

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard' },
  { href: '/projects', label: 'Projects' },
  { href: '/vendors', label: 'Parties' },
  { href: '/purchases', label: 'Purchases' },
  { href: '/expenses', label: 'Expenses' },
  { href: '/invoices', label: 'Invoices' },
  { href: '/reports', label: 'Reports' },
]

function Navigation() {
  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex gap-1 py-2 overflow-x-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} />
          ))}
        </div>
      </div>
    </nav>
  )
}

function NavLink({ href, label }: Omit<NavItemProps, 'active'>) {
  return (
    <Link
      href={href}
      className="rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
    >
      {label}
    </Link>
  )
}

export function PageHeader({
  title,
  action,
}: {
  title: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      {action}
    </div>
  )
}
