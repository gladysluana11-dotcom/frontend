import { texts } from '../../shared/texts'

export function normalizeMoney(value: string | number): number {
  if (typeof value === 'string' && !/^-?\d+(?:\.\d+)?$/.test(value.trim())) {
    throw new Error(texts.payments.errors.invalidAmount)
  }
  const amount = typeof value === 'string' ? Number(value.trim()) : value
  if (!Number.isFinite(amount))
    throw new Error(texts.payments.errors.invalidAmount)
  return amount
}

export function moneyToCents(value: string): number | undefined {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value.trim())) return undefined
  const [whole = '0', fraction = ''] = value.trim().split('.')
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
}

export function amountWithTwoDecimals(value: string): number {
  const cents = moneyToCents(value)
  if (cents === undefined)
    throw new Error(texts.payments.validation.amountDecimals)
  return cents / 100
}
