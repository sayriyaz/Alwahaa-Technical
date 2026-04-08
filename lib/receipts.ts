import { getNextDocumentNumber, isUniqueConstraintError } from '@/lib/document-numbers'
import { supabase, type MaybeRelated, type QueryClient, unwrapRelated } from '@/lib/supabase'
import { normalizeVatAmount } from '@/lib/vat'

export const RECEIPT_PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Cheque', 'Credit Card'] as const
export const VENDOR_PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Cheque'] as const

export type ReceiptPaymentMethod = (typeof RECEIPT_PAYMENT_METHODS)[number]
export type VendorPaymentMethod = (typeof VENDOR_PAYMENT_METHODS)[number]

export type Receipt = {
  id: string
  receipt_number: string
  invoice_id: string
  invoice_number?: string
  project_id: string
  project_name?: string
  client_id: string
  client_name?: string
  receipt_date: string
  amount: number
  vat_applicable: boolean
  vat_amount: number
  payment_method: ReceiptPaymentMethod
  reference_number: string | null
  bank_name: string | null
  notes: string | null
  created_at: string
}

export type VendorPayment = {
  id: string
  payment_number: string
  vendor_id: string
  vendor_name?: string
  purchase_order_id: string | null
  po_number?: string
  project_id: string | null
  project_name?: string
  payment_date: string
  amount: number
  vat_applicable: boolean
  vat_amount: number
  payment_method: VendorPaymentMethod
  reference_number: string | null
  bank_name: string | null
  notes: string | null
  created_at: string
}

export type CreateReceiptInput = Omit<
  Receipt,
  'id' | 'created_at' | 'receipt_number' | 'invoice_number' | 'project_name' | 'client_name'
>

export type UpdateReceiptInput = Pick<
  Receipt,
  'receipt_date' | 'amount' | 'vat_applicable' | 'vat_amount' | 'payment_method' | 'reference_number' | 'bank_name' | 'notes'
>

export type CreateVendorPaymentInput = Omit<
  VendorPayment,
  'id' | 'created_at' | 'payment_number' | 'vendor_name' | 'po_number' | 'project_name'
>

export type UpdateVendorPaymentInput = Pick<
  VendorPayment,
  'vendor_id' | 'purchase_order_id' | 'project_id' | 'payment_date' | 'amount' | 'vat_applicable' | 'vat_amount' | 'payment_method' | 'reference_number' | 'bank_name' | 'notes'
>

type ReceiptRow = Receipt & {
  invoices: MaybeRelated<{ invoice_number: string }>
  projects: MaybeRelated<{ name: string }>
  clients: MaybeRelated<{ name: string }>
}

type VendorPaymentRow = VendorPayment & {
  vendors: MaybeRelated<{ name: string }>
  purchase_orders: MaybeRelated<{ po_number: string }>
  projects: MaybeRelated<{ name: string }>
}

async function syncInvoiceReceiptState(
  invoiceId: string,
  queryClient: QueryClient
) {
  const [{ data: invoiceData }, { data: receiptRows }] = await Promise.all([
    queryClient
      .from('invoices')
      .select('total_amount, status')
      .eq('id', invoiceId)
      .single(),
    queryClient
      .from('receipts')
      .select('amount, vat_amount, vat_applicable')
      .eq('invoice_id', invoiceId),
  ])

  const invoice = invoiceData as { total_amount: number; status: string } | null

  if (!invoice) {
    return
  }

  const amountPaid = (receiptRows || []).reduce((sum, receipt) => sum + (receipt.amount || 0) + (receipt.vat_applicable ? (receipt.vat_amount || 0) : 0), 0)
  const balanceDue = Math.max((invoice.total_amount || 0) - amountPaid, 0)
  const status =
    invoice.status === 'Cancelled'
      ? 'Cancelled'
      : amountPaid <= 0
        ? 'Sent'
        : balanceDue === 0
          ? 'Paid'
          : 'Partially Paid'

  await queryClient
    .from('invoices')
    .update({
      amount_paid: amountPaid,
      balance_due: balanceDue,
      status,
    })
    .eq('id', invoiceId)
}

