'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { PROJECT_STATUSES, PROJECT_WORK_TYPES } from '@/lib/projects'
import type { Contractor } from '@/lib/contractors'

interface SearchFiltersProps {
  clients: Contractor[]
}

export function SearchFilters({ clients }: SearchFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [status, setStatus] = useState(searchParams.get('status') || '')
  const [clientId, setClientId] = useState(searchParams.get('clientId') || '')
  const [workType, setWorkType] = useState(searchParams.get('workType') || '')

  const createQueryString = useCallback(
    (params: Record<string, string | null>) => {
      const newParams = new URLSearchParams(searchParams.toString())

      Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === '') {
          newParams.delete(key)
        } else {
          newParams.set(key, value)
        }
      })

      return newParams.toString()
    },
    [searchParams]
  )

  const handleSearch = useCallback(
    (value: string) => {
      setSearchQuery(value)
      const queryString = createQueryString({ q: value || null })
      router.push(`/projects?${queryString}`, { scroll: false })
    },
    [createQueryString, router]
  )

  const handleFilterChange = useCallback(
    (key: string, value: string) => {
      const queryString = createQueryString({ [key]: value || null })
      router.push(`/projects?${queryString}`, { scroll: false })
    },
    [createQueryString, router]
  )

  const handleClear = () => {
    setSearchQuery('')
    setStatus('')
    setClientId('')
    setWorkType('')
    router.push('/projects', { scroll: false })
  }

  const hasFilters = searchQuery || status || clientId || workType

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <Input
              type="text"
              placeholder="Search projects by name, code, or location..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              handleFilterChange('status', e.target.value)
            }}
            options={[
              { value: '', label: 'All Statuses' },
              ...PROJECT_STATUSES.map((s) => ({ value: s, label: s })),
            ]}
            className="w-40"
          />

          <Select
            value={workType}
            onChange={(e) => {
              setWorkType(e.target.value)
              handleFilterChange('workType', e.target.value)
            }}
            options={[
              { value: '', label: 'All Types' },
              ...PROJECT_WORK_TYPES.map((t) => ({ value: t, label: t })),
            ]}
            className="w-32"
          />

          {hasFilters && (
            <Button variant="ghost" onClick={handleClear}>
              Clear
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
