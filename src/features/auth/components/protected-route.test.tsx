import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { SessionUser } from '../api/auth-api'
import { sessionQueryKey } from '../hooks/use-session'
import { ProtectedRoute } from './protected-route'

const authenticatedUser: SessionUser = {
  id: 1,
  nombre: 'Ana',
  apellido: 'Torres',
  email: 'ana@example.com',
  colegio_id: 1,
  roles: {},
  requiere_cambio_contrasena: false,
}

function LocationText() {
  const location = useLocation()
  return <p>Ruta: {location.pathname}</p>
}

function renderRoute(
  user: SessionUser | null,
  initialPath = '/privado',
  roles?: string[],
  permission?: string,
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  queryClient.setQueryData(sessionQueryKey, user)

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <LocationText />
        <Routes>
          <Route
            element={
              <ProtectedRoute
                {...(permission ? { permission } : {})}
                {...(roles ? { roles } : {})}
              />
            }
          >
            <Route path="/privado" element={<p>Contenido protegido</p>} />
          </Route>
          <Route path="/403" element={<p>Acceso denegado</p>} />
          <Route element={<ProtectedRoute requirePasswordChangeRoute />}>
            <Route
              path="/cambiar-contrasena"
              element={<p>Cambiar contraseña</p>}
            />
          </Route>
          <Route path="/login" element={<p>Inicio de sesión</p>} />
          <Route path="/" element={<p>Panel principal</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ProtectedRoute', () => {
  it('redirige al login conservando la ruta al no haber sesión', async () => {
    renderRoute(null)

    expect(await screen.findByText('Inicio de sesión')).toBeInTheDocument()
    expect(screen.getByText('Ruta: /login')).toBeInTheDocument()
  })

  it('limita la sesión al cambio obligatorio de contraseña', async () => {
    renderRoute(
      { ...authenticatedUser, requiere_cambio_contrasena: true },
      '/privado',
    )

    expect(await screen.findByText('Cambiar contraseña')).toBeInTheDocument()
    expect(screen.getByText('Ruta: /cambiar-contrasena')).toBeInTheDocument()
  })

  it('deja entrar a un usuario con uno de los roles permitidos', async () => {
    renderRoute(
      { ...authenticatedUser, roles: ['Director'] } as unknown as SessionUser,
      '/privado',
      ['director'],
    )

    expect(await screen.findByText('Contenido protegido')).toBeInTheDocument()
  })

  it('envía a la pantalla 403 si el rol no está permitido', async () => {
    renderRoute(
      { ...authenticatedUser, roles: ['Docente'] } as unknown as SessionUser,
      '/privado',
      ['director'],
    )

    expect(await screen.findByText('Acceso denegado')).toBeInTheDocument()
  })

  it('usa roles como fallback cuando la sesión todavía no trae permisos', async () => {
    renderRoute(
      { ...authenticatedUser, roles: ['Director'] } as unknown as SessionUser,
      '/privado',
      ['director'],
      'pagos.ver',
    )

    expect(await screen.findByText('Contenido protegido')).toBeInTheDocument()
  })

  it('prioriza los permisos recibidos por la sesión sobre los roles', async () => {
    renderRoute(
      {
        ...authenticatedUser,
        roles: ['Director'],
        permisos: [],
      } as unknown as SessionUser,
      '/privado',
      ['director'],
      'pagos.ver',
    )

    expect(await screen.findByText('Acceso denegado')).toBeInTheDocument()
  })

  it('permite entrar si la sesión incluye el permiso, aunque el rol no esté en el fallback', async () => {
    renderRoute(
      {
        ...authenticatedUser,
        roles: ['Apoderado'],
        permisos: ['pagos.ver'],
      } as unknown as SessionUser,
      '/privado',
      ['director'],
      'pagos.ver',
    )

    expect(await screen.findByText('Contenido protegido')).toBeInTheDocument()
  })
})
