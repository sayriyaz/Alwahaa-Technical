import { ReactNode } from 'react'

interface TableProps {
  children: ReactNode
  className?: string
}

export function Table({ children, className = '' }: TableProps) {
  return (
    <div className={`overflow-hidden rounded-xl border border-slate-200 shadow-sm ${className}`}>
      <table className="min-w-full divide-y divide-slate-200">{children}</table>
    </div>
  )
}

export function TableHead({ children }: { children: ReactNode }) {
  return <thead className="bg-slate-50">{children}</thead>
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-slate-200 bg-white">{children}</tbody>
}

interface TableHeaderProps {
  children: ReactNode
  className?: string
}

export function TableHeader({ children, className = '' }: TableHeaderProps) {
  return (
    <th
      className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 ${className}`}
    >
      {children}
    </th>
  )
}

interface TableCellProps {
  children: ReactNode
  className?: string
}

export function TableCell({ children, className = '' }: TableCellProps) {
  return <td className={`whitespace-nowrap px-6 py-4 text-sm ${className}`}>{children}</td>
}

export function TableRow({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <tr className={`hover:bg-slate-50 ${className}`}>{children}</tr>
}

export function TableEmpty({
  colSpan,
  message,
}: {
  colSpan: number
  message: string
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-8 text-center text-slate-500">
        {message}
      </td>
    </tr>
  )
}
