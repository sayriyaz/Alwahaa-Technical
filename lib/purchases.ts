import { getNextDocumentNumber, isUniqueConstraintError } from '@/lib/document-numbers'
import { supabase, type MaybeRelated, type QueryClient, unwrapRelated } from '@/lib/supabase'
import { calculateTotalAmount, normalizeVatAmount } from '@/lib/vat'

export const PURCHASE_ORDER_STATUSES = ['Draft', 'Sent', 'Partially Received', 'Fully Received', 'Cancelled'] as const

export type PurchaseOrderStatus = (typeof PURCHASE_ORDER_STATUSES)[number]

export type PurchaseOrderItem = {
  id: string
  item_name: string
  description: string | null
  quantity: number
  unit: string
  unit_price: number
  total_price: number
  received_quantity: number
}

export type PurchaseOrderSummary = {
  id: string
  po_number: string
  vendor_id: string
  vendor_name?: string
  project_id: string | null
  project_name?: string
  order_date: string
  expected_delivery: string | null
  subtotal: number
  vat_applicable: boolean
  vat_amount: number
  total_amount: number
  status: PurchaseOrderStatus
  created_at: string
}

export type PurchaseOrderDetail = PurchaseOrderSummary & {
  notes: string | null
  received_at: string | null
  items: PurchaseOrderItem[]
}

export type CreatePurchaseOrderInput = {
  vendor_id: string
  project_id: string | null
  order_date?: string
  expected_delivery: string | null
  vat_applicable: boolean
  vat_amount: number
  status?: PurchaseOrderStatus
  notes: string | null
  received_at?: string | null
}

export type UpdatePurchaseOrderInput = {
  expected_delivery: string | null
  vat_applicable: boolean
  vat_amount: number
  status: PurchaseOrderStatus
  notes: string | null
}

type PurchaseOrderListRow = PurchaseOrderSummary & {
  vendors: MaybeRelated<{ name: string }>
  projects: MaybeRelated<{ name: string }>
}

type PurchaseOrderDetailRow = Omit<PurchaseOrderDetail, 'vendor_name' | 'project_name' | 'items'> & {
  vendors: MaybeRelated<{ name: string }>
  projects: MaybeRelated<{ name: string }>
}

export async function getPurchaseOrders(
  queryClient: QueryClient = supabase,
  filters?: { vendorId?: string; projectId?: string; status?: PurchaseOrderStatus }
): Promise<PurchaseOrderSummary[]> {
  let query = queryClient
    .from('purchase_orders')
    .select(`
      id, po_number, vendor_id, project_id, order_date, expected_delivery,
      subtotal, vat_applicable, vat_amount, total_amount, status, created_at,
      vendors:vendor_id (name),
      projects:project_id (name)
    `)
    .order('created_at', { ascending: false })

  if (filters?.vendorId) {
    query = query.eq('vendor_id', filters.vendorId)
  }

  if (filters?.projectId) {
    query = query.eq('project_id', filters.projectId)
  }

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching purchase orders:', error)
    return []
  }

  const rows = (data ?? []) as PurchaseOrderListRow[]

  return rows.map((row) => ({
    ...row,
    vendor_name: unwrapRelated(row.vendors)?.name,
    project_name: unwrapRelated(row.projects)?.name || 'General Inventory',
  }))
}

export async function getPurchaseOrderById(
  id: string,
  queryClient: QueryClient = supabase
): Promise<PurchaseOrderDetail | null> {
  const { data, error: poError } = await queryClient
    .from('purchase_orders')
    .select(`
      *,
      vendors:vendor_id (name),
      projects:project_id (name)
    `)
    .eq('id', id)
    .single()

  if (poError || !data) {
    console.error('Error fetching purchase order:', poError)
    return null
  }

  const po = data as PurchaseOrderDetailRow

  const { data: items, error: itemsError } = await queryClient
    .from('purchase_order_items')
    .select('*')
    .eq('purchase_order_id', id)

  if (itemsError) {
    console.error('Error fetching PO items:', itemsError)
  }

  return {
    ...po,
    vendor_name: unwrapRelated(po.vendors)?.name,
    project_name: unwrapRelated(po.projects)?.name || 'General Inventory',
    items: items || [],
  }
}

