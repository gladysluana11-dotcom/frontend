import type { ReactNode } from 'react'

type PageFrameProps = {
  eyebrow?: string
  title: string
  description?: string
  children: ReactNode
}

export function PageFrame({
  eyebrow,
  title,
  description,
  children,
}: PageFrameProps) {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      {eyebrow ? (
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--school-primary)]">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
      {description ? (
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          {description}
        </p>
      ) : null}
      <div className="mt-6">{children}</div>
    </section>
  )
}
