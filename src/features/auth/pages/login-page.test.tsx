import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import LoginPage from './login-page'

function renderLogin() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('formulario de inicio de sesión', () => {
  it('valida el correo y la contraseña antes de enviar', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(
      screen.getByText('Ingresa un correo electrónico válido.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Ingresa tu contraseña.')).toBeInTheDocument()
  })

  it('rechaza un correo con formato incorrecto', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Correo electrónico'), 'correo')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(
      screen.getByText('Ingresa un correo electrónico válido.'),
    ).toBeInTheDocument()
  })
})
