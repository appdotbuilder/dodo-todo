
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, sessionsTable } from '../db/schema';
import { signOut } from '../handlers/sign_out';
import { eq } from 'drizzle-orm';

describe('signOut', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should successfully sign out with valid session token', async () => {
    // Create a test user first
    const user = await db.insert(usersTable)
      .values({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User'
      })
      .returning()
      .execute();

    // Create a test session
    const sessionToken = 'test-session-token-123';
    await db.insert(sessionsTable)
      .values({
        id: 'session-1',
        token: sessionToken,
        userId: user[0].id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
      })
      .execute();

    // Sign out
    const result = await signOut(sessionToken);

    expect(result.success).toBe(true);

    // Verify session was deleted from database
    const sessions = await db.select()
      .from(sessionsTable)
      .where(eq(sessionsTable.token, sessionToken))
      .execute();

    expect(sessions).toHaveLength(0);
  });

  it('should return success even with invalid session token', async () => {
    const invalidToken = 'non-existent-token';

    const result = await signOut(invalidToken);

    expect(result.success).toBe(true);
  });

  it('should not affect other sessions when signing out', async () => {
    // Create a test user
    const user = await db.insert(usersTable)
      .values({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User'
      })
      .returning()
      .execute();

    // Create multiple sessions
    const sessionToken1 = 'session-token-1';
    const sessionToken2 = 'session-token-2';

    await db.insert(sessionsTable)
      .values([
        {
          id: 'session-1',
          token: sessionToken1,
          userId: user[0].id,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        },
        {
          id: 'session-2',
          token: sessionToken2,
          userId: user[0].id,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      ])
      .execute();

    // Sign out from first session
    const result = await signOut(sessionToken1);

    expect(result.success).toBe(true);

    // Verify first session was deleted
    const deletedSessions = await db.select()
      .from(sessionsTable)
      .where(eq(sessionsTable.token, sessionToken1))
      .execute();

    expect(deletedSessions).toHaveLength(0);

    // Verify second session still exists
    const remainingSessions = await db.select()
      .from(sessionsTable)
      .where(eq(sessionsTable.token, sessionToken2))
      .execute();

    expect(remainingSessions).toHaveLength(1);
    expect(remainingSessions[0].token).toBe(sessionToken2);
  });
});
