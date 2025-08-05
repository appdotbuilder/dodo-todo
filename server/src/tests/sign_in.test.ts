
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, accountsTable, sessionsTable } from '../db/schema';
import { type SignInInput } from '../schema';
import { signIn } from '../handlers/sign_in';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

const testUser = {
  id: nanoid(),
  email: 'test@example.com',
  name: 'Test User',
  image: null,
};

const testAccount = {
  id: nanoid(),
  accountId: 'test-account',
  providerId: 'credential',
  userId: testUser.id,
  password: 'testpassword123',
  accessToken: null,
  refreshToken: null,
  idToken: null,
  accessTokenExpiresAt: null,
  refreshTokenExpiresAt: null,
  scope: null,
};

const testInput: SignInInput = {
  email: 'test@example.com',
  password: 'testpassword123',
};

describe('signIn', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should sign in user with valid credentials', async () => {
    // Create test user and account
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(accountsTable).values(testAccount).execute();

    const result = await signIn(testInput);

    // Verify user data
    expect(result.user.id).toEqual(testUser.id);
    expect(result.user.email).toEqual('test@example.com');
    expect(result.user.name).toEqual('Test User');
    expect(result.user.image).toBeNull();
    expect(result.user.createdAt).toBeInstanceOf(Date);
    expect(result.user.updatedAt).toBeInstanceOf(Date);

    // Verify session token exists
    expect(result.session.token).toBeDefined();
    expect(typeof result.session.token).toBe('string');
    expect(result.session.token.length).toBeGreaterThan(0);
  });

  it('should create session in database', async () => {
    // Create test user and account
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(accountsTable).values(testAccount).execute();

    const result = await signIn(testInput);

    // Verify session was created in database
    const sessions = await db.select()
      .from(sessionsTable)
      .where(eq(sessionsTable.token, result.session.token))
      .execute();

    expect(sessions).toHaveLength(1);
    expect(sessions[0].userId).toEqual(testUser.id);
    expect(sessions[0].token).toEqual(result.session.token);
    expect(sessions[0].expiresAt).toBeInstanceOf(Date);
    expect(sessions[0].expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('should throw error for non-existent user', async () => {
    await expect(signIn(testInput)).rejects.toThrow(/invalid credentials/i);
  });

  it('should throw error for user without password account', async () => {
    // Create user but no account with password
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(accountsTable).values({
      ...testAccount,
      password: null, // No password
    }).execute();

    await expect(signIn(testInput)).rejects.toThrow(/invalid credentials/i);
  });

  it('should throw error for wrong password', async () => {
    // Create test user and account
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(accountsTable).values(testAccount).execute();

    const wrongPasswordInput: SignInInput = {
      email: 'test@example.com',
      password: 'wrongpassword',
    };

    await expect(signIn(wrongPasswordInput)).rejects.toThrow(/invalid credentials/i);
  });

  it('should set session expiration 30 days in future', async () => {
    // Create test user and account
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(accountsTable).values(testAccount).execute();

    const result = await signIn(testInput);

    // Check session expiration
    const sessions = await db.select()
      .from(sessionsTable)
      .where(eq(sessionsTable.token, result.session.token))
      .execute();

    const session = sessions[0];
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    expect(session.expiresAt.getTime()).toBeGreaterThan(now.getTime());
    expect(session.expiresAt.getTime()).toBeLessThanOrEqual(thirtyDaysFromNow.getTime());
  });
});
