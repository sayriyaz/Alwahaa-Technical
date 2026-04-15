// vendors.ts — now reads from contractors table (party_type IN Vendor, Subcontractor)
// The legacy 'vendors' table has been dropped; all vendor/subcontractor data lives in contractors.

import { SUPPLIER_PARTY_TYPES, type Contractor } from '@/lib/contractors'
import { supabase, type QueryClient } from '@/lib/supabase'

export type Vendor = Contractor

export type VendorWithBalance = Vendor & {
  total_purchases: number
  total_paid: number
  balance_due: number
  vendor_credit: number
}

export async function getVendors(queryClient: QueryClient = supabase): Promise<Vendor[]> {
  const { data, error } = await queryClient
    .from('contractors')
    .select('*')
    .in('party_type', SUPPLIER_PARTY_TYPES)
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
    .from('contractors')
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
    .from('contractors')
    .insert({ ...vendor, party_type: vendor.party_type || 'Vendor' })
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
    .from('contractors')
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
  const { error } = await queryClient.from('contractors').delete().eq('id', id)

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
  const totalPaid = (payments || []).reduce(
    (sum, p) => sum + (p.amount || 0) + (p.vat_applicable ? (p.vat_amount || 0) : 0),
    0
  )
  const diff = totalPurchases - totalPaid

  return {
    totalPurchases,
    totalPaid,
    balanceDue: Math.max(diff, 0),
    vendorCredit: Math.max(-diff, 0),
  }
}
