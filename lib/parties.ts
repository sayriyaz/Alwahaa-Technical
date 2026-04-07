import { createClient, deleteClient, getClients, type Client, updateClient } from '@/lib/clients'
import {
  CONTRACTOR_PARTY_TYPES,
  createContractor,
  deleteContractor,
  getContractors,
  type Contractor,
  type ContractorPartyType,
  updateContractor,
} from '@/lib/contractors'
import { type QueryClient } from '@/lib/supabase'
import { createVendor, deleteVendor, getVendorBalance, getVendors, type Vendor, updateVendor } from '@/lib/vendors'

export const PARTY_TYPES = ['Client', 'Vendor', ...CONTRACTOR_PARTY_TYPES] as const

export type PartyType = (typeof PARTY_TYPES)[number]
export type PartySource = 'clients' | 'vendors' | 'contractors'

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

function isContractorPartyType(value: string): value is ContractorPartyType {
  return CONTRACTOR_PARTY_TYPES.includes(value as ContractorPartyType)
}

function mapClient(client: Client): Party {
  return {
    key: `clients:${client.id}`,
    source: 'clients',
    record_id: client.id,
    type: 'Client',
    name: client.name,
    contact_person: null,
    phone: client.phone,
    email: client.email,
    address: client.address,
    emirates_id: client.emirates_id,
    trn_number: client.trn_number,
    payment_terms: null,
    notes: client.notes,
    created_at: client.created_at,
    total_purchases: 0,
    total_paid: 0,
    balance_due: 0,
    vendor_credit: 0,
  }
}

function mapVendor(
  vendor: Vendor,
  balance: { totalPurchases: number; totalPaid: number; balanceDue: number; vendorCredit: number }
): Party {
  return {
    key: `vendors:${vendor.id}`,
    source: 'vendors',
    record_id: vendor.id,
    type: 'Vendor',
    name: vendor.name,
    contact_person: vendor.contact_person,
    phone: vendor.phone,
    email: vendor.email,
    address: vendor.address,
    emirates_id: null,
    trn_number: vendor.trn_number,
    payment_terms: vendor.payment_terms,
    notes: vendor.notes,
    created_at: vendor.created_at,
    total_purchases: balance.totalPurchases,
    total_paid: balance.totalPaid,
    balance_due: balance.balanceDue,
    vendor_credit: balance.vendorCredit,
  }
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
  const [clients, vendors, contractors] = await Promise.all([
    getClients(queryClient),
    getVendors(queryClient),
    getContractors(queryClient),
  ])

  const vendorsWithBalance = await Promise.all(
    vendors.map(async (vendor) => ({
      vendor,
      balance: await getVendorBalance(vendor.id, queryClient),
    }))
  )

  return [
    ...clients.map(mapClient),
    ...vendorsWithBalance.map(({ vendor, balance }) => mapVendor(vendor, balance)),
    ...contractors.map(mapContractor),
  ].sort((left, right) => left.name.localeCompare(right.name))
}

export async function createParty(input: PartyInput, queryClient: QueryClient): Promise<PartyRecordRef | null> {
  const name = input.name.trim()

  if (!name) {
    return null
  }

  if (input.type === 'Client') {
    const phone = normalize(input.phone)

    if (!phone) {
      return null
    }

    const record = await createClient({
      name,
      email: normalize(input.email),
      phone,
      address: normalize(input.address),
      emirates_id: normalize(input.emirates_id),
      trn_number: normalize(input.trn_number),
      notes: normalize(input.notes),
    }, queryClient)

    if (!record) {
      return null
    }

    return {
      source: 'clients',
      record_id: record.id,
      type: 'Client',
    }
  }

  if (input.type === 'Vendor') {
    const record = await createVendor({
      name,
      contact_person: normalize(input.contact_person),
      phone: normalize(input.phone),
      email: normalize(input.email),
      address: normalize(input.address),
      trn_number: normalize(input.trn_number),
      payment_terms: normalize(input.payment_terms),
      notes: normalize(input.notes),
    }, queryClient)

    if (!record) {
      return null
    }

    return {
      source: 'vendors',
      record_id: record.id,
      type: 'Vendor',
    }
  }

  const contractorType = isContractorPartyType(input.type) ? input.type : 'Contractor'
  const record = await createContractor({
    name,
    party_type: contractorType,
    contact_person: normalize(input.contact_person),
    phone: normalize(input.phone),
    email: normalize(input.email),
    address: normalize(input.address),
    trn_number: normalize(input.trn_number),
    notes: normalize(input.notes),
  }, queryClient)

  if (!record) {
    return null
  }

  return {
    source: 'contractors',
    record_id: record.id,
    type: contractorType,
  }
}

export async function updateParty(
  source: PartySource,
  recordId: string,
  input: PartyInput,
  queryClient: QueryClient
) {
  const name = input.name.trim()

  if (!recordId || !name) {
    return null
  }

  if (source === 'clients') {
    const phone = normalize(input.phone)

    if (!phone) {
      return null
    }

    return updateClient(recordId, {
      name,
      email: normalize(input.email),
      phone,
      address: normalize(input.address),
      emirates_id: normalize(input.emirates_id),
      trn_number: normalize(input.trn_number),
      notes: normalize(input.notes),
    }, queryClient)
  }

  if (source === 'vendors') {
    return updateVendor(recordId, {
      name,
      contact_person: normalize(input.contact_person),
      phone: normalize(input.phone),
      email: normalize(input.email),
      address: normalize(input.address),
      trn_number: normalize(input.trn_number),
      payment_terms: normalize(input.payment_terms),
      notes: normalize(input.notes),
    }, queryClient)
  }

  const contractorType = isContractorPartyType(input.type) ? input.type : 'Contractor'

  return updateContractor(recordId, {
    name,
    party_type: contractorType,
    contact_person: normalize(input.contact_person),
    phone: normalize(input.phone),
    email: normalize(input.email),
    address: normalize(input.address),
    trn_number: normalize(input.trn_number),
    notes: normalize(input.notes),
  }, queryClient)
}

export async function deleteParty(source: PartySource, recordId: string, queryClient: QueryClient) {
  if (!recordId) {
    return false
  }

  if (source === 'clients') {
    return deleteClient(recordId, queryClient)
  }

  if (source === 'vendors') {
    return deleteVendor(recordId, queryClient)
  }

  return deleteContractor(recordId, queryClient)
}
