const reservedHostLabels = new Set(['www', 'api', 'localhost'])

export function resolveSchoolSubdomain(
  hostname: string,
  developmentSubdomain: string | undefined,
): string {
  const configuredSubdomain = developmentSubdomain?.trim()
  if (configuredSubdomain) return configuredSubdomain

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
 * Subdominio que se envía en el login, según la configuración o el hostname actual.
 */
export function getLoginSubdomain(): string | undefined {
  const subdomain = resolveSchoolSubdomain(
    window.location.hostname,
    import.meta.env.VITE_SUBDOMINIO_DEV,
  )
  return subdomain ? subdomain : undefined
}

export function getCurrentSchoolSubdomain(): string {
  return resolveSchoolSubdomain(
    window.location.hostname,
    import.meta.env.VITE_SUBDOMINIO_DEV,
  )
}
