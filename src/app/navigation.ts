import { BookOpen, Users, type LucideIcon } from 'lucide-react'
import { normalizeRole } from '../features/auth/utils/roles'
import { STUDENT_VIEW_ROLES } from '../features/students/roles'
import { texts } from '../shared/texts'

export type NavigationItem = {
  id: string
  to: string
  label: string
  icon: LucideIcon
  /** Si se omite, lo ve cualquier usuario con sesión. */
  roles?: string[]
  end?: boolean
}

/** Los módulos nuevos se agregan aquí y aparecen solo para los roles indicados. */
export const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    to: '/',
    label: texts.navigation.dashboard,
    icon: BookOpen,
    end: true,
  },
  {
    id: 'students',
    to: '/alumnos',
    label: texts.navigation.students,
    icon: Users,
    roles: STUDENT_VIEW_ROLES,
  },
]

/** Opciones del menú que puede ver un usuario según sus roles ya normalizados. */
export function visibleNavigation(userRoles: string[]): NavigationItem[] {
  return navigationItems.filter(
    (item) =>
      !item.roles ||
      item.roles.some((role) => userRoles.includes(normalizeRole(role))),
  )
}
