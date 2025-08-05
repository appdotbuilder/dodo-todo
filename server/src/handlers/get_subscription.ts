
import { db } from '../db';
import { subscriptionsTable } from '../db/schema';
import { type Subscription } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function getSubscription(userId: string): Promise<Subscription | null> {
  try {
    // Query for active subscription for the user
    const results = await db.select()
      .from(subscriptionsTable)
      .where(
        and(
          eq(subscriptionsTable.userId, userId),
          eq(subscriptionsTable.status, 'active')
        )
      )
      .limit(1)
      .execute();

    if (results.length === 0) {
      return null;
    }

    const subscription = results[0];
    return {
      id: subscription.id,
      userId: subscription.userId,
      customerId: subscription.customerId,
      status: subscription.status,
      priceId: subscription.priceId,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
    };
  } catch (error) {
    console.error('Get subscription failed:', error);
    throw error;
  }
}
