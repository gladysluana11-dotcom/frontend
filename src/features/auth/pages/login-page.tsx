import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { login, type SessionUser } from '../api/auth-api'
import { FormField } from '../components/form-field'
import { AuthFrame } from '../components/auth-frame'
import { loginSchema, type LoginFormValues } from '../schemas/auth-schemas'
import { ApiError } from '../../../shared/api/errors'
import { Button } from '../../../shared/ui/button'
import { texts } from '../../../shared/texts'
import { sessionQueryKey } from '../hooks/use-session'

function isReturnPath(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//')
  )
}

function returnPath(state: unknown): string {
  if (typeof state !== 'object' || state === null || !('from' in state)) {
    return '/'
  }
  return isReturnPath(state.from) ? state.from : '/'
}

export default function LoginPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })
  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (user: SessionUser) => {
      queryClient.setQueryData(sessionQueryKey, user)
      navigate(
        user.requiere_cambio_contrasena
          ? '/cambiar-contrasena'
          : returnPath(location.state),
        { replace: true },
      )
    },
    onError: (error: Error) => {
      if (error instanceof ApiError) {
        const emailError = error.errors.email?.[0]
        const passwordError = error.errors.password?.[0]
        if (emailError) form.setError('email', { message: emailError })
        if (passwordError) form.setError('password', { message: passwordError })
      }
      toast.error(error.message)
    },
  })

  return (
    <AuthFrame
      title={texts.auth.loginTitle}
      description={texts.auth.loginDescription}
      formProps={{
        onSubmit: form.handleSubmit((values) => loginMutation.mutate(values)),
      }}
    >
      <FormField
        label={texts.auth.loginEmail}
        type="email"
        autoComplete="username"
        inputMode="email"
        placeholder={texts.auth.emailPlaceholder}
        {...form.register('email')}
        error={form.formState.errors.email?.message}
      />
      <FormField
        label={texts.auth.loginPassword}
        type="password"
        autoComplete="current-password"
        {...form.register('password')}
        error={form.formState.errors.password?.message}
        trailing={
          <Link
            className="text-sm font-medium text-[var(--school-primary)] underline-offset-4 hover:underline"
            to="/recuperar-contrasena"
          >
            {texts.auth.forgotPasswordLink}
          </Link>
        }
      />
      <Button
        className="w-full"
        type="submit"
        disabled={loginMutation.isPending}
      >
        {loginMutation.isPending ? texts.auth.loggingIn : texts.auth.login}
      </Button>
    </AuthFrame>
  )
}
