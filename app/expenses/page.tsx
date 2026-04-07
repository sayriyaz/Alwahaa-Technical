import type { ReactNode } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppLogo } from '@/components/app-logo'
import { requireAuthenticatedAppUser } from '@/lib/auth'
import { deleteExpense, getExpenses, getExpenseCategoryClasses, EXPENSE_CATEGORIES, updateExpense } from '@/lib/expenses'
import { getRolePermissions } from '@/lib/auth-constants'
import { formatCurrency, formatDate, getProjects } from '@/lib/projects'

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string | string[] }>
}) {
  const { appUser, db } = await requireAuthenticatedAppUser()
  const permissions = getRolePermissions(appUser.role)
  const resolvedSearchParams = await searchParams
  const editingExpenseId = Array.isArray(resolvedSearchParams.edit)
    ? resolvedSearchParams.edit[0] || ''
    : resolvedSearchParams.edit || ''
  const [expenses, projects] = await Promise.all([
    getExpenses(db),
    getProjects(db),
  ])
  const editingExpense = expenses.find((expense) => expense.id === editingExpenseId)

  async function updateExpenseDetails(formData: FormData) {
    'use server'

    const { appUser, db } = await requireAuthenticatedAppUser(['admin', 'manager', 'accountant', 'site_engineer'])
    const permissions = getRolePermissions(appUser.role)

    if (!permissions.canManageExpenses) {
      redirect('/access-denied')
    }

    const expenseId = formData.get('expense_id') as string
    const expenseDate = formData.get('expense_date') as string
    const projectId = formData.get('project_id') as string
    const category = formData.get('category') as string
    const description = formData.get('description') as string
    const amount = parseFloat(formData.get('amount') as string) || 0
    const paidTo = formData.get('paid_to') as string
    const paymentMethod = formData.get('payment_method') as string
    const receiptReference = formData.get('receipt_reference') as string
    const notes = formData.get('notes') as string
    const selectedCategory = EXPENSE_CATEGORIES.find((expenseCategory) => expenseCategory === category)

    if (!expenseId || !projectId || !description || amount <= 0 || !selectedCategory) {
      return
    }

    await updateExpense(expenseId, {
      expense_date: expenseDate || new Date().toISOString().split('T')[0],
      project_id: projectId,
      category: selectedCategory,
      description,
      amount,
      paid_to: paidTo || null,
      payment_method: paymentMethod || null,
      receipt_reference: receiptReference || null,
      notes: notes || null,
    }, db)

    redirect('/expenses')
  }

  async function deleteExpenseAction(formData: FormData) {
    'use server'

    const { appUser, db } = await requireAuthenticatedAppUser(['admin', 'manager'])
    const permissions = getRolePermissions(appUser.role)

    if (!permissions.canDeleteExpenses) {
      redirect('/access-denied')
    }

    const expenseId = formData.get('expense_id') as string

    if (!expenseId) {
      return
    }

    await deleteExpense(expenseId, db)
    redirect('/expenses')
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

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Project Expenses</h2>
          {permissions.canManageExpenses && (
            <Link
              href="/expenses/new"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              + Log Expense
            </Link>
          )}
        </div>

        {/* Category Summary */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
          {EXPENSE_CATEGORIES.map((category) => (
            <div key={category} className="rounded-lg border border-slate-200 bg-white p-3 text-center">
              <div className="text-xs text-slate-500">{category}</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {formatCurrency(expenses.filter(e => e.category === category).reduce((sum, e) => sum + e.amount, 0))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Paid To</th>
                {permissions.canManageExpenses && (
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {expenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                    {formatDate(expense.expense_date)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{expense.project_name}</td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getExpenseCategoryClasses(expense.category)}`}>
                      {expense.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{expense.description}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-900">
                    {formatCurrency(expense.amount)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{expense.paid_to || '-'}</td>
                  {permissions.canManageExpenses && (
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/expenses?edit=${expense.id}`}
                          className="font-medium text-slate-700 hover:text-slate-900"
                        >
                          Edit
                        </Link>
                        {permissions.canDeleteExpenses && (
                          <form action={deleteExpenseAction}>
                            <input type="hidden" name="expense_id" value={expense.id} />
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
                  )}
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={permissions.canManageExpenses ? 7 : 6} className="px-6 py-8 text-center text-slate-500">
                    No expenses logged yet. Start tracking project costs.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {permissions.canManageExpenses && editingExpense && (
          <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Edit Expense</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Update the logged site expense here.
                </p>
              </div>
              <Link
                href="/expenses"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </Link>
            </div>

            <form action={updateExpenseDetails} className="mt-6 space-y-6">
              <input type="hidden" name="expense_id" value={editingExpense.id} />

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Field label="Date" htmlFor="expense_date">
                  <input id="expense_date" name="expense_date" type="date" defaultValue={editingExpense.expense_date} className={inputClassName} />
                </Field>
                <Field label="Project" htmlFor="project_id">
                  <select id="project_id" name="project_id" defaultValue={editingExpense.project_id} className={inputClassName}>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Category" htmlFor="category">
                  <select id="category" name="category" defaultValue={editingExpense.category} className={inputClassName}>
                    {EXPENSE_CATEGORIES.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Amount (AED)" htmlFor="amount">
                  <input id="amount" name="amount" type="number" min="0.01" step="0.01" defaultValue={String(editingExpense.amount)} className={inputClassName} />
                </Field>
                <Field label="Paid To" htmlFor="paid_to">
                  <input id="paid_to" name="paid_to" type="text" defaultValue={editingExpense.paid_to || ''} className={inputClassName} />
                </Field>
                <Field label="Payment Method" htmlFor="payment_method">
                  <input id="payment_method" name="payment_method" type="text" defaultValue={editingExpense.payment_method || ''} className={inputClassName} />
                </Field>
                <Field label="Receipt Reference" htmlFor="receipt_reference">
                  <input id="receipt_reference" name="receipt_reference" type="text" defaultValue={editingExpense.receipt_reference || ''} className={inputClassName} />
                </Field>
              </div>

              <Field label="Description" htmlFor="description">
                <textarea id="description" name="description" rows={3} defaultValue={editingExpense.description} className={textareaClassName} />
              </Field>

              <Field label="Notes" htmlFor="notes">
                <textarea id="notes" name="notes" rows={3} defaultValue={editingExpense.notes || ''} className={textareaClassName} />
              </Field>

              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Save Expense Changes
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
