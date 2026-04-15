import { getNextDocumentNumber, isUniqueConstraintError } from '@/lib/document-numbers'
import { supabase, type MaybeRelated, type QueryClient, unwrapRelated } from '@/lib/supabase'
import { calculateTotalAmount, normalizeVatAmount } from '@/lib/vat'

export const PROJECT_STATUSES = ['Pending', 'In Progress', 'On Hold', 'Completed', 'Cancelled'] as const
export const PROJECT_PHASE_STATUSES = ['Pending', 'In Progress', 'Completed', 'Delayed'] as const
export const PROJECT_WORK_TYPES = ['Direct', 'Subcontract'] as const

export type ProjectStatus = (typeof PROJECT_STATUSES)[number]
export type ProjectPhaseStatus = (typeof PROJECT_PHASE_STATUSES)[number]
export type ProjectWorkType = (typeof PROJECT_WORK_TYPES)[number]

export type ProjectSummary = {
  id: string
  project_code: string
  name: string
  client_id: string
  client_name?: string
  work_type: ProjectWorkType
  location: string
  contract_value: number
  vat_applicable: boolean
  vat_amount: number
  total_amount: number
  start_date: string | null
  expected_completion: string | null
  actual_completion: string | null
  status: ProjectStatus
  assigned_to: string | null
  created_at: string
}

export type ProjectDetail = ProjectSummary & {
  description: string | null
  notes: string | null
  phases: ProjectPhase[]
  totals: ProjectTotals | null
}

export type ProjectPhase = {
  id: string
  project_id: string
  name: string
  description: string | null
  estimated_cost: number
  actual_cost: number
  start_date: string | null
  expected_end: string | null
  actual_end: string | null
  status: ProjectPhaseStatus
  completion_percentage: number
  invoice_trigger: boolean
}

export type ProjectTotals = {
  total_purchases: number
  total_expenses: number
  total_invoiced: number
  total_received: number
  total_vendor_payments: number
  profit_margin: number
}

export type CreateProjectInput = {
  client_id: string
  name: string
  work_type: ProjectWorkType
  location: string
  description: string | null
  contract_value: number
  vat_applicable: boolean
  vat_amount: number
  start_date: string | null
  expected_completion: string | null
  actual_completion?: string | null
  status: ProjectStatus
  assigned_to: string | null
  notes?: string | null
}

export type UpdateProjectInput = {
  name: string
  work_type: ProjectWorkType
  location: string
  description: string | null
  contract_value: number
  vat_applicable: boolean
  vat_amount: number
  start_date: string | null
  expected_completion: string | null
  actual_completion: string | null
  status: ProjectStatus
  assigned_to: string | null
  notes: string | null
}

export type CreateProjectPhaseInput = {
  project_id: string
  name: string
  description: string | null
  estimated_cost: number
  actual_cost: number
  start_date: string | null
  expected_end: string | null
  actual_end: string | null
  status: ProjectPhaseStatus
  completion_percentage: number
  invoice_trigger: boolean
}

export type UpdateProjectPhaseInput = Omit<CreateProjectPhaseInput, 'project_id'>

type ProjectRelationRow = ProjectSummary & {
  contractors: MaybeRelated<{ name: string }>
}

type ProjectDetailRow = Omit<ProjectDetail, 'client_name' | 'phases' | 'totals'> & {
  contractors: MaybeRelated<{ name: string }>
}

const PROJECT_SELECT = `
  id, project_code, name, client_id, work_type, location, contract_value,
  vat_applicable, vat_amount, total_amount,
  start_date, expected_completion, actual_completion, status,
  assigned_to, created_at,
  contractors:client_id (name)
`

export type ProjectFilters = {
  status?: ProjectStatus
  clientId?: string
  searchQuery?: string
  workType?: ProjectWorkType
}

export async function getProjects(
  queryClient: QueryClient = supabase,
  filters?: ProjectFilters
): Promise<ProjectSummary[]> {
  let query = queryClient
    .from('projects')
    .select(PROJECT_SELECT)
    .order('created_at', { ascending: false })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  if (filters?.clientId) {
    query = query.eq('client_id', filters.clientId)
  }

  if (filters?.workType) {
    query = query.eq('work_type', filters.workType)
  }

  if (filters?.searchQuery) {
    const searchTerm = filters.searchQuery.trim()
    if (searchTerm) {
      query = query.or(
        `name.ilike.%${searchTerm}%,project_code.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%`
      )
    }
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching projects:', error?.message, error?.code, error?.details, error?.hint)
    return []
  }

  const rows = (data ?? []) as ProjectRelationRow[]

  return rows.map((row) => ({
    ...row,
    client_name: unwrapRelated(row.contractors)?.name,
  }))
}

export async function searchProjects(
  queryClient: QueryClient = supabase,
  searchQuery: string,
  limit: number = 10
): Promise<ProjectSummary[]> {
  const trimmedQuery = searchQuery.trim()
  if (!trimmedQuery) return []

  const { data, error } = await queryClient
    .from('projects')
    .select(PROJECT_SELECT)
    .or(`name.ilike.%${trimmedQuery}%,project_code.ilike.%${trimmedQuery}%,location.ilike.%${trimmedQuery}%`)
    .limit(limit)

  if (error) {
    console.error('Error searching projects:', error)
    return []
  }

  const rows = (data ?? []) as ProjectRelationRow[]

  return rows.map((row) => ({
    ...row,
    client_name: unwrapRelated(row.contractors)?.name,
  }))
}

