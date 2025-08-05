
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, subscriptionsTable } from '../db/schema';
import { getSubscription } from '../handlers/get_subscription';

describe('getSubscription', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return active subscription for user', async () => {
    // Create test user first
    const user = await db.insert(usersTable)
      .values({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
      })
      .returning()
      .execute();

    // Create active subscription
    const now = new Date();
    const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    await db.insert(subscriptionsTable)
      .values({
        id: 'sub-1',
        userId: 'user-1',
        customerId: 'cus-123',
        status: 'active',
        priceId: 'price-123',
        currentPeriodStart: now,
        currentPeriodEnd: futureDate,
      })
      .execute();

    const result = await getSubscription('user-1');

    expect(result).toBeDefined();
    expect(result?.id).toBe('sub-1');
    expect(result?.userId).toBe('user-1');
    expect(result?.customerId).toBe('cus-123');
    expect(result?.status).toBe('active');
    expect(result?.priceId).toBe('price-123');
    expect(result?.currentPeriodStart).toBeInstanceOf(Date);
    expect(result?.currentPeriodEnd).toBeInstanceOf(Date);
    expect(result?.createdAt).toBeInstanceOf(Date);
    expect(result?.updatedAt).toBeInstanceOf(Date);
  });

  it('should return null when user has no active subscription', async () => {
    // Create test user first
    await db.insert(usersTable)
      .values({
        id: 'user-2',
        email: 'test2@example.com',
        name: 'Test User 2',
      })
      .execute();

    const result = await getSubscription('user-2');

    expect(result).toBeNull();
  });

  it('should return null when user has only inactive subscriptions', async () => {
    // Create test user first
    await db.insert(usersTable)
      .values({
        id: 'user-3',
        email: 'test3@example.com',
        name: 'Test User 3',
      })
      .execute();

    // Create inactive subscription
    const now = new Date();
    const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await db.insert(subscriptionsTable)
      .values({
        id: 'sub-2',
        userId: 'user-3',
        customerId: 'cus-456',
        status: 'canceled',
        priceId: 'price-456',
        currentPeriodStart: now,
        currentPeriodEnd: futureDate,
      })
      .execute();

    const result = await getSubscription('user-3');

    expect(result).toBeNull();
  });

  it('should return only active subscription when user has multiple subscriptions', async () => {
    // Create test user first
    await db.insert(usersTable)
      .values({
        id: 'user-4',
        email: 'test4@example.com',
        name: 'Test User 4',
      })
      .execute();

    const now = new Date();
    const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Create canceled subscription
    await db.insert(subscriptionsTable)
      .values({
        id: 'sub-3',
        userId: 'user-4',
        customerId: 'cus-789',
        status: 'canceled',
        priceId: 'price-789',
        currentPeriodStart: now,
        currentPeriodEnd: futureDate,
      })
      .execute();

    // Create active subscription
    await db.insert(subscriptionsTable)
      .values({
        id: 'sub-4',
        userId: 'user-4',
        customerId: 'cus-789',
        status: 'active',
        priceId: 'price-active',
        currentPeriodStart: now,
        currentPeriodEnd: futureDate,
      })
      .execute();

    const result = await getSubscription('user-4');

    expect(result).toBeDefined();
    expect(result?.id).toBe('sub-4');
    expect(result?.status).toBe('active');
    expect(result?.priceId).toBe('price-active');
  });

  it('should return null for non-existent user', async () => {
    const result = await getSubscription('non-existent-user');

    expect(result).toBeNull();
  });
});