// Client Receipts
export async function getReceipts(
  queryClient: QueryClient = supabase,
  filters?: { invoiceId?: string; projectId?: string; clientId?: string }
): Promise<Receipt[]> {
  let query = queryClient
    .from('receipts')
    .select(`
      *,
      invoices:invoice_id (invoice_number),
      projects:project_id (name),
      clients:client_id (name)
    `)
    .order('receipt_date', { ascending: false })

  if (filters?.invoiceId) {
    query = query.eq('invoice_id', filters.invoiceId)
  }

  if (filters?.projectId) {
    query = query.eq('project_id', filters.projectId)
  }

  if (filters?.clientId) {
    query = query.eq('client_id', filters.clientId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching receipts:', error)
    return []
  }

  const rows = (data ?? []) as ReceiptRow[]

  return rows.map((row) => ({
    ...row,
    invoice_number: unwrapRelated(row.invoices)?.invoice_number,
    project_name: unwrapRelated(row.projects)?.name,
    client_name: unwrapRelated(row.clients)?.name,
  }))
}

export async function getReceiptById(
  id: string,
  queryClient: QueryClient = supabase
): Promise<Receipt | null> {
  const { data, error } = await queryClient
    .from('receipts')
    .select(`
      *,
      invoices:invoice_id (invoice_number),
      projects:project_id (name),
      clients:client_id (name)
    `)
    .eq('id', id)
    .single()

  if (error || !data) {
    console.error('Error fetching receipt:', error)
    return null
  }

  const row = data as ReceiptRow

  return {
    ...row,
    invoice_number: unwrapRelated(row.invoices)?.invoice_number,
    project_name: unwrapRelated(row.projects)?.name,
    client_name: unwrapRelated(row.clients)?.name,
  }
}

export async function createReceipt(
  receipt: CreateReceiptInput,
  queryClient: QueryClient = supabase
) {
  const vatApplicable = receipt.vat_applicable
  const vatAmount = normalizeVatAmount(receipt.amount, vatApplicable, receipt.vat_amount)

  let createdReceipt: Record<string, unknown> | null = null

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const receiptNumber = await getNextDocumentNumber(
      { table: 'receipts', column: 'receipt_number', prefix: 'REC' },
      queryClient
    )

    const { data, error } = await queryClient
      .from('receipts')
      .insert({
        ...receipt,
        receipt_number: receiptNumber,
        vat_applicable: vatApplicable,
        vat_amount: vatAmount,
      })
      .select()
      .single()

    if (!error && data) {
      createdReceipt = data
      break
    }

    if (!isUniqueConstraintError(error) || attempt === 3) {
      console.error('Error creating receipt:', error)
      return null
    }
  }

  if (!createdReceipt) {
    return null
  }

  await syncInvoiceReceiptState(receipt.invoice_id, queryClient)

  return createdReceipt
}

export async function updateReceipt(
  id: string,
  updates: Partial<UpdateReceiptInput>,
  queryClient: QueryClient = supabase
) {
  const { data: currentReceipt } = await queryClient
    .from('receipts')
    .select('invoice_id, amount, vat_applicable, vat_amount')
    .eq('id', id)
    .single()

  const current = currentReceipt as Pick<Receipt, 'invoice_id' | 'amount' | 'vat_applicable' | 'vat_amount'> | null

  if (!current) {
    return null
  }

  const updateData: Partial<UpdateReceiptInput> = { ...updates }

  if (updates.vat_amount !== undefined || updates.vat_applicable !== undefined) {
    const amount = updates.amount ?? current.amount
    const vatApplicable = updates.vat_applicable ?? current.vat_applicable
    updateData.vat_applicable = vatApplicable
    updateData.vat_amount = normalizeVatAmount(amount, vatApplicable, updates.vat_amount ?? current.vat_amount)
  }

  const { data, error } = await queryClient
    .from('receipts')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating receipt:', error)
    return null
  }

  await syncInvoiceReceiptState(current.invoice_id, queryClient)

  return data
}

