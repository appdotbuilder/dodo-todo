
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, subscriptionsTable } from '../db/schema';
import { createCustomerPortal } from '../handlers/create_customer_portal';

describe('createCustomerPortal', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a customer portal URL for user with subscription', async () => {
    // Create test user
    const testUser = {
      id: 'user_123',
      email: 'test@example.com',
      name: 'Test User',
      image: null,
      emailVerified: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(usersTable).values(testUser).execute();

    // Create test subscription
    const testSubscription = {
      id: 'sub_123',
      userId: 'user_123',
      customerId: 'cust_456',
      status: 'active' as const,
      priceId: 'price_789',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(subscriptionsTable).values(testSubscription).execute();

    // Call the handler
    const result = await createCustomerPortal('user_123');

    // Verify the result
    expect(result.portalUrl).toBeDefined();
    expect(typeof result.portalUrl).toBe('string');
    expect(result.portalUrl).toMatch(/https:\/\/portal\.dodopayments\.com\/session_/);
    expect(result.portalUrl).toContain('cust_456');
  });

  it('should throw error for user without subscription', async () => {
    // Create test user without subscription
    const testUser = {
      id: 'user_no_sub',
      email: 'nosub@example.com',
      name: 'User No Sub',
      image: null,
      emailVerified: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(usersTable).values(testUser).execute();

    // Expect the handler to throw an error
    expect(createCustomerPortal('user_no_sub')).rejects.toThrow(/no subscription found/i);
  });

  it('should throw error for non-existent user', async () => {
    // Expect the handler to throw an error for non-existent user
    expect(createCustomerPortal('non_existent_user')).rejects.toThrow(/no subscription found/i);
  });

  it('should use customer ID from first subscription when multiple exist', async () => {
    // Create test user
    const testUser = {
      id: 'user_multi',
      email: 'multi@example.com',
      name: 'Multi Sub User',
      image: null,
      emailVerified: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(usersTable).values(testUser).execute();

    // Create multiple test subscriptions
    const firstSubscription = {
      id: 'sub_first',
      userId: 'user_multi',
      customerId: 'cust_first',
      status: 'active' as const,
      priceId: 'price_1',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const secondSubscription = {
      id: 'sub_second',
      userId: 'user_multi',
      customerId: 'cust_second',
      status: 'canceled' as const,
      priceId: 'price_2',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(subscriptionsTable).values([firstSubscription, secondSubscription]).execute();

    // Call the handler
    const result = await createCustomerPortal('user_multi');

    // Should use the first subscription's customer ID
    expect(result.portalUrl).toContain('cust_first');
    expect(result.portalUrl).not.toContain('cust_second');
  });
});
