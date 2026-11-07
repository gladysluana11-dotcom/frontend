/**
 * La API devuelve los roles en `usuario.roles`, pero su contrato no describe la forma exacta
 * (lista de textos, lista de objetos o mapa). Estas funciones la aceptan en todas esas formas.
 */

const roleLabels: Record<string, string> = {
  superadministrador: 'Superadministrador',
  director: 'Director',
  administrador: 'Administrador',
  tesoreria: 'Tesorería',
  coordinacion: 'Coordinación',
  docente: 'Docente',
  auxiliar: 'Auxiliar',
  apoderado: 'Apoderado',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** "Tesorería", "tesoreria" y "TESORERIA" se vuelven "tesoreria". */
export function normalizeRole(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s_-]+/g, '')
}

function namesFromEntry(entry: unknown): string[] {
  if (typeof entry === 'string') return [entry]
  if (!isRecord(entry)) return []
  const name = entry.name ?? entry.nombre ?? entry.rol
  return typeof name === 'string' ? [name] : []
}

/** Nombres de rol tal como los envía la API. */
export function extractRoleNames(user: unknown): string[] {
  if (!isRecord(user)) return []
  const raw = user.roles ?? user.rol
  let names: string[] = []

  if (Array.isArray(raw)) {
    names = raw.flatMap(namesFromEntry)
  } else if (isRecord(raw)) {
    names = Object.entries(raw).flatMap(([key, value]) => {
      const inner = namesFromEntry(value)
      return inner.length > 0 ? inner : [key]
    })
  } else if (typeof raw === 'string') {
    names = [raw]
  }

  return [...new Set(names.filter((name) => name.trim().length > 0))]
}

/** Roles normalizados, para comparar. */
export function extractRoles(user: unknown): string[] {
  return [...new Set(extractRoleNames(user).map(normalizeRole))]
}

export function roleLabel(name: string): string {
  return roleLabels[normalizeRole(name)] ?? name.replaceAll('_', ' ')
}

export function primaryRoleLabel(user: unknown, fallback: string): string {
  const [first] = extractRoleNames(user)
  return first ? roleLabel(first) : fallback
}
