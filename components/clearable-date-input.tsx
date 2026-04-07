'use client'

import { useState } from 'react'

type ClearableDateInputProps = {
  id: string
  name: string
  defaultValue?: string
  className: string
}

export function ClearableDateInput({
  id,
  name,
  defaultValue = '',
  className,
}: ClearableDateInputProps) {
  const [value, setValue] = useState(defaultValue)

  return (
    <div className="space-y-2">
      <input
        id={id}
        name={name}
        type="date"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className={className}
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">Leave this blank until the phase is actually completed.</p>
        <button
          type="button"
          onClick={() => setValue('')}
          className="text-xs font-medium text-slate-600 underline hover:text-slate-900"
        >
          Clear
        </button>
      </div>
    </div>
  )
}