export async function deleteReceipt(
  id: string,
  queryClient: QueryClient = supabase
) {
  const { data: currentReceipt } = await queryClient
    .from('receipts')
    .select('invoice_id')
    .eq('id', id)
    .single()

  const current = currentReceipt as Pick<Receipt, 'invoice_id'> | null

  if (!current) {
    return false
  }

  const { error } = await queryClient
    .from('receipts')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting receipt:', error)
    return false
  }

  await syncInvoiceReceiptState(current.invoice_id, queryClient)

  return true
}

// Vendor Payments
export async function getVendorPayments(
  queryClient: QueryClient = supabase,
  filters?: { vendorId?: string; poId?: string; projectId?: string }
): Promise<VendorPayment[]> {
  let query = queryClient
    .from('vendor_payments')
    .select(`
      *,
      vendors:vendor_id (name),
      purchase_orders:purchase_order_id (po_number),
      projects:project_id (name)
    `)
    .order('payment_date', { ascending: false })

  if (filters?.vendorId) {
    query = query.eq('vendor_id', filters.vendorId)
  }

  if (filters?.poId) {
    query = query.eq('purchase_order_id', filters.poId)
  }

  if (filters?.projectId) {
    query = query.eq('project_id', filters.projectId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching vendor payments:', error)
    return []
  }

  const rows = (data ?? []) as VendorPaymentRow[]

  return rows.map((row) => ({
    ...row,
    vendor_name: unwrapRelated(row.vendors)?.name,
    po_number: unwrapRelated(row.purchase_orders)?.po_number,
    project_name: unwrapRelated(row.projects)?.name,
  }))
}

export async function getVendorPaymentById(
  id: string,
  queryClient: QueryClient = supabase
): Promise<VendorPayment | null> {
  const { data, error } = await queryClient
    .from('vendor_payments')
    .select(`
      *,
      vendors:vendor_id (name),
      purchase_orders:purchase_order_id (po_number),
      projects:project_id (name)
    `)
    .eq('id', id)
    .single()

  if (error || !data) {
    console.error('Error fetching vendor payment:', error)
    return null
  }

  const row = data as VendorPaymentRow

  return {
    ...row,
    vendor_name: unwrapRelated(row.vendors)?.name,
    po_number: unwrapRelated(row.purchase_orders)?.po_number,
    project_name: unwrapRelated(row.projects)?.name,
  }
}

export async function createVendorPayment(
  payment: CreateVendorPaymentInput,
  queryClient: QueryClient = supabase
) {
  const vatApplicable = payment.vat_applicable
  const vatAmount = normalizeVatAmount(payment.amount, vatApplicable, payment.vat_amount)

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const paymentNumber = await getNextDocumentNumber(
      { table: 'vendor_payments', column: 'payment_number', prefix: 'VP' },
      queryClient
    )

    const { data, error } = await queryClient
      .from('vendor_payments')
      .insert({
        ...payment,
        payment_number: paymentNumber,
        vat_applicable: vatApplicable,
        vat_amount: vatAmount,
      })
      .select()
      .single()

    if (!error) {
      return data
    }

    if (!isUniqueConstraintError(error) || attempt === 3) {
      console.error('Error creating vendor payment:', error)
      return null
    }
  }

  return null
}

