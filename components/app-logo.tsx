import Image from 'next/image'
import Link from 'next/link'

type AppLogoProps = {
  className?: string
  priority?: boolean
  variant?: 'header' | 'hero'
}

export function AppLogo({
  className = '',
  priority = false,
  variant = 'header',
}: AppLogoProps) {
  const shouldLoadEagerly = priority || variant === 'header'
  const wrapperClassName =
    variant === 'hero'
      ? 'inline-flex items-center transition-opacity hover:opacity-90'
      : 'inline-flex items-center rounded-xl bg-white px-2.5 py-1.5 shadow-sm ring-1 ring-slate-200 transition-opacity hover:opacity-90'

  const imageClassName =
    variant === 'hero'
      ? 'h-16 w-auto max-w-[280px] sm:h-20 sm:max-w-[360px] md:h-24 md:max-w-[420px]'
      : 'h-7 w-auto max-w-[140px] sm:h-8 sm:max-w-[165px] md:h-9 md:max-w-[190px]'

  const sizes =
    variant === 'hero'
      ? '(min-width: 768px) 420px, (min-width: 640px) 360px, 280px'
      : '(min-width: 768px) 190px, (min-width: 640px) 165px, 140px'

  return (
    <Link
      href="/"
      aria-label="Go to home page"
      className={`${wrapperClassName} ${className}`}
    >
      <Image
        src="/ats-logo.png"
        alt="Alwahaa Technical Services"
        width={1080}
        height={445}
        priority={priority}
        loading={shouldLoadEagerly ? 'eager' : undefined}
        sizes={sizes}
        className={imageClassName}
      />
    </Link>
  )
}
