import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { requestPasswordReset } from '../api/auth-api'
import { AuthFrame } from '../components/auth-frame'
import { FormField } from '../components/form-field'
import { emailSchema, type EmailFormValues } from '../schemas/auth-schemas'
import { ApiError } from '../../../shared/api/errors'
import { Button } from '../../../shared/ui/button'
import { texts } from '../../../shared/texts'

export default function RecoverPasswordPage() {
  const form = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  })
  const mutation = useMutation({
    mutationFn: requestPasswordReset,
    onSuccess: () => toast.success(texts.auth.resetInstructions),
    onError: (error: Error) => {
      if (error instanceof ApiError && error.errors.email?.[0]) {
        form.setError('email', { message: error.errors.email[0] })
      }
      toast.error(error.message)
    },
  })

  return (
    <AuthFrame
      title={texts.auth.recoverTitle}
      description={texts.auth.recoverDescription}
      formProps={{
        onSubmit: form.handleSubmit(({ email }) => mutation.mutate(email)),
      }}
    >
      <FormField
        label={texts.auth.loginEmail}
        type="email"
        autoComplete="email"
        inputMode="email"
        {...form.register('email')}
        error={form.formState.errors.email?.message}
      />
      <Button className="w-full" type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? texts.auth.sending : texts.auth.sendInstructions}
      </Button>
      <p className="text-center text-sm">
        <Link
          className="font-medium text-[var(--school-primary)] hover:underline"
          to="/login"
        >
          {texts.auth.backToLogin}
        </Link>
      </p>
    </AuthFrame>
  )
}
