/**
 * Authentication Validation Schemas
 * Shared between client and server for consistent validation
 */

import { z } from 'zod'

// ==================== Common Field Validators ====================

export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(64, 'Username must be at most 64 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens')

export const emailSchema = z.string().email('Invalid email address').max(255)

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

export const verificationCodeSchema = z
  .string()
  .length(6, 'Verification code must be 6 digits')
  .regex(/^\d{6}$/, 'Verification code must contain only numbers')

// ==================== Auth Provider Types ====================

export const authProviders = ['password', 'github', 'google', 'email'] as const
export type AuthProvider = (typeof authProviders)[number]

// ==================== Login Schemas ====================

// Password Login
export const loginWithPasswordSchema = z.object({
  usernameOrEmail: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
})

export type LoginWithPasswordInput = z.infer<typeof loginWithPasswordSchema>

// Email Verification Code Login (设计完成，暂不实现)
export const loginWithEmailCodeSchema = z.object({
  email: emailSchema,
  code: verificationCodeSchema,
})

export type LoginWithEmailCodeInput = z.infer<typeof loginWithEmailCodeSchema>

// Request Email Verification Code (设计完成，暂不实现)
export const requestEmailCodeSchema = z.object({
  email: emailSchema,
})

export type RequestEmailCodeInput = z.infer<typeof requestEmailCodeSchema>

// ==================== Registration Schemas ====================

export const registerWithPasswordSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
})

export type RegisterWithPasswordInput = z.infer<typeof registerWithPasswordSchema>

// ==================== OAuth Callback Schemas ====================

export const githubCallbackSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().optional(),
})

export type GithubCallbackInput = z.infer<typeof githubCallbackSchema>

// ==================== Session Schema ====================

export const sessionPayloadSchema = z.object({
  userId: z.number(),
  username: z.string(),
  email: z.string().optional(),
  expiresAt: z.date(),
})

export type SessionPayload = z.infer<typeof sessionPayloadSchema>