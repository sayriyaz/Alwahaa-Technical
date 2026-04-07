import Link from 'next/link'
import { Suspense } from 'react'
import { Layout } from '@/app/components/Layout'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { requireAuthenticatedAppUser } from '@/lib/auth'
import { getProjects, formatCurrency, formatDate } from '@/lib/projects'
import { getOutstandingInvoices, getInvoiceStatusClasses } from '@/lib/invoices'
import { getFinancialSummary, getMonthlyRevenue } from '@/lib/receipts'
import type { ProjectStatus } from '@/lib/projects'

export default async function DashboardPage() {
  return (
    <Layout>
      <div className="space-y-6">
        <Suspense fallback={<StatsSkeleton />}>
          <StatsSection />
        </Suspense>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Suspense fallback={<CardSkeleton />}>
            <ProjectStatusChart />
          </Suspense>

          <Suspense fallback={<CardSkeleton />}>
            <MonthlyRevenueChart />
          </Suspense>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Suspense fallback={<CardSkeleton />}>
            <OpenProjectsSection />
          </Suspense>

          <Suspense fallback={<CardSkeleton />}>
            <OutstandingInvoicesSection />
          </Suspense>
        </div>

        <QuickActions />
      </div>
    </Layout>
  )
}

async function StatsSection() {
  const auth = await requireAuthenticatedAppUser()
  const [projects, outstandingInvoices, financials] = await Promise.all([
    getProjects(auth.db),
    getOutstandingInvoices(auth.db),
    getFinancialSummary(auth.db),
  ])

  const openProjects = projects.filter(
    (project) => !['Completed', 'Cancelled'].includes(project.status)
  )

  const totalReceivables = outstandingInvoices.reduce((sum, i) => sum + i.balance_due, 0)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Open Projects"
        value={openProjects.length}
        color="blue"
        href="/projects"
        icon="📁"
      />
      <StatCard
        title="Total Receivables"
        value={formatCurrency(totalReceivables)}
        color="amber"
        href="/invoices"
        icon="💰"
      />
      <StatCard
        title="Total Received"
        value={formatCurrency(financials.totalReceived)}
        color="emerald"
        icon="✅"
      />
      <StatCard
        title={financials.vendorCredits > 0 ? 'Vendor Credit' : 'Vendor Payables'}
        value={formatCurrency(
          financials.vendorCredits > 0 ? financials.vendorCredits : financials.vendorPayables
        )}
        color={financials.vendorCredits > 0 ? 'emerald' : 'rose'}
        href="/vendors"
        icon="🏦"
      />
    </div>
  )
}

