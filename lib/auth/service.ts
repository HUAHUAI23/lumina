/**
 * Authentication Service
 * Handles user registration, login, and OAuth flows
 */

import bcrypt from 'bcryptjs'
import { eq, or } from 'drizzle-orm'

import { db } from '@/db'
import { accounts, userIdentities, users } from '@/db/schema'

import 'server-only'

/**
 * Register a new user with username and password
 */
export async function registerUser(username: string, email: string, password: string) {
  // Check if user already exists
  const existingUser = await db.query.users.findFirst({
    where: or(eq(users.username, username), eq(users.email, email)),
  })

  if (existingUser) {
    throw new Error('Username or email already exists')
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10)

  // Create user and identity in a transaction
  const result = await db.transaction(async (tx) => {
    // Create user
    const [newUser] = await tx
      .insert(users)
      .values({
        username,
        email,
        avatar: '',
      })
      .returning()

    // Create password identity
    await tx.insert(userIdentities).values({
      userId: newUser.id,
      provider: 'password',
      providerUserId: username, // Use username as provider user ID
      metadata: {
        password: {
          passwordHash,
          needReset: false,
        },
      },
      isPrimary: true,
    })

    // Create account with zero balance
    await tx.insert(accounts).values({
      userId: newUser.id,
      balance: 0,
    })

    return newUser
  })

  return result
}

/**
 * Login with username/email and password
 */
export async function loginWithPassword(usernameOrEmail: string, password: string) {
  // Find user by username or email
  const user = await db.query.users.findFirst({
    where: or(eq(users.username, usernameOrEmail), eq(users.email, usernameOrEmail)),
    with: {
      identities: {
        where: eq(userIdentities.provider, 'password'),
      },
    },
  })

  if (!user || user.identities.length === 0) {
    throw new Error('Invalid credentials')
  }

  const passwordIdentity = user.identities[0]
  const passwordHash = passwordIdentity.metadata.password?.passwordHash

  if (!passwordHash) {
    throw new Error('Password not set for this account')
  }

  // Verify password
  const isValid = await bcrypt.compare(password, passwordHash)

  if (!isValid) {
    throw new Error('Invalid credentials')
  }

  return {
    userId: user.id,
    username: user.username,
    email: user.email || undefined,
  }
}

/**
 * Find or create user from GitHub OAuth
 */
export async function findOrCreateGithubUser(githubUser: {
  id: string
  login: string
  email: string | null
  avatar_url: string
  access_token: string
}) {
  // Check if GitHub identity already exists
  const existingIdentity = await db.query.userIdentities.findFirst({
    where: eq(userIdentities.providerUserId, githubUser.id),
    with: {
      user: true,
    },
  })

  if (existingIdentity) {
    // Update OAuth data
    await db
      .update(userIdentities)
      .set({
        metadata: {
          ...existingIdentity.metadata,
          oauth: {
            accessToken: githubUser.access_token,
            email: githubUser.email || undefined,
            avatarUrl: githubUser.avatar_url,
          },
        },
      })
      .where(eq(userIdentities.id, existingIdentity.id))

    return {
      userId: existingIdentity.user.id,
      username: existingIdentity.user.username,
      email: existingIdentity.user.email || undefined,
    }
  }

  // Create new user with GitHub identity
  const result = await db.transaction(async (tx) => {
    // Generate unique username from GitHub login
    let username = githubUser.login
    let counter = 1
    while (true) {
      const existing = await tx.query.users.findFirst({
        where: eq(users.username, username),
      })
      if (!existing) break
      username = `${githubUser.login}${counter}`
      counter++
    }

    // Create user
    const [newUser] = await tx
      .insert(users)
      .values({
        username,
        email: githubUser.email || undefined,
        avatar: githubUser.avatar_url,
      })
      .returning()

    // Create GitHub identity
    await tx.insert(userIdentities).values({
      userId: newUser.id,
      provider: 'github',
      providerUserId: githubUser.id,
      metadata: {
        oauth: {
          accessToken: githubUser.access_token,
          email: githubUser.email || undefined,
          avatarUrl: githubUser.avatar_url,
        },
      },
      isPrimary: true,
    })

    // Create account with zero balance
    await tx.insert(accounts).values({
      userId: newUser.id,
      balance: 0,
    })

    return newUser
  })

  return {
    userId: result.id,
    username: result.username,
    email: result.email || undefined,
  }
}

/**
 * Get user by ID
 */
export async function getUserById(userId: number) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  })

  return user
}
