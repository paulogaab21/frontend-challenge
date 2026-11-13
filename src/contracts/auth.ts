import { z } from 'zod'

import { isoDateSchema } from './common'

/* -------------------------------------------------------------------------- */
/* Field rules (shared by forms and by the API validation)                    */
/* -------------------------------------------------------------------------- */

export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Use pelo menos 3 caracteres')
  .max(20, 'Use no máximo 20 caracteres')
  .regex(/^[a-z0-9_.]+$/, 'Use apenas letras minúsculas, números, ponto ou sublinhado')

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Informe o e-mail')
  .max(120, 'E-mail muito longo')
  .pipe(z.email('Informe um e-mail válido'))

export const passwordSchema = z
  .string()
  .min(8, 'A senha deve ter pelo menos 8 caracteres')
  .max(72, 'A senha deve ter no máximo 72 caracteres')
  .regex(/[A-Za-z]/, 'Inclua pelo menos uma letra')
  .regex(/\d/, 'Inclua pelo menos um número')

/* -------------------------------------------------------------------------- */
/* Resources                                                                  */
/* -------------------------------------------------------------------------- */

export const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  username: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  createdAt: isoDateSchema,
})
export type User = z.infer<typeof userSchema>

/** GET /session and the body of POST /session, POST /users. */
export const sessionSchema = z.object({
  user: userSchema,
  /** Opaque bearer token. Sent back as `Authorization: Bearer <token>`. */
  token: z.string(),
  expiresAt: isoDateSchema,
})
export type Session = z.infer<typeof sessionSchema>

/* -------------------------------------------------------------------------- */
/* Requests                                                                   */
/* -------------------------------------------------------------------------- */

/** POST /session */
export const loginRequestSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Informe a senha'),
})
export type LoginRequest = z.infer<typeof loginRequestSchema>

/** POST /users */
export const registerRequestSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
})
export type RegisterRequest = z.infer<typeof registerRequestSchema>

/** Client-side form: the request plus the confirmation field. */
export const registerFormSchema = registerRequestSchema
  .extend({ confirmPassword: z.string().min(1, 'Confirme a senha') })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem',
  })
export type RegisterFormValues = z.infer<typeof registerFormSchema>
