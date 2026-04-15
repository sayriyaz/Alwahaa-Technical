import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { Layout, PageHeader } from '@/app/components/Layout'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Table,
  TableHead,
  TableBody,
  TableHeader,
  TableCell,
  TableRow,
  TableEmpty,
} from '@/components/ui/Table'
import { EmptyState } from '@/components/ui/EmptyState'
import { requireAuthenticatedAppUser } from '@/lib/auth'
import {
  getProjects,
  deleteProject,
  updateProject,
  formatCurrency,
  formatDate,
  getProjectStatusClasses,
  PROJECT_STATUSES,
  type ProjectStatus,
  type ProjectFilters,
} from '@/lib/projects'
import { getRolePermissions } from '@/lib/auth-constants'
import { getContractors } from '@/lib/contractors'
import { SearchFilters } from './SearchFilters'

interface ProjectsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const auth = await requireAuthenticatedAppUser()
  const params = await searchParams

  const filters: ProjectFilters = {
    status: (params.status as ProjectStatus) || undefined,
    clientId: (params.clientId as string) || undefined,
    workType: (params.workType as 'Direct' | 'Subcontract') || undefined,
    searchQuery: (params.q as string) || undefined,
  }

  return (
    <Layout>
      <PageHeader
        title="Projects"
        action={
          <Button href="/projects/new" size="md">
            + New Project
          </Button>
        }
      />

      <Suspense fallback={<div className="h-20 bg-slate-100 rounded-lg animate-pulse" />}>
        <FiltersSection />
      </Suspense>

      <Suspense fallback={<ProjectsTableSkeleton />}>
        <ProjectsTable filters={filters} />
      </Suspense>
    </Layout>
  )
}

async function FiltersSection() {
  const auth = await requireAuthenticatedAppUser()
  const clients = await getContractors(auth.db)

  return <SearchFilters clients={clients} />
}

async function ProjectsTable({ filters }: { filters: ProjectFilters }) {
  const auth = await requireAuthenticatedAppUser()
  const permissions = getRolePermissions(auth.appUser.role)
  const projects = await getProjects(auth.db, filters)

  async function updateProjectStatusAction(formData: FormData) {
    'use server'

    const auth = await requireAuthenticatedAppUser()
    const permissions = getRolePermissions(auth.appUser.role)

    if (!permissions.canEditProjects) {
      redirect('/access-denied')
    }

    const projectId = formData.get('project_id') as string
    const statusValue = formData.get('status') as string

    if (!projectId || !PROJECT_STATUSES.includes(statusValue as ProjectStatus)) {
      return
    }

    await updateProject(projectId, { status: statusValue as ProjectStatus }, auth.db)
    redirect('/projects')
  }

  async function deleteProjectAction(formData: FormData) {
    'use server'

    const auth = await requireAuthenticatedAppUser(['admin'])
    const permissions = getRolePermissions(auth.appUser.role)

    if (!permissions.canDeleteProjects) {
      redirect('/access-denied')
    }

    const projectId = formData.get('project_id') as string

    if (!projectId) return

    await deleteProject(projectId, auth.db)
    redirect('/projects')
  }

  if (projects.length === 0) {
    return (
      <Card className="mt-6">
        <EmptyState
          title="No projects found"
          description={
            filters.searchQuery || filters.status
              ? "Try adjusting your search or filters"
              : "Get started by creating your first project"
          }
          action={!filters.searchQuery && !filters.status ? { label: 'New Project', href: '/projects/new' } : undefined}
          icon="📁"
        />
      </Card>
    )
  }

  return (
    <Table className="mt-6">
      <TableHead>
        <TableRow>
          <TableHeader>Project</TableHeader>
          <TableHeader>Client</TableHeader>
          <TableHeader>Contract / Total</TableHeader>
          <TableHeader>Status</TableHeader>
          <TableHeader>Due Date</TableHeader>
          {permissions.canEditProjects && <TableHeader>Actions</TableHeader>}
        </TableRow>
      </TableHead>
      <TableBody>
        {projects.map((project) => (
          <TableRow key={project.id}>
            <TableCell>
              <Link
                href={`/projects/${project.id}`}
                className="font-medium text-slate-900 hover:text-slate-700"
              >
                {project.name}
              </Link>
              <p className="text-xs text-slate-500">{project.project_code}</p>
              <p className="text-xs text-slate-400">{project.location}</p>
            </TableCell>
            <TableCell className="text-slate-600">{project.client_name}</TableCell>
            <TableCell>
              <div className="font-medium text-slate-900">{formatCurrency(project.total_amount)}</div>
              <div className="text-xs text-slate-500">
                Net {formatCurrency(project.contract_value)}
                {project.vat_applicable && ` + VAT ${formatCurrency(project.vat_amount)}`}
              </div>
            </TableCell>
            <TableCell>
              {permissions.canEditProjects ? (
                <form action={updateProjectStatusAction} className="flex items-center gap-2">
                  <input type="hidden" name="project_id" value={project.id} />
                  <select
                    name="status"
                    defaultValue={project.status}
                    className="rounded-lg border-slate-300 px-3 py-1.5 text-sm shadow-sm focus:border-slate-900 focus:ring-slate-900"
                  >
                    {PROJECT_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <Button type="submit" variant="secondary" size="sm">
                    Update
                  </Button>
                </form>
              ) : (
                <Badge
                  variant={
                    project.status === 'Completed'
                      ? 'success'
                      : project.status === 'In Progress'
                        ? 'info'
                        : project.status === 'On Hold'
                          ? 'warning'
                          : 'default'
                  }
                >
                  {project.status}
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-slate-600">
              {formatDate(project.expected_completion)}
            </TableCell>
            {permissions.canEditProjects && (
              <TableCell>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/projects/${project.id}`}
                    className="font-medium text-slate-700 hover:text-slate-900"
                  >
                    Edit
                  </Link>
                  {permissions.canDeleteProjects && (
                    <form action={deleteProjectAction}>
                      <input type="hidden" name="project_id" value={project.id} />
                      <Button type="submit" variant="ghost" size="sm" className="text-rose-600 hover:text-rose-700">
                        Delete
                      </Button>
                    </form>
                  )}
                </div>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function ProjectsTableSkeleton() {
  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="animate-pulse">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-slate-100">
            <div className="h-4 w-32 bg-slate-200 rounded"></div>
            <div className="h-4 w-24 bg-slate-200 rounded"></div>
            <div className="h-4 w-28 bg-slate-200 rounded"></div>
            <div className="h-6 w-20 bg-slate-200 rounded"></div>
            <div className="h-4 w-24 bg-slate-200 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Import Card for empty state
import { Card } from '@/components/ui/Card'
