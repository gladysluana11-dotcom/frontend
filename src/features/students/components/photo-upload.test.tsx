import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as studentsApi from '../api/students-api'
import { PhotoUpload } from './photo-upload'

vi.mock('../api/students-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/students-api')>()),
  uploadStudentPhoto: vi.fn(),
}))

const uploadStudentPhoto = vi.mocked(studentsApi.uploadStudentPhoto)

function renderUpload() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <PhotoUpload studentId={18} />
    </QueryClientProvider>,
  )
}

const file = (name: string, type: string, size = 100) =>
  new File([new Uint8Array(size)], name, { type })

beforeEach(() => {
  vi.resetAllMocks()
  uploadStudentPhoto.mockResolvedValue(undefined)
})

describe('PhotoUpload', () => {
  it('pide elegir una imagen antes de subir', async () => {
    renderUpload()

    await userEvent.click(screen.getByRole('button', { name: 'Subir foto' }))

    expect(
      await screen.findByText('Elige una imagen antes de subirla.'),
    ).toBeInTheDocument()
    expect(uploadStudentPhoto).not.toHaveBeenCalled()
  })

  it('rechaza archivos que no son JPG o PNG', async () => {
    renderUpload()
    const user = userEvent.setup({ applyAccept: false })

    await user.upload(
      screen.getByLabelText('Elige una imagen'),
      file('foto.gif', 'image/gif'),
    )
    await user.click(screen.getByRole('button', { name: 'Subir foto' }))

    expect(
      await screen.findByText('La foto debe ser JPG o PNG.'),
    ).toBeInTheDocument()
    expect(uploadStudentPhoto).not.toHaveBeenCalled()
  })

  it('rechaza fotos de más de 1 MB', async () => {
    renderUpload()

    await userEvent.upload(
      screen.getByLabelText('Elige una imagen'),
      file('grande.png', 'image/png', 1024 * 1024 + 1),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Subir foto' }))

    expect(
      await screen.findByText('La foto no puede pesar más de 1 MB.'),
    ).toBeInTheDocument()
    expect(uploadStudentPhoto).not.toHaveBeenCalled()
  })

  it('sube una foto válida', async () => {
    renderUpload()
    const photo = file('foto.png', 'image/png')

    await userEvent.upload(screen.getByLabelText('Elige una imagen'), photo)
    await userEvent.click(screen.getByRole('button', { name: 'Subir foto' }))

    await vi.waitFor(() =>
      expect(uploadStudentPhoto).toHaveBeenCalledWith(18, photo),
    )
  })
})
