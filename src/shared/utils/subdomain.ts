const reservedHostLabels = new Set(['www', 'api', 'localhost'])

export function resolveSchoolSubdomain(
  hostname: string,
  mode: string,
  developmentSubdomain: string | undefined,
): string {
  if (mode === 'development') return developmentSubdomain?.trim() ?? ''

  const normalizedHost = hostname.toLowerCase().replace(/\.$/, '')
  if (
    reservedHostLabels.has(normalizedHost) ||
    /^\d{1,3}(?:\.\d{1,3}){3}$/.test(normalizedHost)
  ) {
    return ''
  }

  return normalizedHost.split('.')[0] ?? ''
}

/**
 * Subdominio que se envía en el login. El backend lo exige solo en desarrollo local;
 * en los subdominios reales valida contra el origen de la SPA.
 */
export function getLoginSubdomain(): string | undefined {
  if (import.meta.env.MODE !== 'development') return undefined
  const subdomain = import.meta.env.VITE_SUBDOMINIO_DEV?.trim()
  return subdomain ? subdomain : undefined
}

export function getCurrentSchoolSubdomain(): string {
  return resolveSchoolSubdomain(
    window.location.hostname,
    import.meta.env.MODE,
    import.meta.env.VITE_SUBDOMINIO_DEV,
  )
}
