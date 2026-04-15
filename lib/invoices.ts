import { getNextDocumentNumber, isUniqueConstraintError } from '@/lib/document-numbers'
import { supabase, type MaybeRelated, type QueryClient, unwrapRelated } from '@/lib/supabase'
import { calculateTotalAmount, normalizeVatAmount } from '@/lib/vat'

export const INVOICE_STATUSES = ['Draft', 'Sent', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled'] as const
export const EDITABLE_INVOICE_STATUSES = ['Draft', 'Sent', 'Cancelled'] as const

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

export type InvoiceItem = {
  id: string
  description: string
  quantity: number
  unit: string | null
  unit_price: number
  total_price: number
  vat_applicable: boolean
  vat_rate: number
  vat_amount: number
}

export type InvoiceSummary = {
  id: string
  invoice_number: string
  project_id: string
  project_name?: string
  project_code?: string
  client_id: string
  client_name?: string
  client_address?: string | null
  invoice_date: string
  due_date: string | null
  description: string | null
  subtotal: number
  vat_applicable: boolean
  vat_amount: number
  total_amount: number
  amount_paid: number
  balance_due: number
  status: InvoiceStatus
  created_at: string
}

export type InvoiceDetail = InvoiceSummary & {
  phase_id: string | null
  phase_name?: string
  notes: string | null
  items: InvoiceItem[]
}

export type CreateInvoiceInput = {
  invoice_number: string
  project_id: string
  client_id: string
  invoice_date: string
  due_date: string | null
  phase_id: string | null
  description: string | null
  vat_applicable: boolean
  vat_amount: number
  status?: InvoiceStatus
  notes: string | null
}

export type UpdateInvoiceInput = {
  due_date: string | null
  description: string | null
  notes: string | null
  phase_id: string | null
  subtotal?: number
  vat_applicable: boolean
  vat_amount: number
  total_amount?: number
  status: (typeof EDITABLE_INVOICE_STATUSES)[number]
}

type InvoiceListRow = InvoiceSummary & {
  projects: MaybeRelated<{ name: string; project_code: string }>
  contractors: MaybeRelated<{ name: string; address: string | null }>
}

type InvoiceDetailRow = Omit<InvoiceDetail, 'project_name' | 'client_name' | 'phase_name' | 'items'> & {
  projects: MaybeRelated<{ name: string; project_code: string }>
  contractors: MaybeRelated<{ name: string; address: string | null }>
  project_phases: MaybeRelated<{ name: string }>
}

export async function getInvoices(
  queryClient: QueryClient = supabase,
  filters?: { projectId?: string; clientId?: string; status?: InvoiceStatus; overdue?: boolean }
): Promise<InvoiceSummary[]> {
  let query = queryClient
    .from('invoices')
    .select(`
      id, invoice_number, project_id, client_id, invoice_date, due_date,
      description, subtotal, vat_applicable, vat_amount, total_amount,
      amount_paid, balance_due, status, created_at,
      projects:project_id (name, project_code),
      contractors:client_id (name, address)
    `)
    .order('created_at', { ascending: false })

  if (filters?.projectId) {
    query = query.eq('project_id', filters.projectId)
  }

  if (filters?.clientId) {
    query = query.eq('client_id', filters.clientId)
  }

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  if (filters?.overdue) {
    const today = new Date().toISOString().split('T')[0]
    query = query.lt('due_date', today).not('status', 'in', '("Paid","Cancelled")')
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching invoices:', error.message, error.code, error.details, error.hint)
    return []
  }

  const rows = (data ?? []) as InvoiceListRow[]

  return rows.map((row) => ({
    ...row,
    project_name: unwrapRelated(row.projects)?.name,
    project_code: unwrapRelated(row.projects)?.project_code,
    client_name: unwrapRelated(row.contractors)?.name,
    client_address: unwrapRelated(row.contractors)?.address,
  }))
}

export async function getInvoiceById(
  id: string,
  queryClient: QueryClient = supabase
): Promise<InvoiceDetail | null> {
  const { data, error: invoiceError } = await queryClient
    .from('invoices')
    .select(`
      *,
      projects:project_id (name, project_code),
      contractors:client_id (name, address),
      project_phases:phase_id (name)
    `)
    .eq('id', id)
    .single()

  if (invoiceError || !data) {
    console.error('Error fetching invoice:', invoiceError)
    return null
  }

  const invoice = data as InvoiceDetailRow

  const { data: items, error: itemsError } = await queryClient
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', id)

  if (itemsError) {
    console.error('Error fetching invoice items:', itemsError)
  }

  return {
    ...invoice,
    project_name: unwrapRelated(invoice.projects)?.name,
    project_code: unwrapRelated(invoice.projects)?.project_code,
    client_name: unwrapRelated(invoice.contractors)?.name,
    client_address: unwrapRelated(invoice.contractors)?.address,
    phase_name: unwrapRelated(invoice.project_phases)?.name,
    items: items || [],
  }
}

export async function createInvoice(
  invoice: CreateInvoiceInput,
  items: Omit<InvoiceItem, 'id' | 'created_at'>[],
  queryClient: QueryClient = supabase
) {
  const { data: projectData, error: projectError } = await queryClient
    .from('projects')
    .select('client_id')
    .eq('id', invoice.project_id)
    .single()

  const project = projectData as { client_id: string } | null

  if (projectError || !project) {
    console.error('Error validating invoice project:', projectError)
    return null
  }

  if (project.client_id !== invoice.client_id) {
    console.error('Invoice client does not match project client.', {
      projectId: invoice.project_id,
      invoiceClientId: invoice.client_id,
      projectClientId: project.client_id,
    })
    return null
  }

  // Calculate totals from per-item VAT
  const subtotal = items.reduce((sum, item) => sum + (item.total_price || 0), 0)
  const vatAmount = items.reduce((sum, item) => sum + (item.vat_amount || 0), 0)
  const vatApplicable = vatAmount > 0 || invoice.vat_applicable
  const totalAmount = subtotal + vatAmount

  let createdInvoice: { id: string } & Record<string, unknown> | null = null

  const { data, error } = await queryClient
    .from('invoices')
    .insert({
      ...invoice,
      invoice_number: invoice.invoice_number,
      subtotal,
      vat_applicable: vatApplicable,
      vat_amount: vatAmount,
      total_amount: totalAmount,
      amount_paid: 0,
      balance_due: totalAmount,
      status: invoice.status ?? 'Sent',
    })
    .select()
    .single()

  if (!error && data) {
    createdInvoice = data
  } else {
    if (isUniqueConstraintError(error)) {
      return { error: 'duplicate_number' } as const
    }
    console.error('Error creating invoice:', error)
    return null
  }

  if (!createdInvoice) {
    return null
  }

  // Insert items
  if (items.length > 0) {
    const { error: itemsError } = await queryClient
      .from('invoice_items')
      .insert(items.map((item) => ({ ...item, invoice_id: createdInvoice.id })))

    if (itemsError) {
      console.error('Error creating invoice items:', itemsError)
      const { error: rollbackError } = await queryClient
        .from('invoices')
        .delete()
        .eq('id', createdInvoice.id)

      if (rollbackError) {
        console.error('Error rolling back invoice after item failure:', rollbackError)
      }

      return null
    }
  }

  return createdInvoice
}

export async function updateInvoiceStatus(
  id: string,
  updates: Partial<Pick<InvoiceSummary, 'status' | 'amount_paid'>>,
  queryClient: QueryClient = supabase
) {
  const { data: currentData } = await queryClient
    .from('invoices')
    .select('total_amount')
    .eq('id', id)
    .single()

  const current = currentData as { total_amount: number } | null

  if (!current) return null

  const updateData: Partial<Pick<InvoiceSummary, 'status' | 'amount_paid' | 'balance_due'>> = { ...updates }

  if (updates.amount_paid !== undefined) {
    updateData.balance_due = current.total_amount - updates.amount_paid

    // Auto-update status based on payment
    if (updates.amount_paid >= current.total_amount) {
      updateData.status = 'Paid'
    } else if (updates.amount_paid > 0) {
      updateData.status = 'Partially Paid'
    }
  }

  const { data: updatedInvoice, error } = await queryClient
    .from('invoices')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating invoice:', error)
    return null
  }

  return updatedInvoice
}

