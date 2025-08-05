
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateCheckoutInput } from '../schema';
import { createCheckout } from '../handlers/create_checkout';

const testUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  image: null,
  emailVerified: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const testInput: CreateCheckoutInput = {
  priceId: 'price_1234567890',
  successUrl: 'https://example.com/success',
  cancelUrl: 'https://example.com/cancel',
};

describe('createCheckout', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create checkout session for valid user', async () => {
    // Create test user
    await db.insert(usersTable).values(testUser).execute();

    const result = await createCheckout(testInput, testUser.id);

    // Verify checkout URL is returned
    expect(result.checkoutUrl).toBeDefined();
    expect(typeof result.checkoutUrl).toBe('string');
    expect(result.checkoutUrl).toMatch(/^https:\/\/checkout\.dodopayments\.com\/pay\//);
    
    // Verify URL contains required parameters
    const url = new URL(result.checkoutUrl);
    expect(url.searchParams.get('price_id')).toBe(testInput.priceId);
    expect(url.searchParams.get('success_url')).toBe(testInput.successUrl);
    expect(url.searchParams.get('cancel_url')).toBe(testInput.cancelUrl);
    expect(url.searchParams.get('customer_email')).toBe(testUser.email);
    expect(url.searchParams.get('customer_name')).toBe(testUser.name);
  });

  it('should include customer information in checkout URL', async () => {
    // Create test user
    await db.insert(usersTable).values(testUser).execute();

    const result = await createCheckout(testInput, testUser.id);

    const url = new URL(result.checkoutUrl);
    expect(url.searchParams.get('customer_email')).toBe('test@example.com');
    expect(url.searchParams.get('customer_name')).toBe('Test User');
  });

  it('should handle special characters in URLs', async () => {
    // Create test user
    await db.insert(usersTable).values(testUser).execute();

    const inputWithSpecialChars: CreateCheckoutInput = {
      priceId: 'price_test',
      successUrl: 'https://example.com/success?param=value&other=test',
      cancelUrl: 'https://example.com/cancel?reason=user_cancelled',
    };

    const result = await createCheckout(inputWithSpecialChars, testUser.id);

    const url = new URL(result.checkoutUrl);
    expect(url.searchParams.get('success_url')).toBe(inputWithSpecialChars.successUrl);
    expect(url.searchParams.get('cancel_url')).toBe(inputWithSpecialChars.cancelUrl);
  });

  it('should throw error for non-existent user', async () => {
    // Don't create user - test with non-existent user ID
    
    await expect(createCheckout(testInput, 'non-existent-user'))
      .rejects.toThrow(/user not found/i);
  });

  it('should generate unique session IDs', async () => {
    // Create test user
    await db.insert(usersTable).values(testUser).execute();

    const result1 = await createCheckout(testInput, testUser.id);
    const result2 = await createCheckout(testInput, testUser.id);

    // Extract session IDs from URLs
    const url1 = new URL(result1.checkoutUrl);
    const url2 = new URL(result2.checkoutUrl);
    const sessionId1 = url1.pathname.split('/').pop();
    const sessionId2 = url2.pathname.split('/').pop();

    expect(sessionId1).not.toBe(sessionId2);
    expect(sessionId1).toMatch(/^cs_\d+_[a-z0-9]+$/);
    expect(sessionId2).toMatch(/^cs_\d+_[a-z0-9]+$/);
  });
});
