import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  )
}

interface CardHeaderProps {
  title: string
  action?: ReactNode
  className?: string
}

export function CardHeader({ title, action, className = '' }: CardHeaderProps) {
  return (
    <div className={`flex items-center justify-between border-b border-slate-200 px-6 py-4 ${className}`}>
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {action}
    </div>
  )
}

export function CardBody({ children, className = '' }: CardProps) {
  return <div className={`p-6 ${className}`}>{children}</div>
}

export function CardFooter({ children, className = '' }: CardProps) {
  return (
    <div className={`border-t border-slate-200 px-6 py-4 ${className}`}>
      {children}
    </div>
  )
}
