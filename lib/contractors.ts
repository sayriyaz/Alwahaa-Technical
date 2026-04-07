import { supabase, type QueryClient } from '@/lib/supabase'

export const CONTRACTOR_PARTY_TYPES = ['Contractor', 'Subcontractor', 'Consultant'] as const

export type ContractorPartyType = (typeof CONTRACTOR_PARTY_TYPES)[number]

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
