import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { extractColors } from './use-identity'

describe('extractColors', () => {
  beforeEach(() => {
    vi.stubGlobal('CSS', { supports: () => true })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lee los colores cuando la API los entrega como objeto', () => {
    expect(
      extractColors({ primario: '#0F4C81', secundario: '#F2A900' }),
    ).toEqual({
      primary: '#0F4C81',
      secondary: '#F2A900',
    })
  })

  it('lee los colores cuando llegan como lista de textos', () => {
    expect(extractColors(['#111111', '#222222'])).toEqual({
      primary: '#111111',
      secondary: '#222222',
    })
  })

  it('lee los colores cuando llegan como lista de objetos con nombre', () => {
    expect(
      extractColors([
        { nombre: 'primario', valor: '#0F4C81' },
        { nombre: 'secundario', valor: '#F2A900' },
      ]),
    ).toEqual({ primary: '#0F4C81', secondary: '#F2A900' })
  })

  it('no falla con valores vacíos o inesperados', () => {
    expect(extractColors(null)).toEqual({})
    expect(extractColors([])).toEqual({})
    expect(extractColors({})).toEqual({})
  })
})
