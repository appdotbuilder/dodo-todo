
import { db } from '../db';
import { sessionsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function signOut(sessionToken: string): Promise<{ success: boolean }> {
  try {
    // Delete the session from the database
    const result = await db.delete(sessionsTable)
      .where(eq(sessionsTable.token, sessionToken))
      .execute();

    // Return success regardless of whether a session was found
    // This prevents information leakage about valid/invalid tokens
    return { success: true };
  } catch (error) {
    console.error('Sign out failed:', error);
    throw error;
  }
}
