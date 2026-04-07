import { supabase, type MaybeRelated, type QueryClient, unwrapRelated } from '@/lib/supabase'

export type ExpenseCategory =
  | 'Labor'
  | 'Transport'
  | 'Site Maintenance'
  | 'Fuel'
  | 'Tools & Equipment'
  | 'Permits & Fees'
  | 'Misc'

export type ProjectExpense = {
  id: string
  expense_date: string
  project_id: string
  project_name?: string
  category: ExpenseCategory
  description: string
  amount: number
  paid_to: string | null
  payment_method: string | null
  receipt_reference: string | null
  notes: string | null
  created_at: string
}

export type CreateExpenseInput = Omit<ProjectExpense, 'id' | 'created_at' | 'project_name'>

type ExpenseRow = ProjectExpense & {
  projects: MaybeRelated<{ name: string }>
}

export async function getExpenses(
  queryClient: QueryClient = supabase,
  filters?: { projectId?: string; category?: ExpenseCategory; startDate?: string; endDate?: string }
): Promise<ProjectExpense[]> {
  let query = queryClient
    .from('project_expenses')
    .select(`
      *,
      projects:project_id (name)
    `)
    .order('expense_date', { ascending: false })

  if (filters?.projectId) {
    query = query.eq('project_id', filters.projectId)
  }

  if (filters?.category) {
    query = query.eq('category', filters.category)
  }

  if (filters?.startDate) {
    query = query.gte('expense_date', filters.startDate)
  }

  if (filters?.endDate) {
    query = query.lte('expense_date', filters.endDate)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching expenses:', error)
    return []
  }

  const rows = (data ?? []) as ExpenseRow[]

  return rows.map((row) => ({
    ...row,
    project_name: unwrapRelated(row.projects)?.name,
  }))
}

export async function createExpense(
  expense: CreateExpenseInput,
  queryClient: QueryClient = supabase
) {
  const { data, error } = await queryClient
    .from('project_expenses')
    .insert(expense)
    .select()
    .single()

  if (error) {
    console.error('Error creating expense:', error)
    return null
  }

  return data
}

export async function updateExpense(
  id: string,
  updates: Partial<ProjectExpense>,
  queryClient: QueryClient = supabase
) {
  const { data, error } = await queryClient
    .from('project_expenses')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating expense:', error)
    return null
  }

  return data
}

export async function deleteExpense(id: string, queryClient: QueryClient = supabase) {
  const { error } = await queryClient.from('project_expenses').delete().eq('id', id)

  if (error) {
    console.error('Error deleting expense:', error)
    return false
  }

  return true
}

export async function getExpensesSummary(
  queryClient: QueryClient = supabase,
  projectId?: string
): Promise<{ category: ExpenseCategory; total: number }[]> {
  let query = queryClient
    .from('project_expenses')
    .select('category, amount')

  if (projectId) {
    query = queryClient
      .from('project_expenses')
      .select('category, amount')
      .eq('project_id', projectId)
  }

  const { data, error } = await query

  if (error || !data) {
    return []
  }

  const summary = new Map<ExpenseCategory, number>()

  for (const row of data as ProjectExpense[]) {
    const current = summary.get(row.category) || 0
    summary.set(row.category, current + (row.amount || 0))
  }

  return Array.from(summary.entries()).map(([category, total]) => ({
    category,
    total,
  }))
}

export function getExpenseCategoryClasses(category: ExpenseCategory) {
  switch (category) {
    case 'Labor':
      return 'bg-blue-50 text-blue-700 border-blue-200'
    case 'Transport':
      return 'bg-orange-50 text-orange-700 border-orange-200'
    case 'Site Maintenance':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'Fuel':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'Tools & Equipment':
      return 'bg-purple-50 text-purple-700 border-purple-200'
    case 'Permits & Fees':
      return 'bg-sky-50 text-sky-700 border-sky-200'
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200'
  }
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Labor',
  'Transport',
  'Site Maintenance',
  'Fuel',
  'Tools & Equipment',
  'Permits & Fees',
  'Misc',
]
