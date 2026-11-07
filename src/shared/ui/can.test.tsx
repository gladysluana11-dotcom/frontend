import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { SessionUser } from '../../features/auth/api/auth-api'
import { sessionQueryKey } from '../../features/auth/hooks/use-session'
import { Can } from './can'

const user: SessionUser = {
  id: 1,
  nombre: 'Ana',
  apellido: 'Torres',
  email: 'ana@example.com',
  colegio_id: 1,
  roles: {},
  requiere_cambio_contrasena: false,
}

function renderCan(permission: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  client.setQueryData(sessionQueryKey, {
    ...user,
    permisos: ['alumnos.ver'],
  })

  return render(
    <QueryClientProvider client={client}>
      <Can permiso={permission} fallback={<p>Sin permiso</p>}>
        <p>Acción disponible</p>
      </Can>
    </QueryClientProvider>,
  )
}

function renderCanByRole(roles: unknown, allowed: string | string[]) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  client.setQueryData(sessionQueryKey, { ...user, roles })

  return render(
    <QueryClientProvider client={client}>
      <Can rol={allowed} fallback={<p>Sin permiso</p>}>
        <p>Acción disponible</p>
      </Can>
    </QueryClientProvider>,
  )
}

describe('Can', () => {
  it('muestra la acción cuando el usuario tiene el permiso', () => {
    renderCan('alumnos.ver')
    expect(screen.getByText('Acción disponible')).toBeInTheDocument()
  })

  it('oculta la acción cuando falta el permiso', () => {
    renderCan('alumnos.editar')
    expect(screen.getByText('Sin permiso')).toBeInTheDocument()
  })

  it('permite por rol cuando la API entrega una lista de roles', () => {
    renderCanByRole(['Tesorería'], ['director', 'tesoreria'])
    expect(screen.getByText('Acción disponible')).toBeInTheDocument()
  })

  it('oculta por rol cuando el usuario no tiene el rol', () => {
    renderCanByRole(['Docente'], 'director')
    expect(screen.getByText('Sin permiso')).toBeInTheDocument()
  })
})
