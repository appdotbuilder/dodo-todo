
import { db } from '../db';
import { usersTable, accountsTable, sessionsTable } from '../db/schema';
import { type SignInInput, type User } from '../schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export async function signIn(input: SignInInput): Promise<{ user: User; session: { token: string } }> {
  try {
    // Find user by email
    const userResults = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (userResults.length === 0) {
      throw new Error('Invalid credentials');
    }

    const user = userResults[0];

    // Find account with password for this user
    const accountResults = await db.select()
      .from(accountsTable)
      .where(eq(accountsTable.userId, user.id))
      .execute();

    const passwordAccount = accountResults.find(account => account.password !== null);
    
    if (!passwordAccount || !passwordAccount.password) {
      throw new Error('Invalid credentials');
    }

    // In a real implementation, you would hash the input password and compare
    // For now, we'll do a simple string comparison (not secure for production)
    if (passwordAccount.password !== input.password) {
      throw new Error('Invalid credentials');
    }

    // Create session
    const sessionId = nanoid();
    const sessionToken = nanoid(32);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now

    const sessionResults = await db.insert(sessionsTable)
      .values({
        id: sessionId,
        token: sessionToken,
        userId: user.id,
        expiresAt,
        ipAddress: null,
        userAgent: null
      })
      .returning()
      .execute();

    const session = sessionResults[0];

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      session: {
        token: session.token,
      },
    };
  } catch (error) {
    console.error('Sign in failed:', error);
    throw error;
  }
}