export async function updateVendorPayment(
  id: string,
  updates: Partial<UpdateVendorPaymentInput>,
  queryClient: QueryClient = supabase
) {
  const { data: currentPayment } = await queryClient
    .from('vendor_payments')
    .select('amount, vat_applicable, vat_amount')
    .eq('id', id)
    .single()

  const current = currentPayment as Pick<VendorPayment, 'amount' | 'vat_applicable' | 'vat_amount'> | null

  if (!current) {
    return null
  }

  const updateData: Partial<UpdateVendorPaymentInput> = { ...updates }

  if (updates.vat_amount !== undefined || updates.vat_applicable !== undefined) {
    const amount = updates.amount ?? current.amount
    const vatApplicable = updates.vat_applicable ?? current.vat_applicable
    updateData.vat_applicable = vatApplicable
    updateData.vat_amount = normalizeVatAmount(amount, vatApplicable, updates.vat_amount ?? current.vat_amount)
  }

  const { data, error } = await queryClient
    .from('vendor_payments')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating vendor payment:', error)
    return null
  }

  return data
}

export async function deleteVendorPayment(
  id: string,
  queryClient: QueryClient = supabase
) {
  const { error } = await queryClient
    .from('vendor_payments')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting vendor payment:', error)
    return false
  }

  return true
}

export function getPaymentMethodClasses(method: string) {
  switch (method) {
    case 'Cash':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'Bank Transfer':
      return 'bg-sky-50 text-sky-700 border-sky-200'
    case 'Cheque':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'Credit Card':
      return 'bg-purple-50 text-purple-700 border-purple-200'
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200'
  }
}

export async function getMonthlyRevenue(
  queryClient: QueryClient = supabase
): Promise<{ month: string; shortMonth: string; amount: number }[]> {
  const { data, error } = await queryClient
    .from('receipts')
    .select('receipt_date, amount')
    .order('receipt_date', { ascending: true })

  if (error) {
    console.error('Error fetching monthly revenue:', error)
    return []
  }

  const monthlyMap = new Map<string, number>()

  ;(data || []).forEach((receipt) => {
    const date = new Date(receipt.receipt_date)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    monthlyMap.set(key, (monthlyMap.get(key) || 0) + (receipt.amount || 0))
  })

  return Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, amount]) => {
      const [year, month] = key.split('-')
      const date = new Date(Number(year), Number(month) - 1)
      return {
        month: key,
        shortMonth: date.toLocaleDateString('en-AE', { month: 'short' }),
        amount,
      }
    })
}

export async function getFinancialSummary(
  queryClient: QueryClient = supabase,
  projectId?: string
): Promise<{
  totalInvoiced: number
  totalReceived: number
  totalPurchases: number
  totalVendorPayments: number
  totalExpenses: number
  clientReceivables: number
  vendorPayables: number
  vendorCredits: number
}> {
  const invoicesQuery = queryClient
    .from('invoices')
    .select('total_amount, amount_paid')
    .not('status', 'eq', 'Cancelled')

  const receiptsQuery = queryClient
    .from('receipts')
    .select('amount, vat_amount, vat_applicable')

  const purchaseOrdersQuery = queryClient
    .from('purchase_orders')
    .select('total_amount, status')
    .not('status', 'eq', 'Cancelled')

  const vendorPaymentsQuery = queryClient
    .from('vendor_payments')
    .select('amount, vat_amount, vat_applicable')

  const expensesQuery = queryClient
    .from('project_expenses')
    .select('amount')

  if (projectId) {
    invoicesQuery.eq('project_id', projectId)
    receiptsQuery.eq('project_id', projectId)
    purchaseOrdersQuery.eq('project_id', projectId)
    vendorPaymentsQuery.eq('project_id', projectId)
    expensesQuery.eq('project_id', projectId)
  }

  const [
    { data: invoices },
    { data: receipts },
    { data: pos },
    { data: vendorPayments },
    { data: expenses },
  ] = await Promise.all([
    invoicesQuery,
    receiptsQuery,
    purchaseOrdersQuery,
    vendorPaymentsQuery,
    expensesQuery,
  ])

  const totalInvoiced = (invoices || []).reduce((sum, i) => sum + (i.total_amount || 0), 0)
  const totalReceived = (receipts || []).reduce((sum, r) => sum + (r.amount || 0) + (r.vat_applicable ? (r.vat_amount || 0) : 0), 0)
  const totalPurchases = (pos || []).reduce((sum, p) => sum + (p.total_amount || 0), 0)
  const totalVendorPayments = (vendorPayments || []).reduce((sum, p) => sum + (p.amount || 0) + (p.vat_applicable ? (p.vat_amount || 0) : 0), 0)
  const totalExpenses = (expenses || []).reduce((sum, e) => sum + (e.amount || 0), 0)
  const vendorBalanceDifference = totalPurchases - totalVendorPayments

  return {
    totalInvoiced,
    totalReceived,
    totalPurchases,
    totalVendorPayments,
    totalExpenses,
    clientReceivables: totalInvoiced - totalReceived,
    vendorPayables: Math.max(vendorBalanceDifference, 0),
    vendorCredits: Math.max(-vendorBalanceDifference, 0),
  }
}

