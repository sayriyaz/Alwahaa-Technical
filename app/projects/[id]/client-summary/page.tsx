import { notFound } from 'next/navigation'
import {
  DocumentAmountBreakdown,
  DocumentInfoGrid,
  DocumentPrintLayout,
  DocumentTextBlock,
} from '@/components/document-print-layout'
import { requireAuthenticatedAppUser } from '@/lib/auth'
import { getProjectById, formatCurrency, formatDate } from '@/lib/projects'

export default async function ProjectClientSummaryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { db } = await requireAuthenticatedAppUser()
  const { id } = await params
  const project = await getProjectById(id, db)

  if (!project) {
    notFound()
  }

  return (
    <DocumentPrintLayout
      backHref={`/projects/${project.id}`}
      backLabel="Back to Project"
      documentLabel="Client Commercial Summary"
      documentNumber={project.project_code}
      title={project.name}
      subtitle={project.client_name || undefined}
      showBankDetails
    >
      <DocumentInfoGrid
        columns={4}
        items={[
          { label: 'Client', value: project.client_name || '-' },
          { label: 'Location', value: project.location },
          { label: 'Start Date', value: formatDate(project.start_date) },
          { label: 'Expected Completion', value: formatDate(project.expected_completion) },
          { label: 'Work Type', value: project.work_type },
          { label: 'Status', value: project.status },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          {project.description ? <DocumentTextBlock title="Project Description" value={project.description} /> : null}
          {project.notes ? <DocumentTextBlock title="Notes" value={project.notes} /> : null}
        </div>

        <DocumentAmountBreakdown
          title="Commercial Breakdown"
          rows={[
            { label: 'Contract Value', value: formatCurrency(project.contract_value) },
            { label: 'VAT', value: project.vat_applicable ? formatCurrency(project.vat_amount) : 'Not Applicable' },
          ]}
          totalLabel="Total Amount"
          totalValue={formatCurrency(project.total_amount)}
        />
      </div>
    </DocumentPrintLayout>
  )
}