export async function updateInvoice(
  id: string,
  updates: Partial<UpdateInvoiceInput>,
  queryClient: QueryClient = supabase
) {
  const { data: currentInvoice } = await queryClient
    .from('invoices')
    .select('subtotal, vat_applicable, vat_amount, amount_paid, status')
    .eq('id', id)
    .single()

  const current = currentInvoice as Pick<InvoiceSummary, 'subtotal' | 'vat_applicable' | 'vat_amount' | 'amount_paid' | 'status'> | null

  if (!current) {
    return null
  }

  const updateData: Partial<
    Pick<InvoiceSummary, 'subtotal' | 'total_amount' | 'balance_due' | 'status' | 'vat_applicable' | 'vat_amount'> &
    Pick<UpdateInvoiceInput, 'due_date' | 'description' | 'notes' | 'phase_id'>
  > = { ...updates }

  if (updates.total_amount !== undefined) {
    // Totals already computed from items by caller
    const subtotal = updates.subtotal ?? current.subtotal
    const totalAmount = updates.total_amount
    const balanceDue = Math.max(totalAmount - current.amount_paid, 0)
    updateData.subtotal = subtotal
    updateData.vat_applicable = updates.vat_applicable
    updateData.vat_amount = updates.vat_amount
    updateData.total_amount = totalAmount
    updateData.balance_due = balanceDue
    if (current.amount_paid > 0) {
      updateData.status = balanceDue === 0 ? 'Paid' : 'Partially Paid'
    }
  } else if (updates.vat_amount !== undefined || updates.vat_applicable !== undefined) {
    const vatApplicable = updates.vat_applicable ?? current.vat_applicable
    const vatAmount = normalizeVatAmount(current.subtotal, vatApplicable, updates.vat_amount ?? current.vat_amount)
    const totalAmount = calculateTotalAmount(current.subtotal, vatApplicable, vatAmount)
    const balanceDue = Math.max(totalAmount - current.amount_paid, 0)

    updateData.vat_applicable = vatApplicable
    updateData.vat_amount = vatAmount
    updateData.total_amount = totalAmount
    updateData.balance_due = balanceDue

    if (current.amount_paid > 0) {
      updateData.status = balanceDue === 0 ? 'Paid' : 'Partially Paid'
    } else if (!updates.status) {
      updateData.status = current.status
    }
  }

  const { data, error } = await queryClient
    .from('invoices')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating invoice:', error)
    return null
  }

  return data
}

