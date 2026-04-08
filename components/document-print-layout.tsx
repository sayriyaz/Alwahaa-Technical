import type { ReactNode } from 'react'
import Link from 'next/link'
import { PrintButton } from '@/components/print-button'
import { COMPANY_PROFILE } from '@/lib/company'
import { amountToWords } from '@/lib/amount-to-words'

type DocumentPrintLayoutProps = {
  backHref: string
  backLabel: string
  documentLabel: string
  documentNumber: string
  title: string
  subtitle?: ReactNode
  documentDate?: ReactNode
  showBankDetails?: boolean
  children: ReactNode
}

type DocumentInfoItem = {
  label: string
  value: ReactNode
}

type DocumentInfoGridProps = {
  items: DocumentInfoItem[]
  columns?: 2 | 3 | 4
}

type DocumentAmountBreakdownProps = {
  title?: string
  rows: DocumentInfoItem[]
  totalLabel: string
  totalValue: ReactNode
  totalAmount?: number
}

type DocumentTheme = {
  accent: string
  accentDark: string
  accentSoft: string
  badgeBorder: string
  badgeText: string
}

function getDocumentTheme(documentLabel: string): DocumentTheme {
  switch (documentLabel.toLowerCase()) {
    case 'purchase order':
    case 'vendor payment':
      return {
        accent: '#1a4d8a',
        accentDark: '#0d2d5a',
        accentSoft: '#e8eef7',
        badgeBorder: '#1a4d8a',
        badgeText: '#1a4d8a',
      }
    case 'receipt':
    case 'invoice':
    default:
      return {
        accent: '#0e7cb8',
        accentDark: '#0a5a8a',
        accentSoft: '#e6f4fb',
        badgeBorder: '#0e7cb8',
        badgeText: '#0e7cb8',
      }
  }
}

