import { useCallback, useState } from 'react'
import { BookOpen, GraduationCap, LogOut, Menu, X } from 'lucide-react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { logout, type SessionUser } from '../features/auth/api/auth-api'
import { useSession, sessionQueryKey } from '../features/auth/hooks/use-session'
import { texts } from '../shared/texts'
import { Button } from '../shared/ui/button'
import { StatusState } from '../shared/ui/status-state'
import {
  getSchoolLogoUrl,
  useIdentity,
} from '../features/identity/hooks/use-identity'
import type { SchoolIdentity } from '../features/identity/api/identity-api'
import { primaryRoleLabel } from '../features/auth/utils/roles'
import { queryClient } from './query-client'

function userRole(user: SessionUser): string {
  return primaryRoleLabel(user, texts.auth.userFallback)
}

export default function AppShell() {
  const { data: user } = useSession()
  const { data: identity } = useIdentity()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const finishSession = useCallback(() => {
    queryClient.setQueryData(sessionQueryKey, null)
    navigate('/login', {
      replace: true,
      state: {
        from: `${location.pathname}${location.search}${location.hash}`,
      },
    })
  }, [location.hash, location.pathname, location.search, navigate])

  const closeSession = useCallback(async () => {
    try {
      await logout()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : texts.errors.logout)
    } finally {
      finishSession()
    }
  }, [finishSession])

  if (!user) return <StatusState state="loading" />

  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-64 shrink-0 border-r bg-white md:flex md:flex-col">
        <Brand identity={identity} />
        <nav
          aria-label={texts.navigation.primaryNavigation}
          className="space-y-1 px-3 py-5"
        >
          <DashboardLink onNavigate={() => setMenuOpen(false)} />
        </nav>
        <p className="mt-auto px-5 pb-5 text-xs text-muted-foreground">
          {texts.navigation.futureModules}
        </p>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b bg-white px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Button
              className="md:hidden"
              size="icon"
              variant="ghost"
              type="button"
              aria-label={
                menuOpen
                  ? texts.navigation.closeMenu
                  : texts.navigation.openMenu
              }
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? (
                <X aria-hidden="true" />
              ) : (
                <Menu aria-hidden="true" />
              )}
            </Button>
            <span className="font-semibold md:hidden">
              {identity?.nombre ?? texts.appName}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">
                {user.nombre} {user.apellido}
              </p>
              <p className="text-xs capitalize text-muted-foreground">
                {userRole(user)}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void closeSession()}
            >
              <LogOut aria-hidden="true" className="size-4" />
              <span className="hidden sm:inline">
                {texts.navigation.logout}
              </span>
            </Button>
          </div>
        </header>

        {menuOpen ? (
          <div className="border-b bg-white px-3 py-3 md:hidden">
            <nav aria-label={texts.navigation.mobileNavigation}>
              <DashboardLink onNavigate={() => setMenuOpen(false)} />
            </nav>
          </div>
        ) : null}

        <main className="min-h-[calc(100vh-4rem)]">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function Brand({ identity }: { identity: SchoolIdentity | undefined }) {
  const logo = getSchoolLogoUrl(identity?.logo ?? null)

  return (
    <div className="flex min-h-16 items-center gap-3 border-b px-5">
      {logo ? (
        <img
          src={logo}
          alt={`Logo de ${identity?.nombre ?? texts.appName}`}
          className="size-9 rounded-lg object-contain"
        />
      ) : (
        <span className="flex size-9 items-center justify-center rounded-lg bg-[var(--school-secondary)] text-[var(--school-primary)]">
          <GraduationCap aria-hidden="true" className="size-5" />
        </span>
      )}
      <span className="font-semibold leading-tight">
        {identity?.nombre ?? texts.appName}
      </span>
    </div>
  )
}

function DashboardLink({ onNavigate }: { onNavigate: () => void }) {
  return (
    <NavLink
      to="/"
      end
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${
          isActive
            ? 'bg-[var(--school-secondary)] text-[var(--school-primary)]'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`
      }
    >
      <BookOpen aria-hidden="true" className="size-4" />
      {texts.navigation.dashboard}
    </NavLink>
  )
}
