import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ApiError } from '../../../shared/api/errors'
import { apiBaseUrl } from '../../../shared/api/client'
import { getCurrentSchoolSubdomain } from '../../../shared/utils/subdomain'
import { fetchSchoolIdentity, type SchoolIdentity } from '../api/identity-api'

export const identityQueryKey = ['school', 'identity'] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toCssColor(value: unknown): string | undefined {
  if (
    typeof value !== 'string' ||
    typeof CSS === 'undefined' ||
    !CSS.supports('color', value)
  ) {
    return undefined
  }
  return value
}

function colorName(value: unknown): 'primary' | 'secondary' | undefined {
  if (typeof value !== 'string') return undefined
  const name = value.toLowerCase()
  if (['primary', 'primario', 'principal'].includes(name)) return 'primary'
  if (['secondary', 'secundario'].includes(name)) return 'secondary'
  return undefined
}

function extractColors(
  colors: unknown[],
): Partial<Record<'primary' | 'secondary', string>> {
  const result: Partial<Record<'primary' | 'secondary', string>> = {}
  let unkeyedColorIndex = 0

  for (const entry of colors) {
    if (typeof entry === 'string') {
      const value = toCssColor(entry)
      const name = unkeyedColorIndex === 0 ? 'primary' : 'secondary'
      unkeyedColorIndex += 1
      if (value) result[name] = value
      continue
    }
    if (!isRecord(entry)) continue

    const name = colorName(
      entry.name ?? entry.nombre ?? entry.key ?? entry.clave,
    )
    const value = toCssColor(entry.value ?? entry.valor ?? entry.color)
    if (name && value) result[name] = value

    const primary = toCssColor(entry.primary ?? entry.primario)
    const secondary = toCssColor(entry.secondary ?? entry.secundario)
    if (primary) result.primary = primary
    if (secondary) result.secondary = secondary
  }

  return result
}

export function useIdentity() {
  const subdomain = getCurrentSchoolSubdomain()
  const query = useQuery({
    queryKey: [...identityQueryKey, subdomain],
    queryFn: () => fetchSchoolIdentity(subdomain),
    enabled: subdomain.length > 0,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) =>
      !(error instanceof ApiError) && failureCount < 1,
  })

  return { ...query, subdomain }
}

export function useApplySchoolIdentity(
  identity: SchoolIdentity | undefined,
): void {
  useEffect(() => {
    if (!identity) return

    const colors = extractColors(identity.colores)
    if (colors.primary) {
      document.documentElement.style.setProperty(
        '--school-primary',
        colors.primary,
      )
    }
    if (colors.secondary) {
      document.documentElement.style.setProperty(
        '--school-secondary',
        colors.secondary,
      )
    }
  }, [identity])
}

export function getSchoolLogoUrl(logo: string | null): string | undefined {
  if (!logo) return undefined
  try {
    const url = new URL(logo, apiBaseUrl)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined
    return url.href
  } catch {
    return undefined
  }
}
