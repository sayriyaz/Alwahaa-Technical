import { redirect } from 'next/navigation'

export default function NewClientPage({
  searchParams,
}: {
  searchParams: Promise<{ return_to?: string }>
}) {
  redirect('/vendors/new')
}
