import type { ReactNode } from 'react'
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
  subtitle?: string | null
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

  return (
    <div className="min-h-full bg-slate-100">
      <main className="print-page mx-auto w-full max-w-[210mm] px-4 py-8 sm:px-6 lg:px-8">
        <div className="screen-only mb-6 flex items-center justify-between gap-4">
          <Link href={backHref} className="text-sm text-slate-600 hover:text-slate-900">
            ← {backLabel}
          </Link>
          <PrintButton label="Print / PDF" />
        </div>

        <section className="print-surface relative isolate flex min-h-[297mm] flex-col rounded-2xl border border-slate-200 bg-white px-[14mm] pb-[14mm] pt-[24mm] shadow-sm">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[26mm]">
            <div className="absolute inset-x-0 top-0 h-[6mm] bg-sky-400" />
            <div className="absolute right-[-8mm] top-[5mm] h-[18mm] w-[86%] rounded-bl-[120mm] bg-sky-400" />
            <div className="absolute right-[-6mm] top-[6mm] h-[3mm] w-[72%] rounded-bl-[120mm] bg-blue-900" />
          </div>

          <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center px-[26mm] pb-[44mm] pt-[34mm]">
            <Image
              src="/print-watermark.png"
              alt=""
              aria-hidden="true"
              width={2048}
              height={612}
              priority
              className="h-auto w-full max-w-[150mm] object-contain opacity-[0.08]"
            />
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[24mm]">
            <div className="absolute inset-x-0 bottom-0 h-[8mm] bg-slate-100" />
            <div className="absolute right-[-10mm] bottom-[7mm] h-[10mm] w-[48%] rounded-tl-[120mm] bg-slate-100" />
            <div className="absolute left-[-6mm] bottom-[7mm] h-[8mm] w-[46%] rounded-tr-[120mm] bg-slate-100/80" />
          </div>

          <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="max-w-[60%] pt-[3mm]">
              <Image
                src="/ats-logo.png"
                alt={COMPANY_PROFILE.brandName}
                width={1080}
                height={445}
                priority
                className="h-[14mm] w-auto max-w-[52mm]"
              />
              <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">{documentLabel}</p>
              <h1 className="mt-1 text-[26px] font-bold leading-none text-slate-900">{documentNumber}</h1>
              <p className="mt-2 text-base font-semibold text-slate-800">{title}</p>
              {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
            </div>

            <div className="w-full max-w-[72mm] text-sm text-slate-700">
              <div className="text-right text-[15px] text-slate-700">
                <span className="font-medium text-slate-900">Date :</span> {documentDate ?? generatedDate}
              </div>
              <div className="mt-3 rounded-xl border border-slate-200 bg-white/76 px-4 py-3 text-[11px] leading-5">
                <div className="font-semibold uppercase tracking-[0.18em] text-slate-500">Issued By</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{COMPANY_PROFILE.legalName}</div>
                <div className="mt-2">
                  <span className="font-medium text-slate-900">TRN:</span> {COMPANY_PROFILE.trn}
                </div>
                <div className="mt-2 whitespace-pre-wrap">{COMPANY_PROFILE.contactDetails.addressLines.join('\n')}</div>
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-[7mm] flex flex-1 flex-col gap-4">
            {children}

            {showBankDetails ? (
              <DocumentBankDetails className="mt-auto" />
            ) : null}
          </div>

          <footer className="relative z-10 mt-[8mm] border-t border-slate-200/80 pt-[4mm]">
            <div className="grid items-end gap-4 text-[11px] leading-[1.5] text-slate-600 md:grid-cols-2">
              <div className="space-y-0.5">
                <div>
                  <span className="font-medium text-slate-900">Phone:</span> {COMPANY_PROFILE.contactDetails.phone}
                </div>
                <div>
                  <span className="font-medium text-slate-900">Mobile:</span> {COMPANY_PROFILE.contactDetails.mobile}
                </div>
              </div>
              <div className="space-y-0.5 md:text-right">
                <div>
                  <span className="font-medium text-slate-900">Email:</span> {COMPANY_PROFILE.contactDetails.emails[0]}
                </div>
                <div>{COMPANY_PROFILE.contactDetails.emails[1]}</div>
                <div>
                  <span className="font-medium text-slate-900">Web:</span> {COMPANY_PROFILE.contactDetails.website}
                </div>
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
        <div key={item.label} className="rounded-xl border border-slate-200 bg-white/56 px-3 py-2.5">
          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">{item.label}</div>
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
    <section className="document-keep-together rounded-xl border border-slate-200 bg-white/68 px-4 py-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</h2>
      <dl className="mt-3 space-y-2 text-sm text-slate-700">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4">
            <dt>{row.label}</dt>
            <dd className="font-medium text-slate-900">{row.value}</dd>
          </div>
        ))}
        <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-2 text-base">
          <dt className="font-semibold text-slate-900">{totalLabel}</dt>
          <dd className="font-bold text-slate-900">{totalValue}</dd>
        </div>
      </dl>
    </section>
  )
}

export function DocumentTextBlock({ title, value }: { title: string; value: string }) {
  return (
    <section className="document-keep-together rounded-xl border border-slate-200 bg-white/56 px-4 py-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</h2>
      <div className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{value}</div>
    </section>
  )
}

export function DocumentBankDetails({ className = '' }: { className?: string }) {
  return (
    <section className={`document-keep-together rounded-xl border border-slate-200 bg-white/78 px-4 py-3 ${className}`}>
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Bank Details</h2>
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
