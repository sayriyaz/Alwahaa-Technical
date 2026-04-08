import { supabase, type QueryClient } from '@/lib/supabase'

export type Vendor = {
  id: string
  name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  address: string | null
  trn_number: string | null
  payment_terms: string | null
  notes: string | null
  created_at: string
}

export type VendorWithBalance = Vendor & {
  total_purchases: number
  total_paid: number
  balance_due: number
  vendor_credit: number
}

export async function getVendors(queryClient: QueryClient = supabase): Promise<Vendor[]> {
  const { data, error } = await queryClient
    .from('vendors')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching vendors:', error)
    return []
  }

  return data || []
}

export async function getVendorById(
  id: string,
  queryClient: QueryClient = supabase
): Promise<Vendor | null> {
  const { data, error } = await queryClient
    .from('vendors')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching vendor:', error)
    return null
  }

  return data
}

export async function createVendor(
  vendor: Omit<Vendor, 'id' | 'created_at'>,
  queryClient: QueryClient = supabase
) {
  const { data, error } = await queryClient
    .from('vendors')
    .insert(vendor)
    .select()
    .single()

  if (error) {
    console.error('Error creating vendor:', error)
    return null
  }

  return data
}

export async function updateVendor(
  id: string,
  updates: Partial<Vendor>,
  queryClient: QueryClient = supabase
) {
  const { data, error } = await queryClient
    .from('vendors')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating vendor:', error)
    return null
  }

  return data
}

export async function deleteVendor(id: string, queryClient: QueryClient = supabase) {
  const { error } = await queryClient.from('vendors').delete().eq('id', id)

  if (error) {
    console.error('Error deleting vendor:', error)
    return false
  }

  return true
}

export async function getVendorBalance(
  vendorId: string,
  queryClient: QueryClient = supabase
): Promise<{ totalPurchases: number; totalPaid: number; balanceDue: number; vendorCredit: number }> {
  const [{ data: purchases }, { data: payments }] = await Promise.all([
    queryClient
      .from('purchase_orders')
      .select('total_amount')
      .eq('vendor_id', vendorId)
      .not('status', 'eq', 'Cancelled'),
    queryClient
      .from('vendor_payments')
      .select('amount, vat_amount, vat_applicable')
      .eq('vendor_id', vendorId),
  ])

  const totalPurchases = (purchases || []).reduce((sum, p) => sum + (p.total_amount || 0), 0)
  const totalPaid = (payments || []).reduce((sum, p) => sum + (p.amount || 0) + (p.vat_applicable ? (p.vat_amount || 0) : 0), 0)
  const balanceDifference = totalPurchases - totalPaid

  return {
    totalPurchases,
    totalPaid,
    balanceDue: Math.max(balanceDifference, 0),
    vendorCredit: Math.max(-balanceDifference, 0),
  }
}