export type ProjectFinancialRow = {
  project_id: string
  project_name: string
  project_code: string
  status: string
  contract_amount: number
  total_invoiced: number
  total_received: number
  client_receivables: number
  total_purchases: number
  total_vendor_payments: number
  vendor_payables: number
  total_expenses: number
  net_position: number
}

export async function getProjectWiseFinancials(
  queryClient: QueryClient = supabase
): Promise<ProjectFinancialRow[]> {
  const [
    { data: projects },
    { data: invoices },
    { data: receipts },
    { data: pos },
    { data: vendorPayments },
    { data: expenses },
  ] = await Promise.all([
    queryClient.from('projects').select('id, project_code, name, status, total_amount').order('name'),
    queryClient.from('invoices').select('project_id, total_amount'),
    queryClient.from('receipts').select('project_id, amount, vat_amount, vat_applicable'),
    queryClient.from('purchase_orders').select('project_id, total_amount, status').not('status', 'eq', 'Cancelled'),
    queryClient.from('vendor_payments').select('project_id, amount, vat_amount, vat_applicable'),
    queryClient.from('project_expenses').select('project_id, amount'),
  ])

  return (projects || []).map((project) => {
    const id = project.id

    const totalInvoiced = (invoices || [])
      .filter((r) => r.project_id === id)
      .reduce((sum, r) => sum + (r.total_amount || 0), 0)

    const totalReceived = (receipts || [])
      .filter((r) => r.project_id === id)
      .reduce((sum, r) => sum + (r.amount || 0) + (r.vat_applicable ? (r.vat_amount || 0) : 0), 0)

    const totalPurchases = (pos || [])
      .filter((r) => r.project_id === id)
      .reduce((sum, r) => sum + (r.total_amount || 0), 0)

    const totalVendorPayments = (vendorPayments || [])
      .filter((r) => r.project_id === id)
      .reduce((sum, r) => sum + (r.amount || 0) + (r.vat_applicable ? (r.vat_amount || 0) : 0), 0)

    const totalExpenses = (expenses || [])
      .filter((r) => r.project_id === id)
      .reduce((sum, r) => sum + (r.amount || 0), 0)

    const vendorBalance = totalPurchases - totalVendorPayments

    return {
      project_id: id,
      project_name: project.name,
      project_code: project.project_code,
      status: project.status,
      contract_amount: project.total_amount || 0,
      total_invoiced: totalInvoiced,
      total_received: totalReceived,
      client_receivables: totalInvoiced - totalReceived,
      total_purchases: totalPurchases,
      total_vendor_payments: totalVendorPayments,
      vendor_payables: Math.max(vendorBalance, 0),
      total_expenses: totalExpenses,
      net_position: totalReceived - totalVendorPayments - totalExpenses,
    }
  })
}
