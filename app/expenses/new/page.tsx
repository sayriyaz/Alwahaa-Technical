import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AppLogo } from '@/components/app-logo'
import { requireAuthenticatedAppUser } from '@/lib/auth'
import { getRolePermissions } from '@/lib/auth-constants'
import { createExpense, EXPENSE_CATEGORIES } from '@/lib/expenses'
import { getProjects } from '@/lib/projects'

export default async function NewExpensePage() {
  const { appUser, db } = await requireAuthenticatedAppUser(['admin', 'manager', 'accountant', 'site_engineer'])
  const permissions = getRolePermissions(appUser.role)

  if (!permissions.canManageExpenses) {
    redirect('/access-denied')
  }

  const projects = await getProjects(db)

  async function handleSubmit(formData: FormData) {
    'use server'

    const { appUser, db } = await requireAuthenticatedAppUser(['admin', 'manager', 'accountant', 'site_engineer'])
    const permissions = getRolePermissions(appUser.role)

    if (!permissions.canManageExpenses) {
      redirect('/access-denied')
    }

    const projectId = formData.get('project_id') as string
    const category = formData.get('category') as string
    const description = formData.get('description') as string
    const amount = parseFloat(formData.get('amount') as string) || 0
    const paidTo = formData.get('paid_to') as string
    const paymentMethod = formData.get('payment_method') as string
    const receiptReference = formData.get('receipt_reference') as string
    const expenseDate = formData.get('expense_date') as string
    const notes = formData.get('notes') as string
    const selectedCategory = EXPENSE_CATEGORIES.find((value) => value === category)

    if (!projectId || !selectedCategory || !description || amount <= 0) {
      return
    }

    const expense = await createExpense({
      project_id: projectId,
      category: selectedCategory,
      description,
      amount,
      paid_to: paidTo || null,
      payment_method: paymentMethod || null,
      receipt_reference: receiptReference || null,
      expense_date: expenseDate || new Date().toISOString().split('T')[0],
      notes: notes || null,
    }, db)

    if (expense) {
      redirect('/expenses')
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
            <NavItem href="/expenses" label="Expenses" active />
            <NavItem href="/invoices" label="Invoices" />
            <NavItem href="/reports" label="Reports" />
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href="/expenses" className="text-sm text-slate-600 hover:text-slate-900">← Back to Expenses</Link>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Log Expense</h2>
          <p className="mt-1 text-sm text-slate-600">Record a project expense</p>

          <form action={handleSubmit} className="mt-6 space-y-6">
            <div>
              <label htmlFor="project_id" className="block text-sm font-medium text-slate-900">Project *</label>
              <select
                name="project_id"
                id="project_id"
                required
                className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
              >
                <option value="">Select a project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-slate-900">Category *</label>
                <select
                  name="category"
                  id="category"
                  required
                  className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
                >
                  <option value="">Select category</option>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-slate-900">Amount (AED) *</label>
                <input
                  type="number"
                  name="amount"
                  id="amount"
                  required
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-slate-900">Description *</label>
              <textarea
                name="description"
                id="description"
                required
                rows={2}
                placeholder="What was this expense for?"
                className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="paid_to" className="block text-sm font-medium text-slate-900">Paid To</label>
                <input
                  type="text"
                  name="paid_to"
                  id="paid_to"
                  placeholder="e.g., Worker name, company"
                  className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="payment_method" className="block text-sm font-medium text-slate-900">Payment Method</label>
                <select
                  name="payment_method"
                  id="payment_method"
                  className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
                >
                  <option value="">Select method</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Check">Check</option>
                  <option value="Credit Card">Credit Card</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="expense_date" className="block text-sm font-medium text-slate-900">Date</label>
                <input
                  type="date"
                  name="expense_date"
                  id="expense_date"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="receipt_reference" className="block text-sm font-medium text-slate-900">Receipt Ref #</label>
                <input
                  type="text"
                  name="receipt_reference"
                  id="receipt_reference"
                  placeholder="Receipt or invoice number"
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
                placeholder="Additional details..."
                className="mt-1 block w-full rounded-lg border-slate-300 px-3 py-2 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Log Expense
              </button>
              <Link
                href="/expenses"
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
