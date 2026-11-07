import { z } from 'zod'
import { texts } from '../../../shared/texts'

export const loginSchema = z.object({
  email: z.email(texts.validation.email),
  password: z.string().min(1, texts.validation.passwordRequired),
})

export const emailSchema = z.object({
  email: z.email(texts.validation.email),
})

export const resetPasswordSchema = z
  .object({
    password: z.string().min(10, texts.validation.passwordMin),
    password_confirmation: z
      .string()
      .min(1, texts.validation.passwordConfirmation),
  })
  .refine((value) => value.password === value.password_confirmation, {
    message: texts.validation.passwordsMismatch,
    path: ['password_confirmation'],
  })

export const changePasswordSchema = z
  .object({
    contrasena_actual: z
      .string()
      .min(1, texts.validation.currentPasswordRequired),
    contrasena: z.string().min(10, texts.validation.passwordMin),
    contrasena_confirmation: z
      .string()
      .min(1, texts.validation.confirmNewPassword),
  })
  .refine((value) => value.contrasena === value.contrasena_confirmation, {
    message: texts.validation.passwordsMismatch,
    path: ['contrasena_confirmation'],
  })

export type LoginFormValues = z.infer<typeof loginSchema>
export type EmailFormValues = z.infer<typeof emailSchema>
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>
