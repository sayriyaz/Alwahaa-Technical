import type { CSSProperties, ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { PrintButton } from '@/components/print-button'
import { COMPANY_PROFILE } from '@/lib/company'

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
}

type DocumentTheme = {
  accent: string
  accentDark: string
  accentSoft: string
  badgeBorder: string
}

function getDocumentTheme(documentLabel: string): DocumentTheme {
  const label = documentLabel.toLowerCase()

  if (label.includes('receipt')) {
    return {
      accent: '#0a9e6e',
      accentDark: '#06664a',
      accentSoft: '#e8f8f3',
      badgeBorder: '#bbf7d0',
    }
  }

  if (label.includes('vendor payment')) {
    return {
      accent: '#7c3aed',
      accentDark: '#5b21b6',
      accentSoft: '#f3f0ff',
      badgeBorder: '#ddd6fe',
    }
  }

  if (label.includes('purchase order')) {
    return {
      accent: '#d97706',
      accentDark: '#9a3412',
      accentSoft: '#fff8e8',
      badgeBorder: '#fde68a',
    }
  }

  return {
    accent: '#0e7cb8',
    accentDark: '#0a5a8a',
    accentSoft: '#e8f4fb',
    badgeBorder: '#bfdbfe',
  }
}

function getPartyLabel(documentLabel: string) {
  const label = documentLabel.toLowerCase()

  if (label.includes('purchase order')) return 'Vendor'
  if (label.includes('vendor payment')) return 'Paid To'
  if (label.includes('receipt')) return 'Received From'
  return 'Billed To'
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
  const generatedDate = new Date().toLocaleDateString('en-AE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const theme = getDocumentTheme(documentLabel)
  const sectionStyle = {
    '--doc-accent': theme.accent,
    '--doc-accent-dark': theme.accentDark,
    '--doc-accent-soft': theme.accentSoft,
    '--doc-accent-border': theme.badgeBorder,
  } as CSSProperties
  const address = COMPANY_PROFILE.contactDetails.addressLines.join('\n')

  return (
    <div className="min-h-full bg-slate-100">
      <main className="print-page mx-auto w-full max-w-[210mm] px-4 py-8 sm:px-6 lg:px-8">
        <div className="screen-only mb-6 flex items-center justify-between gap-4">
          <Link href={backHref} className="text-sm text-slate-600 hover:text-slate-900">
            ← {backLabel}
          </Link>
          <PrintButton label="Print / PDF" />
        </div>

        <section
          className="print-surface relative isolate flex min-h-[297mm] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          style={sectionStyle}
        >
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-[8px]"
            style={{ background: `linear-gradient(90deg, ${theme.accent} 0%, ${theme.accentDark} 64%, ${theme.accent} 100%)` }}
          />

          <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center px-[20mm]">
            <Image
              src="/print-watermark.png"
              alt=""
              aria-hidden="true"
              width={1400}
              height={1400}
              priority
              className="h-auto w-full max-w-[128mm] -rotate-[18deg] object-contain opacity-[0.045]"
            />
          </div>

          <header className="relative z-10 border-b border-slate-200 px-[14mm] pb-[6mm] pt-[12mm]">
            <div className="flex items-start justify-between gap-[8mm]">
              <div className="max-w-[92mm]">
                <Image
                  src="/ats-logo.png"
                  alt={COMPANY_PROFILE.brandName}
                  width={1080}
                  height={445}
                  priority
                  className="h-[13mm] w-auto max-w-[52mm] object-contain object-left"
                />
                <div className="mt-2 text-[13px] font-bold text-slate-900">{COMPANY_PROFILE.legalName}</div>
                <div className="mt-1 text-[9px] font-medium text-slate-600">TRN: {COMPANY_PROFILE.trn}</div>
                <div className="mt-1 whitespace-pre-wrap text-[9.5px] leading-[1.55] text-slate-600">{address}</div>
              </div>

              <div className="max-w-[74mm] text-right">
                <div
                  className="inline-flex rounded-full border px-3 py-1 text-[9px] font-bold uppercase tracking-[0.22em]"
                  style={{
                    backgroundColor: theme.accentSoft,
                    borderColor: theme.badgeBorder,
                    color: theme.accent,
                  }}
                >
                  {documentLabel}
                </div>
                <div className="mt-2 text-[24px] font-extrabold leading-none tracking-tight" style={{ color: theme.accent }}>
                  {documentNumber}
                </div>
                <div className="mt-3 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">Date</div>
                <div className="text-[13px] font-semibold text-slate-900">{documentDate ?? generatedDate}</div>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-[0_1px_0_rgba(15,23,42,0.02)]">
              <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">{getPartyLabel(documentLabel)}</div>
              <div className="mt-1 text-[15px] font-bold text-slate-900">{title}</div>
              {subtitle ? <div className="mt-1 text-[11px] leading-[1.7] text-slate-600">{subtitle}</div> : null}
            </div>
          </header>

          <div className="relative z-10 flex flex-1 flex-col gap-5 px-[14mm] py-[6mm]">
            {children}

            {showBankDetails ? (
              <DocumentBankDetails className="mt-auto" />
            ) : null}
          </div>

          <footer className="relative z-10 mt-auto">
            <div
              className="h-[4px]"
              style={{ background: `linear-gradient(90deg, ${theme.accent} 0%, ${theme.accentDark} 64%, ${theme.accent} 100%)` }}
            />
            <div className="grid items-center gap-4 border-t border-slate-200 bg-slate-50 px-[14mm] py-[4mm] text-[10px] leading-[1.5] text-slate-600 md:grid-cols-[1fr_auto_1fr]">
              <div className="space-y-0.5">
                <div>
                  <span className="font-medium text-slate-900">Phone:</span> {COMPANY_PROFILE.contactDetails.phone}
                </div>
                <div>
                  <span className="font-medium text-slate-900">Mobile:</span> {COMPANY_PROFILE.contactDetails.mobile}
                </div>
              </div>
              <div className="text-center text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                {COMPANY_PROFILE.tagline}
              </div>
              <div className="space-y-0.5 md:text-right">
                <div>{COMPANY_PROFILE.contactDetails.emails[0]}</div>
                <div>{COMPANY_PROFILE.contactDetails.emails[1]}</div>
                <div>{COMPANY_PROFILE.contactDetails.website}</div>
              </div>
            </div>
          </footer>
        </section>
      </main>
    </div>
  )
}

export function DocumentInfoGrid({ items, columns = 3 }: DocumentInfoGridProps) {
  return (
    <section className="document-info-grid document-keep-together grid gap-4" data-columns={columns}>
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-[0_1px_0_rgba(15,23,42,0.02)]">
          <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">{item.label}</div>
          <div className="mt-1 text-sm font-medium text-slate-900">{item.value}</div>
        </div>
      ))}
    </section>
  )
}