async function ProjectStatusChart() {
  const auth = await requireAuthenticatedAppUser()
  const projects = await getProjects(auth.db)

  const statusCounts = projects.reduce(
    (acc, project) => {
      acc[project.status] = (acc[project.status] || 0) + 1
      return acc
    },
    {} as Record<ProjectStatus, number>
  )

  const data = [
    { name: 'Pending', value: statusCounts['Pending'] || 0, color: '#94a3b8' },
    { name: 'In Progress', value: statusCounts['In Progress'] || 0, color: '#0ea5e9' },
    { name: 'On Hold', value: statusCounts['On Hold'] || 0, color: '#f59e0b' },
    { name: 'Completed', value: statusCounts['Completed'] || 0, color: '#10b981' },
    { name: 'Cancelled', value: statusCounts['Cancelled'] || 0, color: '#ef4444' },
  ].filter((item) => item.value > 0)

  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <Card>
      <CardHeader title="Project Status Distribution" />
      <CardBody>
        {data.length > 0 ? (
          <div className="space-y-4">
            {data.map((item) => (
              <div key={item.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-700">{item.name}</span>
                  <span className="text-sm text-slate-500">
                    {item.value} ({Math.round((item.value / total) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${(item.value / total) * 100}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-slate-500 py-8">No projects yet</p>
        )}
      </CardBody>
    </Card>
  )
}

async function MonthlyRevenueChart() {
  const auth = await requireAuthenticatedAppUser()
  const monthlyData = await getMonthlyRevenue(auth.db)

  const data = monthlyData.slice(-6)

  return (
    <Card>
      <CardHeader title="Monthly Revenue (Last 6 Months)" />
      <CardBody>
        {data.length > 0 ? (
          <div className="h-48 flex items-end gap-2">
            {data.map((month) => {
              const maxAmount = Math.max(...data.map((d) => d.amount))
              const height = maxAmount > 0 ? (month.amount / maxAmount) * 100 : 0

              return (
                <div key={month.month} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full relative">
                    <div
                      className="w-full bg-emerald-100 rounded-t transition-all hover:bg-emerald-200"
                      style={{ height: `${height}%`, minHeight: '4px' }}
                    >
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 hover:opacity-100 transition-opacity">
                        <span className="text-xs font-medium bg-slate-800 text-white px-2 py-1 rounded">
                          {formatCurrency(month.amount)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500">{month.shortMonth}</span>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-center text-slate-500 py-8">No revenue data yet</p>
        )}
      </CardBody>
    </Card>
  )
}

async function OpenProjectsSection() {
  const auth = await requireAuthenticatedAppUser()
  const projects = await getProjects(auth.db)
  const openProjects = projects
    .filter((project) => !['Completed', 'Cancelled'].includes(project.status))
    .slice(0, 5)

  return (
    <Card>
      <CardHeader
        title="Open Projects"
        action={
          <Link
            href="/projects/new"
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            + New
          </Link>
        }
      />
      <div className="divide-y divide-slate-100">
        {openProjects.length > 0 ? (
          openProjects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
            >
              <div className="min-w-0">
                <p className="font-medium text-slate-900 truncate">{project.name}</p>
                <p className="text-sm text-slate-500 truncate">
                  {project.client_name} · {formatDate(project.expected_completion)}
                </p>
              </div>
              <span
                className={`ml-4 inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                  project.status === 'In Progress'
                    ? 'bg-sky-50 text-sky-700'
                    : project.status === 'On Hold'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-slate-100 text-slate-700'
                }`}
              >
                {project.status}
              </span>
            </Link>
          ))
        ) : (
          <p className="px-6 py-8 text-center text-slate-500">No open projects</p>
        )}
      </div>
    </Card>
  )
}

async function OutstandingInvoicesSection() {
  const auth = await requireAuthenticatedAppUser()
  const invoices = await getOutstandingInvoices(auth.db)
  const topInvoices = invoices.slice(0, 5)

  return (
    <Card>
      <CardHeader
        title="Outstanding Invoices"
        action={
          <Link
            href="/invoices/new"
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            + New
          </Link>
        }
      />
      <div className="divide-y divide-slate-100">
        {topInvoices.length > 0 ? (
          topInvoices.map((invoice) => (
            <Link
              key={invoice.id}
              href={`/invoices/${invoice.id}`}
              className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
            >
              <div className="min-w-0">
                <p className="font-medium text-slate-900 truncate">{invoice.invoice_number}</p>
                <p className="text-sm text-slate-500 truncate">
                  {invoice.client_name} · Due {formatDate(invoice.due_date)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium text-slate-900">{formatCurrency(invoice.balance_due)}</p>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    invoice.status === 'Overdue'
                      ? 'bg-rose-50 text-rose-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {invoice.status}
                </span>
              </div>
            </Link>
          ))
        ) : (
          <p className="px-6 py-8 text-center text-slate-500">No outstanding invoices</p>
        )}
      </div>
    </Card>
  )
}

function QuickActions() {
  const actions = [
    { href: '/projects/new', label: 'New Project', icon: '📝' },
    { href: '/purchases/new', label: 'New PO', icon: '📦' },
    { href: '/expenses/new', label: 'Log Expense', icon: '💰' },
    { href: '/invoices/new', label: 'New Invoice', icon: '📄' },
    { href: '/receipts/new', label: 'Record Payment', icon: '💳' },
    { href: '/vendor-payments/new', label: 'Pay Vendor', icon: '🏦' },
  ]

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Quick Actions</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-center transition hover:border-slate-300 hover:shadow-sm"
          >
            <span className="text-2xl">{action.icon}</span>
            <span className="text-sm font-medium text-slate-700">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
      ))}
    </div>
  )
}

function CardSkeleton() {
  return <div className="h-80 bg-slate-100 rounded-xl animate-pulse" />
}
