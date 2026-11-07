import { describe, expect, it } from 'vitest'
import { buildLoginBody } from './auth-api'

const credentials = { email: 'ana@example.com', password: 'Password123!' }

describe('buildLoginBody', () => {
  it('agrega el subdominio cuando se indica (desarrollo)', () => {
    expect(buildLoginBody(credentials, 'salesian-innova')).toEqual({
      ...credentials,
      subdominio: 'salesian-innova',
    })
  })

  it('no agrega el subdominio cuando no corresponde (producción)', () => {
    expect(buildLoginBody(credentials, undefined)).toEqual(credentials)
  })
})
