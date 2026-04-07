import { supabase, type MaybeRelated, type QueryClient, unwrapRelated } from '@/lib/supabase'

export const PROJECT_DOCUMENT_BUCKET = 'project-documents'
export const PROJECT_DOCUMENT_TYPES = ['Drawing', 'Contract', 'Quotation', 'Estimation', 'Other'] as const

export type ProjectDocumentType = (typeof PROJECT_DOCUMENT_TYPES)[number]

export type ProjectDocument = {
  id: string
  project_id: string
  document_type: ProjectDocumentType
  title: string
  file_name: string
  file_path: string
  file_size: number
  content_type: string | null
  notes: string | null
  uploaded_by: string | null
  uploaded_by_name?: string | null
  created_at: string
}

type ProjectDocumentRow = ProjectDocument & {
  app_users: MaybeRelated<{ full_name: string | null; email: string }>
}

export function getProjectDocumentUrl(filePath: string) {
  return supabase.storage.from(PROJECT_DOCUMENT_BUCKET).getPublicUrl(filePath).data.publicUrl
}

export async function getProjectDocuments(
  projectId: string,
  queryClient: QueryClient = supabase
): Promise<ProjectDocument[]> {
  const { data, error } = await queryClient
    .from('project_documents')
    .select(`
      *,
      app_users:uploaded_by (full_name, email)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching project documents:', error)
    return []
  }

  const rows = (data ?? []) as ProjectDocumentRow[]

  return rows.map((row) => ({
    ...row,
    uploaded_by_name: unwrapRelated(row.app_users)?.full_name || unwrapRelated(row.app_users)?.email || null,
  }))
}

export async function uploadProjectDocument(
  input: {
    project_id: string
    document_type: ProjectDocumentType
    title: string
    notes: string | null
    uploaded_by: string | null
  },
  file: File,
  queryClient: QueryClient = supabase
) {
  const originalFileName = file.name || 'document'
  const safeFileName = sanitizeFileName(originalFileName)
  const objectPath = `${input.project_id}/${Date.now()}-${crypto.randomUUID()}-${safeFileName}`

  const { error: uploadError } = await queryClient.storage
    .from(PROJECT_DOCUMENT_BUCKET)
    .upload(objectPath, file, {
      cacheControl: '3600',
      contentType: file.type || undefined,
      upsert: false,
    })

  if (uploadError) {
    console.error('Error uploading project document:', uploadError)
    return null
  }

  const { data, error } = await queryClient
    .from('project_documents')
    .insert({
      ...input,
      file_name: originalFileName,
      file_path: objectPath,
      file_size: file.size,
      content_type: file.type || null,
    })
    .select(`
      *,
      app_users:uploaded_by (full_name, email)
    `)
    .single()

  if (error || !data) {
    console.error('Error saving project document metadata:', error)
    await queryClient.storage.from(PROJECT_DOCUMENT_BUCKET).remove([objectPath])
    return null
  }

  const row = data as ProjectDocumentRow

  return {
    ...row,
    uploaded_by_name: unwrapRelated(row.app_users)?.full_name || unwrapRelated(row.app_users)?.email || null,
  } satisfies ProjectDocument
}

export async function deleteProjectDocument(
  id: string,
  queryClient: QueryClient = supabase
) {
  const { data: currentDocument, error: fetchError } = await queryClient
    .from('project_documents')
    .select('file_path')
    .eq('id', id)
    .single()

  if (fetchError || !currentDocument) {
    console.error('Error finding project document:', fetchError)
    return false
  }

  const { error: storageError } = await queryClient.storage
    .from(PROJECT_DOCUMENT_BUCKET)
    .remove([currentDocument.file_path])

  if (storageError) {
    console.error('Error deleting project document file:', storageError)
    return false
  }

  const { error } = await queryClient
    .from('project_documents')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting project document metadata:', error)
    return false
  }

  return true
}

function sanitizeFileName(value: string) {
  const trimmedValue = value.trim().toLowerCase()
  const [baseName, ...extensionParts] = trimmedValue.split('.')
  const safeBaseName = baseName.replace(/[^a-z0-9-_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'file'
  const extension = extensionParts.join('.').replace(/[^a-z0-9]+/g, '')

  return extension ? `${safeBaseName}.${extension}` : safeBaseName
}