export async function getProjectById(
  id: string,
  queryClient: QueryClient = supabase
): Promise<ProjectDetail | null> {
  const { data, error: projectError } = await queryClient
    .from('projects')
    .select(`
      *,
      contractors:client_id (name)
    `)
    .eq('id', id)
    .single()

  if (projectError || !data) {
    console.error('Error fetching project:', projectError)
    return null
  }

  const project = data as ProjectDetailRow

  const [{ data: phases }, totalsResponse] = await Promise.all([
    queryClient
      .from('project_phases')
      .select('*')
      .eq('project_id', id)
      .order('expected_end', { ascending: true }),
    queryClient.rpc('calculate_project_totals', { project_uuid: id }),
  ])

  const totalsData = (totalsResponse.data as ProjectTotals[] | null) ?? null

  return {
    ...project,
    client_name: unwrapRelated(project.contractors)?.name,
    phases: phases || [],
    totals: totalsData?.[0] || null,
  }
}

export async function createProject(
  project: CreateProjectInput,
  queryClient: QueryClient = supabase
) {
  const vatApplicable = project.vat_applicable
  const vatAmount = normalizeVatAmount(project.contract_value, vatApplicable, project.vat_amount)
  const totalAmount = calculateTotalAmount(project.contract_value, vatApplicable, vatAmount)

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const projectCode = await getNextDocumentNumber(
      { table: 'projects', column: 'project_code', prefix: 'POOL' },
      queryClient
    )

    const { data, error } = await queryClient
      .from('projects')
      .insert({
        ...project,
        project_code: projectCode,
        vat_applicable: vatApplicable,
        vat_amount: vatAmount,
        total_amount: totalAmount,
      })
      .select()
      .single()

    if (!error) {
      return data
    }

    if (!isUniqueConstraintError(error) || attempt === 3) {
      console.error('Error creating project:', error)
      return null
    }
  }

  return null
}

export async function updateProject(
  id: string,
  updates: Partial<UpdateProjectInput>,
  queryClient: QueryClient = supabase
) {
  const updateData: Partial<UpdateProjectInput & Pick<ProjectSummary, 'total_amount'>> = { ...updates }

  if (
    updates.contract_value !== undefined ||
    updates.vat_applicable !== undefined ||
    updates.vat_amount !== undefined
  ) {
    const { data: currentProject } = await queryClient
      .from('projects')
      .select('contract_value, vat_applicable, vat_amount')
      .eq('id', id)
      .single()

    const current = currentProject as Pick<ProjectSummary, 'contract_value' | 'vat_applicable' | 'vat_amount'> | null

    if (!current) {
      return null
    }

    const contractValue = updates.contract_value ?? current.contract_value
    const vatApplicable = updates.vat_applicable ?? current.vat_applicable
    const vatAmount = normalizeVatAmount(contractValue, vatApplicable, updates.vat_amount ?? current.vat_amount)

    updateData.contract_value = contractValue
    updateData.vat_applicable = vatApplicable
    updateData.vat_amount = vatAmount
    updateData.total_amount = calculateTotalAmount(contractValue, vatApplicable, vatAmount)
  }

  const { data, error } = await queryClient
    .from('projects')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating project:', error)
    return null
  }

  return data
}

export async function deleteProject(
  id: string,
  queryClient: QueryClient = supabase
) {
  const { error } = await queryClient
    .from('projects')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting project:', error)
    return false
  }

  return true
}

export async function createProjectPhase(
  phase: CreateProjectPhaseInput,
  queryClient: QueryClient = supabase
) {
  const { data, error } = await queryClient
    .from('project_phases')
    .insert(phase)
    .select()
    .single()

  if (error) {
    console.error('Error creating project phase:', error)
    return null
  }

  return data
}

export async function updateProjectPhase(
  id: string,
  updates: Partial<UpdateProjectPhaseInput>,
  queryClient: QueryClient = supabase
) {
  const { data, error } = await queryClient
    .from('project_phases')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating project phase:', error)
    return null
  }

  return data
}

export function getProjectStatusClasses(status: ProjectStatus) {
  switch (status) {
    case 'Completed':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'In Progress':
      return 'bg-sky-50 text-sky-700 border-sky-200'
    case 'On Hold':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'Cancelled':
      return 'bg-slate-100 text-slate-700 border-slate-200'
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200'
  }
}

export function formatCurrency(amount: number | null) {
  return `AED ${(amount || 0).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatDate(date: string | null) {
  const parsedDate = parseDateValue(date)

  if (!parsedDate) return '-'

  return parsedDate.toLocaleDateString('en-AE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function calculateDaysRemaining(expectedDate: string | null): number | null {
  const expected = parseDateValue(expectedDate)

  if (!expected) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  expected.setHours(0, 0, 0, 0)
  return Math.ceil((expected.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function toDateInputValue(date: string | null) {
  if (!date) return ''

  const trimmedDate = date.trim()

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
    return trimmedDate
  }

  const parsedDate = parseDateValue(trimmedDate)

  if (!parsedDate) return ''

  const year = parsedDate.getFullYear()
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0')
  const day = String(parsedDate.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function parseDateValue(date: string | null) {
  if (!date) return null

  const trimmedDate = date.trim()

  if (!trimmedDate) return null

  const isoMatch = trimmedDate.match(/^(\d{4})-(\d{2})-(\d{2})$/)

  if (isoMatch) {
    const [, year, month, day] = isoMatch
    return new Date(Number(year), Number(month) - 1, Number(day))
  }

  const slashMatch = trimmedDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)

  if (slashMatch) {
    const [, day, month, year] = slashMatch
    return new Date(Number(year), Number(month) - 1, Number(day))
  }

  const parsedDate = new Date(trimmedDate)

  if (Number.isNaN(parsedDate.getTime())) {
    return null
  }

  return parsedDate
}
