import type { FormHTMLAttributes, ReactNode } from 'react'
import { useIdentity } from '../../identity/hooks/use-identity'
import { getSchoolLogoUrl } from '../../identity/hooks/use-identity'
import { texts } from '../../../shared/texts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../shared/ui/card'

type AuthFrameProps = {
  title: string
  description: string
  children: ReactNode
  formProps?: FormHTMLAttributes<HTMLFormElement>
}

export function AuthFrame({
  title,
  description,
  children,
  formProps,
}: AuthFrameProps) {
  const { data: identity } = useIdentity()
  const logo = getSchoolLogoUrl(identity?.logo ?? null)

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          {logo ? (
            <img
              src={logo}
              alt={`${texts.identity.logoAlt} ${identity?.nombre ?? texts.appName}`}
              className="mb-4 size-16 rounded-lg object-contain"
            />
          ) : (
            <div
              aria-hidden="true"
              className="mb-4 flex size-16 items-center justify-center rounded-xl bg-[var(--school-secondary)] text-lg font-bold text-[var(--school-primary)]"
            >
              SGE
            </div>
          )}
          <p className="font-semibold">{identity?.nombre ?? texts.appName}</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" noValidate {...formProps}>
              {children}
            </form>
          </CardContent>
        </Card>
        <p className="mt-5 text-center text-xs text-muted-foreground">
          {texts.auth.accessLabel}
        </p>
      </div>
    </main>
  )
}
