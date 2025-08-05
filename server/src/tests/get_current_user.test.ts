
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, sessionsTable } from '../db/schema';
import { getCurrentUser } from '../handlers/get_current_user';
import { eq } from 'drizzle-orm';

const testUser = {
  id: 'user_123',
  email: 'test@example.com',
  name: 'Test User',
  image: 'https://example.com/avatar.jpg',
  emailVerified: new Date('2024-01-01'),
};

const createTestUser = async () => {
  await db.insert(usersTable)
    .values(testUser)
    .execute();
};

const createValidSession = async (userId: string, token: string) => {
  const futureDate = new Date();
  futureDate.setHours(futureDate.getHours() + 1); // 1 hour from now
  
  await db.insert(sessionsTable)
    .values({
      id: 'session_123',
      token,
      userId,
      expiresAt: futureDate,
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
    })
    .execute();
};

const createExpiredSession = async (userId: string, token: string) => {
  const pastDate = new Date();
  pastDate.setHours(pastDate.getHours() - 1); // 1 hour ago
  
  await db.insert(sessionsTable)
    .values({
      id: 'session_expired',
      token,
      userId,
      expiresAt: pastDate,
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
    })
    .execute();
};

describe('getCurrentUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user for valid session token', async () => {
    await createTestUser();
    await createValidSession(testUser.id, 'valid_token_123');

    const result = await getCurrentUser('valid_token_123');

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(testUser.id);
    expect(result!.email).toEqual(testUser.email);
    expect(result!.name).toEqual(testUser.name);
    expect(result!.image).toEqual(testUser.image);
    expect(result!.emailVerified).toEqual(testUser.emailVerified);
    expect(result!.createdAt).toBeInstanceOf(Date);
    expect(result!.updatedAt).toBeInstanceOf(Date);
  });

  it('should return null for invalid session token', async () => {
    await createTestUser();
    await createValidSession(testUser.id, 'valid_token_123');

    const result = await getCurrentUser('invalid_token');

    expect(result).toBeNull();
  });

  it('should return null for expired session token', async () => {
    await createTestUser();
    await createExpiredSession(testUser.id, 'expired_token_123');

    const result = await getCurrentUser('expired_token_123');

    expect(result).toBeNull();
  });

  it('should return null for empty session token', async () => {
    const result = await getCurrentUser('');

    expect(result).toBeNull();
  });

  it('should return null when no session token provided', async () => {
    const result = await getCurrentUser('');

    expect(result).toBeNull();
  });

  it('should handle user with null image and emailVerified', async () => {
    const userWithNulls = {
      id: 'user_nulls',
      email: 'nulls@example.com',
      name: 'Nulls User',
      image: null,
      emailVerified: null,
    };

    await db.insert(usersTable)
      .values(userWithNulls)
      .execute();
    
    await createValidSession(userWithNulls.id, 'token_with_nulls');

    const result = await getCurrentUser('token_with_nulls');

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(userWithNulls.id);
    expect(result!.email).toEqual(userWithNulls.email);
    expect(result!.name).toEqual(userWithNulls.name);
    expect(result!.image).toBeNull();
    expect(result!.emailVerified).toBeNull();
  });

  it('should return null when session exists but user is deleted', async () => {
    await createTestUser();
    await createValidSession(testUser.id, 'valid_token_123');

    // Delete the user (session remains due to foreign key constraints)
    await db.delete(usersTable)
      .where(eq(usersTable.id, testUser.id))
      .execute();

    const result = await getCurrentUser('valid_token_123');

    expect(result).toBeNull();
  });
});
