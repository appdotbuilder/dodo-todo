
import { db } from '../db';
import { usersTable, accountsTable } from '../db/schema';
import { type SignUpInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export async function signUp(input: SignUpInput): Promise<User> {
  try {
    // Check if user already exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (existingUser.length > 0) {
      throw new Error('User with this email already exists');
    }

    // Generate unique user ID
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create user record
    const userResult = await db.insert(usersTable)
      .values({
        id: userId,
        email: input.email,
        name: input.name,
        image: null,
        emailVerified: null
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Hash password and create account record for credential provider
    const hashedPassword = await Bun.password.hash(input.password);
    
    await db.insert(accountsTable)
      .values({
        id: `account_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        accountId: user.email, // Use email as account identifier
        providerId: 'credential', // Standard provider ID for email/password auth
        userId: user.id,
        password: hashedPassword,
        accessToken: null,
        refreshToken: null,
        idToken: null,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        scope: null
      })
      .execute();

    return user;
  } catch (error) {
    console.error('User sign up failed:', error);
    throw error;
  }
}
