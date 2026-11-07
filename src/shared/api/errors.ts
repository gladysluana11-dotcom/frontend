import { texts } from '../texts'

export type ApiErrorKind =
  | 'network'
  | 'unauthorized'
  | 'forbidden'
  | 'validation'
  | 'rate_limit'
  | 'http'

export type ApiFieldErrors = Record<string, string[]>

export class ApiError extends Error {
  readonly code: string | undefined
  readonly errors: ApiFieldErrors
  readonly kind: ApiErrorKind
  readonly status: number | undefined

  constructor(
    message: string,
    options: {
      code?: string | undefined
      errors?: ApiFieldErrors
      kind: ApiErrorKind
      status?: number | undefined
    },
  ) {
    super(message)
    this.name = 'ApiError'
    this.code = options.code
    this.errors = options.errors ?? {}
    this.kind = options.kind
    this.status = options.status
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeFieldErrors(value: unknown): ApiFieldErrors {
  if (!isRecord(value)) return {}

  return Object.fromEntries(
    Object.entries(value).flatMap(([field, messages]) => {
      if (typeof messages === 'string') return [[field, [messages]]]
      if (!Array.isArray(messages)) return []
      const strings = messages.filter(
        (message): message is string => typeof message === 'string',
      )
      return strings.length > 0 ? [[field, strings]] : []
    }),
  )
}

function kindForStatus(status: number | undefined): ApiErrorKind {
  switch (status) {
    case 401:
      return 'unauthorized'
    case 403:
      return 'forbidden'
    case 422:
      return 'validation'
    case 429:
      return 'rate_limit'
    default:
      return status === undefined ? 'network' : 'http'
  }
}

function messageForKind(kind: ApiErrorKind): string {
  switch (kind) {
    case 'network':
      return texts.errors.network
    case 'unauthorized':
      return texts.errors.unauthorized
    case 'forbidden':
      return texts.errors.forbidden
    case 'validation':
      return texts.errors.validation
    case 'rate_limit':
      return texts.errors.rateLimit
    case 'http':
      return texts.errors.http
  }
}

export function normalizeApiError(value: unknown, status?: number): ApiError {
  if (value instanceof ApiError) return value

  const kind = kindForStatus(status)
  const body = isRecord(value) ? value : undefined
  const suppliedMessage =
    body && typeof body.message === 'string' ? body.message : undefined
  const suppliedCode =
    body && typeof body.code === 'string' ? body.code : undefined
  const message =
    kind === 'network'
      ? messageForKind(kind)
      : (suppliedMessage ??
        (value instanceof Error ? value.message : messageForKind(kind)))

  return new ApiError(message, {
    code: suppliedCode,
    errors: normalizeFieldErrors(body?.errors),
    kind,
    status,
  })
}
