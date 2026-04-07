'use client'

import { useState, useCallback, FormEvent } from 'react'
import { validateForm, ValidationSchema, ValidationErrors } from '@/lib/validation'
import { Button } from './Button'

interface FormProps {
  children: React.ReactNode
  onSubmit: (data: FormData) => Promise<void> | void
  validationSchema?: ValidationSchema
  className?: string
  submitLabel?: string
  isLoading?: boolean
  error?: string | null
}

export function Form({
  children,
  onSubmit,
  validationSchema,
  className = '',
  submitLabel = 'Submit',
  isLoading = false,
  error,
}: FormProps) {
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(error || null)

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      setSubmitError(null)

      const formData = new FormData(e.currentTarget)
      const data: Record<string, string> = {}

      formData.forEach((value, key) => {
        data[key] = String(value)
      })

      if (validationSchema) {
        const validationErrors = validateForm(data, validationSchema)
        if (Object.keys(validationErrors).length > 0) {
          setErrors(validationErrors)
          return
        }
      }

      setErrors({})

      try {
        await onSubmit(formData)
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'An error occurred')
      }
    },
    [onSubmit, validationSchema]
  )

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
      {(submitError || error) && (
        <div className="rounded-lg bg-rose-50 p-4 text-sm text-rose-600">
          <div className="flex items-start gap-3">
            <svg
              className="h-5 w-5 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{submitError || error}</span>
          </div>
        </div>
      )}

      <div className="space-y-4">{children}</div>

      <div className="flex items-center gap-4 pt-2">
        <Button type="submit" isLoading={isLoading}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}

export function FormSection({
  title,
  children,
  description,
}: {
  title: string
  children: React.ReactNode
  description?: string
}) {
  return (
    <div className="border-b border-slate-200 pb-6">
      <h3 className="text-lg font-medium text-slate-900">{title}</h3>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </div>
  )
}

export function FormActions({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`flex items-center gap-4 pt-4 ${className}`}>
      {children}
    </div>
  )
}
