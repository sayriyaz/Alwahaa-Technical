import Link from 'next/link'

export default function AccessDeniedPage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-slate-900">Access Denied</h1>
        <p className="mt-4 text-lg text-slate-600">
          You don&apos;t have permission to access this page.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Go Home
          </Link>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Logout
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
