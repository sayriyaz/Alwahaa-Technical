import type { QueryClient } from '@/lib/supabase'

type SequenceSpec = {
  table: string
  column: string
  prefix: string
  year?: number
  padding?: number
}

export async function getNextDocumentNumber(
  { table, column, prefix, year = new Date().getFullYear(), padding = 3 }: SequenceSpec,
  queryClient: QueryClient
) {
  const yearPrefix = `${prefix}-${year}-`
  const { data, error } = await queryClient
    .from(table)
    .select(column)
    .like(column, `${yearPrefix}%`)
    .order(column, { ascending: false })
    .limit(1)

  if (error) {
    console.error(`Error generating next ${table} number:`, error)
  }

  const latestValue = ((data as Array<Record<string, string>> | null) ?? [])[0]?.[column]
  const latestSequence =
    typeof latestValue === 'string' && latestValue.startsWith(yearPrefix)
      ? Number.parseInt(latestValue.slice(yearPrefix.length), 10)
      : 0

  const nextSequence = Number.isFinite(latestSequence) ? latestSequence + 1 : 1

  return `${yearPrefix}${String(nextSequence).padStart(padding, '0')}`
}

export function isUniqueConstraintError(error: { code?: string } | null | undefined) {
  return error?.code === '23505'
}
