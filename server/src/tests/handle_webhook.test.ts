
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, subscriptionsTable } from '../db/schema';
import { type WebhookEvent } from '../schema';
import { handleWebhook } from '../handlers/handle_webhook';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User'
};

// Test subscription data
const subscriptionData = {
  id: 'sub-123',
  user_id: 'user-123',
  customer_id: 'cust-123',
  status: 'active',
  price_id: 'price-123',
  current_period_start: '2024-01-01T00:00:00Z',
  current_period_end: '2024-02-01T00:00:00Z'
};

describe('handleWebhook', () => {
  beforeEach(async () => {
    await createDB();
    // Create test user
    await db.insert(usersTable)
      .values(testUser)
      .execute();
  });

  afterEach(resetDB);

  describe('subscription.created', () => {
    it('should create a new subscription', async () => {
      const event: WebhookEvent = {
        id: 'evt-123',
        type: 'subscription.created',
        data: subscriptionData
      };

      const result = await handleWebhook(event);

      expect(result.success).toBe(true);

      // Verify subscription was created
      const subscriptions = await db.select()
        .from(subscriptionsTable)
        .where(eq(subscriptionsTable.id, 'sub-123'))
        .execute();

      expect(subscriptions).toHaveLength(1);
      expect(subscriptions[0].id).toEqual('sub-123');
      expect(subscriptions[0].userId).toEqual('user-123');
      expect(subscriptions[0].customerId).toEqual('cust-123');
      expect(subscriptions[0].status).toEqual('active');
      expect(subscriptions[0].priceId).toEqual('price-123');
      expect(subscriptions[0].currentPeriodStart).toBeInstanceOf(Date);
      expect(subscriptions[0].currentPeriodEnd).toBeInstanceOf(Date);
    });

    it('should throw error for missing required fields', async () => {
      const event: WebhookEvent = {
        id: 'evt-123',
        type: 'subscription.created',
        data: {
          id: 'sub-123',
          // Missing required fields
        }
      };

      await expect(handleWebhook(event)).rejects.toThrow(/Missing required subscription data/i);
    });
  });

  describe('subscription.updated', () => {
    beforeEach(async () => {
      // Create initial subscription
      await db.insert(subscriptionsTable)
        .values({
          id: 'sub-123',
          userId: 'user-123',
          customerId: 'cust-123',
          status: 'active',
          priceId: 'price-123',
          currentPeriodStart: new Date('2024-01-01'),
          currentPeriodEnd: new Date('2024-02-01')
        })
        .execute();
    });

    it('should update subscription status', async () => {
      const event: WebhookEvent = {
        id: 'evt-123',
        type: 'subscription.updated',
        data: {
          id: 'sub-123',
          status: 'inactive'
        }
      };

      const result = await handleWebhook(event);

      expect(result.success).toBe(true);

      // Verify subscription was updated
      const subscriptions = await db.select()
        .from(subscriptionsTable)
        .where(eq(subscriptionsTable.id, 'sub-123'))
        .execute();

      expect(subscriptions[0].status).toEqual('inactive');
    });

    it('should update period dates', async () => {
      const event: WebhookEvent = {
        id: 'evt-123',
        type: 'subscription.updated',
        data: {
          id: 'sub-123',
          current_period_start: '2024-02-01T00:00:00Z',
          current_period_end: '2024-03-01T00:00:00Z'
        }
      };

      const result = await handleWebhook(event);

      expect(result.success).toBe(true);

      // Verify dates were updated
      const subscriptions = await db.select()
        .from(subscriptionsTable)
        .where(eq(subscriptionsTable.id, 'sub-123'))
        .execute();

      expect(subscriptions[0].currentPeriodStart).toEqual(new Date('2024-02-01T00:00:00Z'));
      expect(subscriptions[0].currentPeriodEnd).toEqual(new Date('2024-03-01T00:00:00Z'));
    });

    it('should throw error for missing subscription id', async () => {
      const event: WebhookEvent = {
        id: 'evt-123',
        type: 'subscription.updated',
        data: {
          status: 'inactive'
          // Missing id
        }
      };

      await expect(handleWebhook(event)).rejects.toThrow(/Missing subscription id/i);
    });
  });

  describe('subscription.canceled', () => {
    beforeEach(async () => {
      // Create initial subscription
      await db.insert(subscriptionsTable)
        .values({
          id: 'sub-123',
          userId: 'user-123',
          customerId: 'cust-123',
          status: 'active',
          priceId: 'price-123',
          currentPeriodStart: new Date('2024-01-01'),
          currentPeriodEnd: new Date('2024-02-01')
        })
        .execute();
    });

    it('should cancel subscription', async () => {
      const event: WebhookEvent = {
        id: 'evt-123',
        type: 'subscription.canceled',
        data: {
          id: 'sub-123'
        }
      };

      const result = await handleWebhook(event);

      expect(result.success).toBe(true);

      // Verify subscription was canceled
      const subscriptions = await db.select()
        .from(subscriptionsTable)
        .where(eq(subscriptionsTable.id, 'sub-123'))
        .execute();

      expect(subscriptions[0].status).toEqual('canceled');
    });
  });

  describe('payment events', () => {
    beforeEach(async () => {
      // Create initial subscription
      await db.insert(subscriptionsTable)
        .values({
          id: 'sub-123',
          userId: 'user-123',
          customerId: 'cust-123',
          status: 'past_due',
          priceId: 'price-123',
          currentPeriodStart: new Date('2024-01-01'),
          currentPeriodEnd: new Date('2024-02-01')
        })
        .execute();
    });

    it('should handle payment.succeeded for subscription', async () => {
      const event: WebhookEvent = {
        id: 'evt-123',
        type: 'payment.succeeded',
        data: {
          subscription_id: 'sub-123',
          amount: 2000
        }
      };

      const result = await handleWebhook(event);

      expect(result.success).toBe(true);

      // Verify subscription is active after successful payment
      const subscriptions = await db.select()
        .from(subscriptionsTable)
        .where(eq(subscriptionsTable.id, 'sub-123'))
        .execute();

      expect(subscriptions[0].status).toEqual('active');
    });

    it('should handle payment.failed for subscription', async () => {
      const event: WebhookEvent = {
        id: 'evt-123',
        type: 'payment.failed',
        data: {
          subscription_id: 'sub-123',
          error: 'Card declined'
        }
      };

      const result = await handleWebhook(event);

      expect(result.success).toBe(true);

      // Verify subscription is past due after failed payment
      const subscriptions = await db.select()
        .from(subscriptionsTable)
        .where(eq(subscriptionsTable.id, 'sub-123'))
        .execute();

      expect(subscriptions[0].status).toEqual('past_due');
    });

    it('should handle payment events without subscription_id', async () => {
      const event: WebhookEvent = {
        id: 'evt-123',
        type: 'payment.succeeded',
        data: {
          amount: 500,
          // No subscription_id - one-time payment
        }
      };

      const result = await handleWebhook(event);

      expect(result.success).toBe(true);
      // Should not throw error or modify any subscriptions
    });
  });

  describe('unknown event types', () => {
    it('should handle unknown event types gracefully', async () => {
      const event: WebhookEvent = {
        id: 'evt-123',
        type: 'unknown.event',
        data: {
          some: 'data'
        }
      };

      const result = await handleWebhook(event);

      expect(result.success).toBe(true);
      // Should not throw error for unknown event types
    });
  });
});