export type InvoiceItemInput = {
  description: string
  quantity: number
  unit: string | null
  unit_price: number
  total_price: number
  vat_applicable: boolean
  vat_rate: number
  vat_amount: number
}

export async function updateInvoiceItems(
  invoiceId: string,
  items: InvoiceItemInput[],
  queryClient: QueryClient = supabase
) {
  await queryClient.from('invoice_items').delete().eq('invoice_id', invoiceId)

  if (items.length === 0) return

  const { error } = await queryClient.from('invoice_items').insert(
    items.map((item) => ({ ...item, invoice_id: invoiceId }))
  )

  if (error) {
    console.error('Error updating invoice items:', error)
  }
}

export async function deleteInvoice(
  id: string,
  queryClient: QueryClient = supabase
) {
  const { error } = await queryClient
    .from('invoices')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting invoice:', error)
    return false
  }

  return true
}

export function getInvoiceStatusClasses(status: InvoiceStatus) {
  switch (status) {
    case 'Paid':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'Partially Paid':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'Sent':
      return 'bg-sky-50 text-sky-700 border-sky-200'
    case 'Overdue':
      return 'bg-rose-50 text-rose-700 border-rose-200'
    case 'Cancelled':
      return 'bg-slate-100 text-slate-700 border-slate-200'
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200'
  }
}

export async function getOutstandingInvoices(
  queryClient: QueryClient = supabase
): Promise<InvoiceSummary[]> {
  const { data, error } = await queryClient
    .from('invoices')
    .select(`
      *,
      projects:project_id (name, project_code),
      contractors:client_id (name)
    `)
    .gt('balance_due', 0)
    .not('status', 'in', '("Paid","Cancelled")')
    .order('due_date', { ascending: true })

  if (error) {
    console.error('Error fetching outstanding invoices:', error)
    return []
  }

  const rows = (data ?? []) as InvoiceListRow[]

  return rows.map((row) => ({
    ...row,
    project_name: unwrapRelated(row.projects)?.name,
    project_code: unwrapRelated(row.projects)?.project_code,
    client_name: unwrapRelated(row.contractors)?.name,
  }))
}
