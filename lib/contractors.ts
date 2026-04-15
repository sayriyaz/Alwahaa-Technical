import { supabase, type QueryClient } from '@/lib/supabase'

// All party types — single source of truth
export const ALL_PARTY_TYPES = [
  'Direct Client',
  'Main Contractor',
  'Developer',
  'Commercial',
  'Government',
  'Consultant',
  'Vendor',
  'Subcontractor',
] as const

export type ContractorPartyType = (typeof ALL_PARTY_TYPES)[number]

// Client-type parties (appear in project "Client" dropdown)
export const CLIENT_PARTY_TYPES: ContractorPartyType[] = [
  'Direct Client',
  'Main Contractor',
  'Developer',
  'Commercial',
  'Government',
  'Consultant',
]

// Supplier-type parties (appear in PO / Vendor Payment dropdowns)
export const SUPPLIER_PARTY_TYPES: ContractorPartyType[] = [
  'Vendor',
  'Subcontractor',
]

// Legacy alias used in a few older pages
export const CONTRACTOR_PARTY_TYPES = ALL_PARTY_TYPES

export type Contractor = {
  id: string
  name: string
  party_type: ContractorPartyType
  contact_person: string | null
  phone: string | null
  email: string | null
  address: string | null
  trn_number: string | null
  notes: string | null
  created_at: string
}

export async function getContractors(queryClient: QueryClient = supabase): Promise<Contractor[]> {
  const { data, error } = await queryClient
    .from('contractors')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching contractors:', error)
    return []
  }

  return data || []
}

/** Returns only client-type parties (for project client dropdown) */
export async function getClientParties(queryClient: QueryClient = supabase): Promise<Contractor[]> {
  const { data, error } = await queryClient
    .from('contractors')
    .select('*')
    .in('party_type', CLIENT_PARTY_TYPES)
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching client parties:', error)
    return []
  }

  return data || []
}

/** Returns only supplier-type parties (for PO / vendor payment dropdown) */
export async function getSupplierParties(queryClient: QueryClient = supabase): Promise<Contractor[]> {
  const { data, error } = await queryClient
    .from('contractors')
    .select('*')
    .in('party_type', SUPPLIER_PARTY_TYPES)
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching supplier parties:', error)
    return []
  }

  return data || []
}

export async function createContractor(
  contractor: Omit<Contractor, 'id' | 'created_at'>,
  queryClient: QueryClient = supabase
) {
  const { data, error } = await queryClient
    .from('contractors')
    .insert(contractor)
    .select()
    .single()

  if (error) {
    console.error('Error creating contractor:', error)
    return null
  }

  return data
}

export async function updateContractor(
  id: string,
  updates: Partial<Contractor>,
  queryClient: QueryClient = supabase
) {
  const { data, error } = await queryClient
    .from('contractors')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating contractor:', error)
    return null
  }

  return data
}

export async function deleteContractor(
  id: string,
  queryClient: QueryClient = supabase
) {
  const { error } = await queryClient
    .from('contractors')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting contractor:', error)
    return false
  }

  return true
}
