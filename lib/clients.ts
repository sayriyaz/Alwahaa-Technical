import { supabase, type QueryClient } from '@/lib/supabase'

export type Client = {
  id: string
  name: string
  email: string | null
  phone: string
  address: string | null
  emirates_id: string | null
  trn_number: string | null
  notes: string | null
  created_at: string
}

export async function getClients(queryClient: QueryClient = supabase): Promise<Client[]> {
  const { data, error } = await queryClient
    .from('clients')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching clients:', error)
    return []
  }

  return data || []
}

export async function getClientById(
  id: string,
  queryClient: QueryClient = supabase
): Promise<Client | null> {
  const { data, error } = await queryClient
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching client:', error)
    return null
  }

  return data
}

export async function createClient(
  client: Omit<Client, 'id' | 'created_at'>,
  queryClient: QueryClient = supabase
) {
  const { data, error } = await queryClient
    .from('clients')
    .insert(client)
    .select()
    .single()

  if (error) {
    console.error('Error creating client:', error)
    return null
  }

  return data
}

export async function updateClient(
  id: string,
  updates: Partial<Client>,
  queryClient: QueryClient = supabase
) {
  const { data, error } = await queryClient
    .from('clients')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating client:', error)
    return null
  }

  return data
}

export async function deleteClient(id: string, queryClient: QueryClient = supabase) {
  const { error } = await queryClient.from('clients').delete().eq('id', id)

  if (error) {
    console.error('Error deleting client:', error)
    return false
  }

  return true
}
