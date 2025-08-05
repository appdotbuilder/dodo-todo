
import { db } from '../db';
import { subscriptionsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function createCustomerPortal(userId: string): Promise<{ portalUrl: string }> {
  try {
    // Find the user's active subscription to get the customer ID
    const subscriptions = await db.select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.userId, userId))
      .execute();

    // Check if user has any subscriptions
    if (subscriptions.length === 0) {
      throw new Error('No subscription found for user');
    }

    // Get the customer ID from the first subscription
    // In a real implementation, you might want to handle multiple subscriptions
    const customerId = subscriptions[0].customerId;

    // Create a portal session URL using the customer ID
    // In a real implementation, this would call the Dodo Payments API
    const portalUrl = `https://portal.dodopayments.com/session_${customerId}_${Date.now()}`;

    return {
      portalUrl,
    };
  } catch (error) {
    console.error('Customer portal creation failed:', error);
    throw error;
  }
}
