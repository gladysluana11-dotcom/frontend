import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { resetPassword } from '../api/auth-api'
import { AuthFrame } from '../components/auth-frame'
import { FormField } from '../components/form-field'
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from '../schemas/auth-schemas'
import { ApiError } from '../../../shared/api/errors'
import { Button } from '../../../shared/ui/button'
import { texts } from '../../../shared/texts'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? ''
  const email = searchParams.get('email') ?? ''
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', password_confirmation: '' },
  })
  const mutation = useMutation({
    mutationFn: (values: ResetPasswordFormValues) =>
      resetPassword({ ...values, token, email }),
    onSuccess: () => {
      toast.success(texts.auth.passwordReset)
      navigate('/login', { replace: true })
    },
    onError: (error: Error) => {
      if (error instanceof ApiError) {
        if (error.errors.password?.[0]) {
          form.setError('password', { message: error.errors.password[0] })
        }
        if (error.errors.password_confirmation?.[0]) {
          form.setError('password_confirmation', {
            message: error.errors.password_confirmation[0],
          })
        }
      }
      toast.error(error.message)
    },
  })

  if (!token || !email) {
    return (
      <AuthFrame
        title={texts.auth.invalidLinkTitle}
        description={texts.auth.invalidLinkDescription}
      >
        <Button asChild className="w-full">
          <Link to="/recuperar-contrasena">
            {texts.auth.requestAnotherLink}
          </Link>
        </Button>
      </AuthFrame>
    )
  }

  return (
    <AuthFrame
      title={texts.auth.resetTitle}
      description={texts.auth.resetDescription}
      formProps={{
        onSubmit: form.handleSubmit((values) => mutation.mutate(values)),
      }}
    >
      <FormField
        label={texts.auth.newPassword}
        type="password"
        autoComplete="new-password"
        {...form.register('password')}
        error={form.formState.errors.password?.message}
      />
      <FormField
        label={texts.auth.confirmPassword}
        type="password"
        autoComplete="new-password"
        {...form.register('password_confirmation')}
        error={form.formState.errors.password_confirmation?.message}
      />
      <Button className="w-full" type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? texts.auth.resetting : texts.auth.resetTitle}
      </Button>
    </AuthFrame>
  )
}