export function DocumentPrintLayout({
  backHref,
  backLabel,
  documentLabel,
  documentNumber,
  title,
  subtitle,
  documentDate,
  showBankDetails = false,
  children,
}: DocumentPrintLayoutProps) {
  const theme = getDocumentTheme(documentLabel)

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      {/* Screen-only controls */}
      <div className="mx-auto max-w-4xl px-4 py-4 print:hidden">
        <div className="flex items-center justify-between">
          <Link href={backHref} className="text-sm text-slate-600 hover:text-slate-900">
            ← {backLabel}
          </Link>
          <PrintButton />
        </div>
      </div>

      {/* Document */}
      <div
        className="mx-auto max-w-4xl bg-white shadow-lg print:shadow-none print:max-w-none"
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        {/* Top accent stripe */}
        <div style={{ height: '6px', background: `linear-gradient(90deg, ${theme.accentDark} 0%, ${theme.accent} 100%)` }} />

        {/* Header */}
        <div className="flex items-stretch justify-between px-10 py-6" style={{ background: '#fff' }}>
          {/* Left: Logo + company name */}
          <div className="flex flex-col justify-center gap-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/ats-logo.png"
              alt={COMPANY_PROFILE.legalName}
              style={{ height: '64px', width: 'auto', objectFit: 'contain' }}
            />
          </div>

          {/* Right: Document badge */}
          <div
            className="flex flex-col items-end justify-center rounded-xl px-6 py-4 text-right"
            style={{ background: theme.accentSoft, minWidth: '220px' }}
          >
            <div
              className="mb-1 inline-block rounded px-3 py-1 text-xs font-bold uppercase tracking-widest"
              style={{ border: `1.5px solid ${theme.badgeBorder}`, color: theme.badgeText, background: '#fff' }}
            >
              {documentLabel}
            </div>
            <div className="text-2xl font-extrabold tracking-tight" style={{ color: theme.accentDark }}>
              {documentNumber}
            </div>
            {title && (
              <div className="mt-0.5 text-sm font-medium text-slate-600">{title}</div>
            )}
            {subtitle && <div className="mt-0.5 text-xs text-slate-500">{subtitle}</div>}
            {documentDate && (
              <div className="mt-2 text-xs text-slate-500">{documentDate}</div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: '2px', background: `linear-gradient(90deg, ${theme.accent} 0%, ${theme.accentSoft} 100%)`, margin: '0 40px' }} />

        {/* Body */}
        <div className="px-10 py-6">
          {children}
        </div>

        {/* Tagline row */}
        <div
          className="px-10 py-3 text-center text-xs"
          style={{ background: theme.accentSoft, color: theme.accentDark, fontStyle: 'italic' }}
        >
          Thank you for your business — Building Excellence, Delivering Trust
        </div>

        {/* Footer contact bar */}
        <div
          className="px-10 py-4 text-xs text-white"
          style={{ background: theme.accentDark }}
        >
          {/* Row 1: contact details */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1">
            <span className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.62 3.48 2 2 0 0 1 3.59 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.38a16 16 0 0 0 6 6l1.27-.89a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.02z"/></svg>
              {COMPANY_PROFILE.contactDetails.phone}
            </span>
            <span className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
              {COMPANY_PROFILE.contactDetails.mobile}
            </span>
            <span className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              {COMPANY_PROFILE.contactDetails.emails[0]}
            </span>
            <span className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              {COMPANY_PROFILE.contactDetails.website}
            </span>
          </div>
          {/* Row 2: address */}
          <div className="mt-1.5 flex items-center justify-center gap-1.5 opacity-80">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span>{COMPANY_PROFILE.contactDetails.addressLines.slice(0, 3).join(' ')}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function DocumentInfoGrid({ items, columns = 2 }: DocumentInfoGridProps) {
  const colClass = columns === 4 ? 'grid-cols-4' : columns === 3 ? 'grid-cols-3' : 'grid-cols-2'
  return (
    <div className={`grid gap-4 ${colClass}`}>
      {items.map((item, i) => (
        <div key={i}>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">{item.label}</div>
          <div className="mt-0.5 text-sm font-medium text-slate-800">{item.value || '—'}</div>
        </div>
      ))}
    </div>
  )
}

export function DocumentBilledTo({ name, address, trn }: { name: string; address?: string | null; trn?: string | null }) {
  return (
    <div className="mb-6 flex items-stretch gap-0">
      <div className="w-1 rounded-l" style={{ background: '#0e7cb8', minHeight: '60px' }} />
      <div className="rounded-r border border-l-0 border-slate-200 bg-slate-50 px-5 py-4">
        <div className="text-xs font-bold uppercase tracking-widest text-slate-400">Billed To</div>
        <div className="mt-1 text-base font-bold text-slate-900">{name}</div>
        {address && <div className="mt-0.5 text-sm text-slate-500">{address}</div>}
        {trn && <div className="mt-0.5 text-xs text-slate-400">TRN: {trn}</div>}
      </div>
    </div>
  )
}

export function DocumentTextBlock({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</div>
      <div className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{value}</div>
    </div>
  )
}

export function DocumentBankDetails({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 ${className}`}>
      <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Bank Details</div>
      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 text-xs text-slate-700">
        <div>
          <div className="font-medium text-slate-500">Account Name</div>
          <div className="mt-0.5 font-semibold text-slate-900">{COMPANY_PROFILE.bankDetails.accountName}</div>
        </div>
        <div>
          <div className="font-medium text-slate-500">Account Number</div>
          <div className="mt-0.5 font-semibold text-slate-900">{COMPANY_PROFILE.bankDetails.accountNumber}</div>
        </div>
        <div>
          <div className="font-medium text-slate-500">IBAN</div>
          <div className="mt-0.5 font-semibold text-slate-900">{COMPANY_PROFILE.bankDetails.iban}</div>
        </div>
        <div>
          <div className="font-medium text-slate-500">Bank</div>
          <div className="mt-0.5 font-semibold text-slate-900">{COMPANY_PROFILE.bankDetails.bankName}</div>
        </div>
        <div>
          <div className="font-medium text-slate-500">SWIFT Code</div>
          <div className="mt-0.5 font-semibold text-slate-900">{COMPANY_PROFILE.bankDetails.swiftCode}</div>
        </div>
      </div>
    </div>
  )
}

export function DocumentAmountBreakdown({
  title = 'Payment Summary',
  rows,
  totalLabel,
  totalValue,
  totalAmount,
}: DocumentAmountBreakdownProps) {
  return (
    <div className="mt-6">
      <div className="ml-auto max-w-[100mm]">
        {title && <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">{title}</div>}
        <div className="overflow-hidden rounded-lg border border-slate-200">
          {rows.map((row, i) => (
            <div key={i} className="flex justify-between border-b border-slate-100 px-4 py-2 text-sm last:border-b-0">
              <span className="text-slate-500">{row.label}</span>
              <span className="font-medium text-slate-800">{row.value}</span>
            </div>
          ))}
          <div className="flex justify-between px-4 py-3 text-sm font-bold" style={{ background: '#e8eef7' }}>
            <span className="whitespace-nowrap text-slate-700">{totalLabel}</span>
            <span className="whitespace-nowrap text-slate-900">{totalValue}</span>
          </div>
        </div>
        {totalAmount !== undefined && totalAmount > 0 && (
          <div className="mt-3 rounded border border-dashed border-slate-300 px-4 py-3 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Amount in Words: </span>
            {amountToWords(totalAmount)}
          </div>
        )}
      </div>
    </div>
  )
}
