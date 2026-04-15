import {
  ALL_PARTY_TYPES,
  CLIENT_PARTY_TYPES,
  SUPPLIER_PARTY_TYPES,
  createContractor,
  deleteContractor,
  getContractors,
  type Contractor,
  type ContractorPartyType,
  updateContractor,
} from '@/lib/contractors'
import { type QueryClient } from '@/lib/supabase'

export { ALL_PARTY_TYPES, CLIENT_PARTY_TYPES, SUPPLIER_PARTY_TYPES }

export const PARTY_TYPES = ALL_PARTY_TYPES
export type PartyType = ContractorPartyType
export type PartySource = 'contractors'

export type Party = {
  key: string
  source: PartySource
  record_id: string
  type: PartyType
  name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  address: string | null
  emirates_id: string | null
  trn_number: string | null
  payment_terms: string | null
  notes: string | null
  created_at: string
  total_purchases: number
  total_paid: number
  balance_due: number
  vendor_credit: number
}

export type PartyRecordRef = {
  source: PartySource
  record_id: string
  type: PartyType
}

export type PartyInput = {
  type: PartyType
  name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  address: string | null
  emirates_id: string | null
  trn_number: string | null
  payment_terms: string | null
  notes: string | null
}

function normalize(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function mapContractor(contractor: Contractor): Party {
  return {
    key: `contractors:${contractor.id}`,
    source: 'contractors',
    record_id: contractor.id,
    type: contractor.party_type,
    name: contractor.name,
    contact_person: contractor.contact_person,
    phone: contractor.phone,
    email: contractor.email,
    address: contractor.address,
    emirates_id: null,
    trn_number: contractor.trn_number,
    payment_terms: null,
    notes: contractor.notes,
    created_at: contractor.created_at,
    total_purchases: 0,
    total_paid: 0,
    balance_due: 0,
    vendor_credit: 0,
  }
}

export async function getParties(queryClient: QueryClient): Promise<Party[]> {
  const contractors = await getContractors(queryClient)
  return contractors.map(mapContractor)
}

export async function createParty(input: PartyInput, queryClient: QueryClient): Promise<PartyRecordRef | null> {
  const name = input.name.trim()
  if (!name) return null

  const partyType: ContractorPartyType = ALL_PARTY_TYPES.includes(input.type as ContractorPartyType)
    ? (input.type as ContractorPartyType)
    : 'Direct Client'

  const record = await createContractor({
    name,
    party_type: partyType,
    contact_person: normalize(input.contact_person),
    phone: normalize(input.phone),
    email: normalize(input.email),
    address: normalize(input.address),
    trn_number: normalize(input.trn_number),
    notes: normalize(input.notes),
  }, queryClient)

  if (!record) return null

  return { source: 'contractors', record_id: record.id, type: partyType }
}

export async function updateParty(
  source: PartySource,
  recordId: string,
  input: PartyInput,
  queryClient: QueryClient
) {
  const name = input.name.trim()
  if (!recordId || !name) return null

  const partyType: ContractorPartyType = ALL_PARTY_TYPES.includes(input.type as ContractorPartyType)
    ? (input.type as ContractorPartyType)
    : 'Direct Client'

  return updateContractor(recordId, {
    name,
    party_type: partyType,
    contact_person: normalize(input.contact_person),
    phone: normalize(input.phone),
    email: normalize(input.email),
    address: normalize(input.address),
    trn_number: normalize(input.trn_number),
    notes: normalize(input.notes),
  }, queryClient)
}

export async function deleteParty(source: PartySource, recordId: string, queryClient: QueryClient) {
  if (!recordId) return false
  return deleteContractor(recordId, queryClient)
}
