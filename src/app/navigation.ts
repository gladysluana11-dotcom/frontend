import {
  Banknote,
  BookOpen,
  ClipboardList,
  CreditCard,
  FileBarChart,
  FileText,
  TriangleAlert,
  Tags,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { normalizeRole } from '../features/auth/utils/roles'
import { CASH_CLOSE_ROLES, TARIFF_VIEW_ROLES } from '../features/fees/roles'
import { PAYMENT_VIEW_ROLES } from '../features/payments/roles'
import { DEBT_VIEW_ROLES, REPORT_VIEW_ROLES } from '../features/debts/roles'
import { STUDENT_VIEW_ROLES } from '../features/students/roles'
import {
  ENROLLMENT_MANAGE_ROLES,
  ENROLLMENT_VIEW_ROLES,
} from '../features/enrollments/roles'
import { texts } from '../shared/texts'

export type NavigationItem = {
  id: string
  to: string
  label: string
  icon: LucideIcon
  /** Si se omite, lo ve cualquier usuario con sesión. */
  roles?: string[]
  permission?: string
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
  {
    id: 'enrollments',
    to: '/matriculas',
    label: texts.navigation.enrollments,
    icon: ClipboardList,
    roles: ENROLLMENT_VIEW_ROLES,
  },
  {
    id: 'required-documents',
    to: '/configuracion/documentos',
    label: texts.navigation.requiredDocuments,
    icon: FileText,
    roles: ENROLLMENT_MANAGE_ROLES,
  },
  {
    id: 'payments',
    to: '/pagos',
    label: texts.navigation.payments,
    icon: CreditCard,
    permission: 'pagos.ver',
    roles: PAYMENT_VIEW_ROLES,
  },
  {
    id: 'debts',
    to: '/deudas',
    label: texts.navigation.debts,
    icon: TriangleAlert,
    permission: 'deudas.ver',
    roles: DEBT_VIEW_ROLES,
  },
  {
    id: 'reports',
    to: '/reportes',
    label: texts.navigation.reports,
    icon: FileBarChart,
    permission: 'reportes.ver',
    roles: REPORT_VIEW_ROLES,
  },
  {
    id: 'tariffs',
    to: '/configuracion/tarifas',
    label: texts.navigation.tariffs,
    icon: Tags,
    permission: 'tarifas.ver',
    roles: TARIFF_VIEW_ROLES,
  },
  {
    id: 'cashbox',
    to: '/caja',
    label: texts.navigation.cashbox,
    icon: Banknote,
    permission: 'caja.cerrar',
    roles: CASH_CLOSE_ROLES,
  },
]

/** Filtra el menú por permisos presentes en sesión o, si no existen, por roles. */
export function visibleNavigation(
  userRoles: string[],
  permissions?: string[],
): NavigationItem[] {
  return navigationItems.filter((item) => {
    if (item.permission && permissions !== undefined) {
      return permissions.includes(item.permission)
    }
    return (
      !item.roles ||
      item.roles.some((role) => userRoles.includes(normalizeRole(role)))
    )
  })
}