export function DocumentAmountBreakdown({
  title = 'Amount Breakdown',
  rows,
  totalLabel,
  totalValue,
}: DocumentAmountBreakdownProps) {
  return (
    <section className="document-keep-together overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_0_rgba(15,23,42,0.02)]">
      <div className="border-b border-slate-200 px-4 py-3" style={{ backgroundColor: 'var(--doc-accent-soft)' }}>
        <h2 className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--doc-accent)' }}>
          {title}
        </h2>
      </div>
      <dl className="space-y-0 px-4 py-1 text-sm text-slate-700">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4 border-b border-slate-200 py-2.5 last:border-b-0">
            <dt>{row.label}</dt>
            <dd className="font-medium text-slate-900">{row.value}</dd>
          </div>
        ))}
        <div
          className="mt-1 flex items-center justify-between gap-4 px-4 py-3 text-base"
          style={{ backgroundColor: 'var(--doc-accent)', color: '#ffffff' }}
        >
          <dt className="font-semibold">{totalLabel}</dt>
          <dd className="font-bold">{totalValue}</dd>
        </div>
      </dl>
    </section>
  )
}

export function DocumentTextBlock({ title, value }: { title: string; value: string }) {
  return (
    <section className="document-keep-together rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-[0_1px_0_rgba(15,23,42,0.02)]">
      <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{title}</h2>
      <div className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{value}</div>
    </section>
  )
}

export function DocumentBankDetails({ className = '' }: { className?: string }) {
  return (
    <section className={`document-keep-together rounded-xl border border-slate-200 bg-[#f8fbfd] px-4 py-3 shadow-[0_1px_0_rgba(15,23,42,0.02)] ${className}`}>
      <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Bank Details</h2>
      <dl className="mt-2 grid gap-x-4 gap-y-2 text-[11px] text-slate-700 md:grid-cols-2">
        <div>
          <dt className="font-medium text-slate-500">Account Name</dt>
          <dd className="mt-0.5 font-medium text-slate-900">{COMPANY_PROFILE.bankDetails.accountName}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-500">Account Number</dt>
          <dd className="mt-0.5 font-medium text-slate-900">{COMPANY_PROFILE.bankDetails.accountNumber}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-500">IBAN</dt>
          <dd className="mt-0.5 font-medium text-slate-900">{COMPANY_PROFILE.bankDetails.iban}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-500">Bank</dt>
          <dd className="mt-0.5 font-medium text-slate-900">{COMPANY_PROFILE.bankDetails.bankName}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-500">SWIFT Code</dt>
          <dd className="mt-0.5 font-medium text-slate-900">{COMPANY_PROFILE.bankDetails.swiftCode}</dd>
        </div>
      </dl>
    </section>
  )
}
