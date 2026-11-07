import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { changePassword, logout, type SessionUser } from '../api/auth-api'
import { AuthFrame } from '../components/auth-frame'
import { FormField } from '../components/form-field'
import {
  changePasswordSchema,
  type ChangePasswordFormValues,
} from '../schemas/auth-schemas'
import { ApiError } from '../../../shared/api/errors'
import { sessionQueryKey } from '../hooks/use-session'
import { Button } from '../../../shared/ui/button'
import { texts } from '../../../shared/texts'

export default function ChangePasswordPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      contrasena_actual: '',
      contrasena: '',
      contrasena_confirmation: '',
    },
  })
  const mutation = useMutation({
    mutationFn: changePassword,
    onSuccess: (user: SessionUser) => {
      queryClient.setQueryData(sessionQueryKey, user)
      toast.success(texts.auth.passwordChanged)
      navigate('/', { replace: true })
    },
    onError: (error: Error) => {
      if (error instanceof ApiError) {
        if (error.errors.contrasena_actual?.[0]) {
          form.setError('contrasena_actual', {
            message: error.errors.contrasena_actual[0],
          })
        }
        if (error.errors.contrasena?.[0]) {
          form.setError('contrasena', {
            message: error.errors.contrasena[0],
          })
        }
        if (error.errors.contrasena_confirmation?.[0]) {
          form.setError('contrasena_confirmation', {
            message: error.errors.contrasena_confirmation[0],
          })
        }
      }
      toast.error(error.message)
    },
  })
  const logoutMutation = useMutation({
    mutationFn: logout,
    onError: (error: Error) => toast.error(error.message),
    onSettled: () => {
      queryClient.setQueryData(sessionQueryKey, null)
      navigate('/login', { replace: true })
    },
  })

  return (
    <AuthFrame
      title={texts.auth.changeTitle}
      description={texts.auth.changeDescription}
      formProps={{
        onSubmit: form.handleSubmit((values) => mutation.mutate(values)),
      }}
    >
      <FormField
        label={texts.auth.currentPassword}
        type="password"
        autoComplete="current-password"
        {...form.register('contrasena_actual')}
        error={form.formState.errors.contrasena_actual?.message}
      />
      <FormField
        label={texts.auth.newPassword}
        type="password"
        autoComplete="new-password"
        {...form.register('contrasena')}
        error={form.formState.errors.contrasena?.message}
      />
      <FormField
        label={texts.auth.confirmNewPassword}
        type="password"
        autoComplete="new-password"
        {...form.register('contrasena_confirmation')}
        error={form.formState.errors.contrasena_confirmation?.message}
      />
      <Button className="w-full" type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? texts.auth.saving : texts.auth.changePassword}
      </Button>
      <Button
        className="w-full"
        type="button"
        variant="outline"
        disabled={logoutMutation.isPending}
        onClick={() => logoutMutation.mutate()}
      >
        {logoutMutation.isPending ? texts.auth.loggingOut : texts.auth.logout}
      </Button>
    </AuthFrame>
  )
}
