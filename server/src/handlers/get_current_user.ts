
import { db } from '../db';
import { sessionsTable, usersTable } from '../db/schema';
import { type User } from '../schema';
import { eq, and, gt } from 'drizzle-orm';

export async function getCurrentUser(sessionToken: string): Promise<User | null> {
  try {
    if (!sessionToken) {
      return null;
    }

    // Query for valid session with user data
    const result = await db.select({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      image: usersTable.image,
      emailVerified: usersTable.emailVerified,
      createdAt: usersTable.createdAt,
      updatedAt: usersTable.updatedAt,
    })
      .from(sessionsTable)
      .innerJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
      .where(
        and(
          eq(sessionsTable.token, sessionToken),
          gt(sessionsTable.expiresAt, new Date()) // Session must not be expired
        )
      )
      .limit(1)
      .execute();

    if (result.length === 0) {
      return null;
    }

    return result[0];
  } catch (error) {
    console.error('Failed to get current user:', error);
    throw error;
  }
}
