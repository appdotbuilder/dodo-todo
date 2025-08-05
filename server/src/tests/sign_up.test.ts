
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, accountsTable } from '../db/schema';
import { type SignUpInput } from '../schema';
import { signUp } from '../handlers/sign_up';
import { eq } from 'drizzle-orm';

// Test input data
const testInput: SignUpInput = {
  email: 'test@example.com',
  password: 'password123',
  name: 'Test User'
};

describe('signUp', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a new user successfully', async () => {
    const result = await signUp(testInput);

    // Verify user fields
    expect(result.email).toEqual('test@example.com');
    expect(result.name).toEqual('Test User');
    expect(result.image).toBeNull();
    expect(result.emailVerified).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await signUp(testInput);

    // Verify user exists in database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].name).toEqual('Test User');
    expect(users[0].createdAt).toBeInstanceOf(Date);
  });

  it('should create account record with hashed password', async () => {
    const result = await signUp(testInput);

    // Verify account record exists
    const accounts = await db.select()
      .from(accountsTable)
      .where(eq(accountsTable.userId, result.id))
      .execute();

    expect(accounts).toHaveLength(1);
    expect(accounts[0].accountId).toEqual('test@example.com');
    expect(accounts[0].providerId).toEqual('credential');
    expect(accounts[0].password).toBeDefined();
    expect(accounts[0].password).not.toEqual('password123'); // Should be hashed
    expect(accounts[0].password?.length).toBeGreaterThan(20); // Hashed password should be longer
  });

  it('should verify password can be verified', async () => {
    const result = await signUp(testInput);

    // Get the hashed password
    const accounts = await db.select()
      .from(accountsTable)
      .where(eq(accountsTable.userId, result.id))
      .execute();

    const hashedPassword = accounts[0].password!;

    // Verify the password matches
    const isValid = await Bun.password.verify('password123', hashedPassword);
    expect(isValid).toBe(true);

    // Verify wrong password doesn't match
    const isInvalid = await Bun.password.verify('wrongpassword', hashedPassword);
    expect(isInvalid).toBe(false);
  });

  it('should throw error if user already exists', async () => {
    // Create first user
    await signUp(testInput);

    // Try to create second user with same email
    await expect(signUp(testInput)).rejects.toThrow(/already exists/i);
  });

  it('should handle different email addresses', async () => {
    const input1 = { ...testInput, email: 'user1@example.com' };
    const input2 = { ...testInput, email: 'user2@example.com' };

    const result1 = await signUp(input1);
    const result2 = await signUp(input2);

    expect(result1.email).toEqual('user1@example.com');
    expect(result2.email).toEqual('user2@example.com');
    expect(result1.id).not.toEqual(result2.id);

    // Verify both users exist in database
    const users = await db.select().from(usersTable).execute();
    expect(users).toHaveLength(2);
  });
});
