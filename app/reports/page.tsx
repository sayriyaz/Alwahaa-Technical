import Link from 'next/link'
import { AppLogo } from '@/components/app-logo'
import { requireAuthenticatedAppUser } from '@/lib/auth'
import { getRolePermissions } from '@/lib/auth-constants'
import { getFinancialSummary } from '@/lib/receipts'
import { getProjects, formatCurrency } from '@/lib/projects'
import { getOutstandingInvoices } from '@/lib/invoices'

export default async function ReportsPage() {
  const { appUser, db } = await requireAuthenticatedAppUser()
  const permissions = getRolePermissions(appUser.role)

  if (!permissions.canViewReports) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-900">Access Denied</h2>
          <p className="mt-2 text-slate-600">You don&apos;t have permission to view reports.</p>
          <Link href="/" className="mt-4 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            Go Home
          </Link>
        </div>
      </div>
    )
  }

  const [financials, projects, outstandingInvoices] = await Promise.all([
    getFinancialSummary(db),
    getProjects(db),
    getOutstandingInvoices(db),
  ])

  const activeProjects = projects.filter(p => p.status === 'In Progress')
  const totalContractValue = projects.reduce((sum, p) => sum + p.contract_value, 0)
  const totalContractVat = projects.reduce((sum, p) => sum + (p.vat_applicable ? p.vat_amount : 0), 0)
  const totalContractAmount = projects.reduce((sum, p) => sum + p.total_amount, 0)

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
            <NavItem href="/reports" label="Reports" active />
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-slate-900">Financial Overview</h2>

        {/* Summary Cards */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard title="Total Contract Value" value={formatCurrency(totalContractValue)} color="blue" />
          <SummaryCard title="Total Contract VAT" value={formatCurrency(totalContractVat)} color="sky" />
          <SummaryCard title="Total Contract Amount" value={formatCurrency(totalContractAmount)} color="indigo" />
          <SummaryCard title="Total Invoiced" value={formatCurrency(financials.totalInvoiced)} color="sky" />
          <SummaryCard title="Total Received" value={formatCurrency(financials.totalReceived)} color="emerald" />
          <SummaryCard title="Client Receivables" value={formatCurrency(financials.clientReceivables)} color="amber" />
          <SummaryCard title="Total Purchases" value={formatCurrency(financials.totalPurchases)} color="rose" />
          <SummaryCard title="Total Expenses" value={formatCurrency(financials.totalExpenses)} color="orange" />
          <SummaryCard
            title={financials.vendorCredits > 0 ? 'Vendor Credit' : 'Vendor Payables'}
            value={formatCurrency(financials.vendorCredits > 0 ? financials.vendorCredits : financials.vendorPayables)}
            color={financials.vendorCredits > 0 ? 'emerald' : 'rose'}
          />
          <SummaryCard title="Net Position" value={formatCurrency(financials.totalReceived - financials.totalVendorPayments - financials.totalExpenses)} color="indigo" />
        </div>

        {/* Project Summary */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-slate-900">Project Summary</h3>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="text-sm text-slate-500">Total Projects</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{projects.length}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="text-sm text-slate-500">Active</div>
              <div className="mt-1 text-2xl font-bold text-emerald-600">{activeProjects.length}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="text-sm text-slate-500">Pending</div>
              <div className="mt-1 text-2xl font-bold text-amber-600">{projects.filter(p => p.status === 'Pending').length}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="text-sm text-slate-500">Completed</div>
              <div className="mt-1 text-2xl font-bold text-slate-600">{projects.filter(p => p.status === 'Completed').length}</div>
            </div>
          </div>
        </div>

        {/* Outstanding Invoices */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-slate-900">Outstanding Invoices</h3>
          <div className="mt-4 rounded-xl border border-slate-200 bg-white shadow-sm">
            {outstandingInvoices.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No outstanding invoices</div>
            ) : (
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Invoice</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Amount Due</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Due Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {outstandingInvoices.slice(0, 10).map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-900">{invoice.invoice_number}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{invoice.client_name}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-rose-600">{formatCurrency(invoice.balance_due)}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{invoice.due_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
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

function SummaryCard({ title, value, color }: { title: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    sky: 'bg-sky-50 border-sky-200 text-sky-900',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    amber: 'bg-amber-50 border-amber-200 text-amber-900',
    rose: 'bg-rose-50 border-rose-200 text-rose-900',
    orange: 'bg-orange-50 border-orange-200 text-orange-900',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-900',
  }

  return (
    <div className={`rounded-xl border p-4 ${colors[color] || colors.blue}`}>
      <div className="text-sm opacity-70">{title}</div>
      <div className="mt-1 text-xl font-bold">{value}</div>
    </div>
  )
}
