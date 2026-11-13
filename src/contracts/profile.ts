import { z } from 'zod'

import { emailSchema, passwordSchema, usernameSchema } from './auth'
import { isoDateSchema, versionSchema } from './common'

export const ensSuffixSchema = z.enum(['.eth', '.xyz', '.art'])
export type EnsSuffix = z.infer<typeof ensSuffixSchema>
export const ENS_SUFFIXES = ensSuffixSchema.options

export const displayNameSchema = z
  .string()
  .trim()
  .min(2, 'Use pelo menos 2 caracteres')
  .max(40, 'Use no máximo 40 caracteres')

/** ENS label without the suffix: "nova.kurio" in "nova.kurio.eth". */
export const ensNameSchema = z
  .string()
  .trim()
  .min(3, 'Use pelo menos 3 caracteres')
  .max(32, 'Use no máximo 32 caracteres')
  .regex(
    /^[a-z0-9]+([.-][a-z0-9]+)*$/,
    'Use letras minúsculas, números, hífen ou ponto, sem espaços',
  )

export const walletNicknameSchema = z
  .string()
  .trim()
  .min(2, 'Use pelo menos 2 caracteres')
  .max(30, 'Use no máximo 30 caracteres')

/* -------------------------------------------------------------------------- */
/* Resource                                                                   */
/* -------------------------------------------------------------------------- */

export const profileSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  username: z.string(),
  email: z.string(),
  ensName: z.string(),
  ensSuffix: ensSuffixSchema,
  walletNickname: z.string(),
  avatarUrl: z.string().nullable(),
  updatedAt: isoDateSchema,
  version: versionSchema,
})
export type Profile = z.infer<typeof profileSchema>

/* -------------------------------------------------------------------------- */
/* Requests                                                                   */
/* -------------------------------------------------------------------------- */

/** PUT /profile */
export const updateProfileRequestSchema = z.object({
  displayName: displayNameSchema,
  username: usernameSchema,
  email: emailSchema,
  ensName: ensNameSchema,
  ensSuffix: ensSuffixSchema,
  walletNickname: walletNicknameSchema,
})
export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>

/** PUT /profile/password */
export const changePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1, 'Informe a senha atual'),
  newPassword: passwordSchema,
})
export type ChangePasswordRequest = z.infer<typeof changePasswordRequestSchema>

export const changePasswordFormSchema = changePasswordRequestSchema
  .extend({ confirmPassword: z.string().min(1, 'Confirme a nova senha') })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem',
  })
  .refine((value) => value.newPassword !== value.currentPassword, {
    path: ['newPassword'],
    message: 'A nova senha deve ser diferente da atual',
  })
export type ChangePasswordFormValues = z.infer<typeof changePasswordFormSchema>

/**
 * PUT /profile/avatar — multipart/form-data with a single `file` part.
 * The API accepts PNG, JPEG or WebP up to AVATAR_MAX_BYTES.
 */
export const AVATAR_FIELD = 'file'
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024
export const AVATAR_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const