export async function createPurchaseOrder(
  po: CreatePurchaseOrderInput,
  items: Omit<PurchaseOrderItem, 'id' | 'created_at'>[],
  queryClient: QueryClient = supabase
) {
  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + (item.total_price || 0), 0)
  const vatApplicable = po.vat_applicable
  const vatAmount = normalizeVatAmount(subtotal, vatApplicable, po.vat_amount || 0)
  const totalAmount = calculateTotalAmount(subtotal, vatApplicable, vatAmount)

  let createdPurchaseOrder: { id: string } & Record<string, unknown> | null = null

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const poNumber = await getNextDocumentNumber(
      { table: 'purchase_orders', column: 'po_number', prefix: 'PO' },
      queryClient
    )

    const { data, error } = await queryClient
      .from('purchase_orders')
      .insert({
        ...po,
        po_number: poNumber,
        order_date: po.order_date ?? new Date().toISOString().split('T')[0],
        subtotal,
        vat_applicable: vatApplicable,
        vat_amount: vatAmount,
        total_amount: totalAmount,
        status: po.status ?? 'Draft',
      })
      .select()
      .single()

    if (!error && data) {
      createdPurchaseOrder = data
      break
    }

    if (!isUniqueConstraintError(error) || attempt === 3) {
      console.error('Error creating purchase order:', error)
      return null
    }
  }

  if (!createdPurchaseOrder) {
    return null
  }

  // Insert items
  if (items.length > 0) {
    const { error: itemsError } = await queryClient
      .from('purchase_order_items')
      .insert(items.map((item) => ({ ...item, purchase_order_id: createdPurchaseOrder.id })))

    if (itemsError) {
      console.error('Error creating PO items:', itemsError)
      const { error: rollbackError } = await queryClient
        .from('purchase_orders')
        .delete()
        .eq('id', createdPurchaseOrder.id)

      if (rollbackError) {
        console.error('Error rolling back purchase order after item failure:', rollbackError)
      }

      return null
    }
  }

  return createdPurchaseOrder
}

export async function updatePurchaseOrderStatus(
  id: string,
  status: PurchaseOrderStatus,
  queryClient: QueryClient = supabase
) {
  const updates: Partial<Pick<PurchaseOrderDetail, 'status' | 'received_at'>> = { status }

  if (status === 'Fully Received') {
    updates.received_at = new Date().toISOString()

    // Mark all items as fully received
    const { data: items } = await queryClient
      .from('purchase_order_items')
      .select('id, quantity')
      .eq('purchase_order_id', id)

    if (items) {
      for (const item of items) {
        await queryClient
          .from('purchase_order_items')
          .update({ received_quantity: item.quantity })
          .eq('id', item.id)
      }
    }
  }

  const { data, error } = await queryClient
    .from('purchase_orders')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating purchase order:', error)
    return null
  }

  return data
}

export async function updatePurchaseOrder(
  id: string,
  updates: Partial<UpdatePurchaseOrderInput>,
  queryClient: QueryClient = supabase
) {
  const { data: currentPurchaseOrder } = await queryClient
    .from('purchase_orders')
    .select('subtotal, vat_applicable, vat_amount')
    .eq('id', id)
    .single()

  const current = currentPurchaseOrder as Pick<PurchaseOrderSummary, 'subtotal' | 'vat_applicable' | 'vat_amount'> | null

  if (!current) {
    return null
  }

  const updateData: Partial<UpdatePurchaseOrderInput & Pick<PurchaseOrderDetail, 'received_at'> & Pick<PurchaseOrderSummary, 'total_amount'>> = { ...updates }

  if (updates.status === 'Fully Received') {
    updateData.received_at = new Date().toISOString()
  } else if (updates.status) {
    updateData.received_at = null
  }

  if (updates.vat_amount !== undefined || updates.vat_applicable !== undefined) {
    const vatApplicable = updates.vat_applicable ?? current.vat_applicable
    const vatAmount = normalizeVatAmount(current.subtotal, vatApplicable, updates.vat_amount ?? current.vat_amount)

    updateData.vat_applicable = vatApplicable
    updateData.vat_amount = vatAmount
    updateData.total_amount = calculateTotalAmount(current.subtotal, vatApplicable, vatAmount)
  }

  const { data, error } = await queryClient
    .from('purchase_orders')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating purchase order:', error)
    return null
  }

  return data
}

export async function deletePurchaseOrder(
  id: string,
  queryClient: QueryClient = supabase
) {
  const { error } = await queryClient
    .from('purchase_orders')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting purchase order:', error)
    return false
  }

  return true
}

export function getPOStatusClasses(status: PurchaseOrderStatus) {
  switch (status) {
    case 'Fully Received':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'Partially Received':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'Sent':
      return 'bg-sky-50 text-sky-700 border-sky-200'
    case 'Cancelled':
      return 'bg-slate-100 text-slate-700 border-slate-200'
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200'
  }
}
