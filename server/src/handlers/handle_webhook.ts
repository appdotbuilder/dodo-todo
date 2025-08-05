
import { db } from '../db';
import { subscriptionsTable } from '../db/schema';
import { type WebhookEvent } from '../schema';
import { eq } from 'drizzle-orm';

export async function handleWebhook(event: WebhookEvent): Promise<{ success: boolean }> {
  try {
    console.log(`Processing webhook event: ${event.type}`, event.data);
    
    // Handle different event types
    switch (event.type) {
      case 'subscription.created':
        await handleSubscriptionCreated(event.data);
        break;
      case 'subscription.updated':
        await handleSubscriptionUpdated(event.data);
        break;
      case 'subscription.canceled':
        await handleSubscriptionCanceled(event.data);
        break;
      case 'payment.succeeded':
        await handlePaymentSucceeded(event.data);
        break;
      case 'payment.failed':
        await handlePaymentFailed(event.data);
        break;
      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Webhook processing failed:', error);
    throw error;
  }
}

async function handleSubscriptionCreated(data: Record<string, any>): Promise<void> {
  const {
    id,
    user_id,
    customer_id,
    status,
    price_id,
    current_period_start,
    current_period_end
  } = data;

  if (!id || !user_id || !customer_id || !status || !price_id || !current_period_start || !current_period_end) {
    throw new Error('Missing required subscription data');
  }

  await db.insert(subscriptionsTable)
    .values({
      id,
      userId: user_id,
      customerId: customer_id,
      status: status as 'active' | 'inactive' | 'canceled' | 'past_due',
      priceId: price_id,
      currentPeriodStart: new Date(current_period_start),
      currentPeriodEnd: new Date(current_period_end)
    })
    .execute();
}

async function handleSubscriptionUpdated(data: Record<string, any>): Promise<void> {
  const {
    id,
    status,
    current_period_start,
    current_period_end
  } = data;

  if (!id) {
    throw new Error('Missing subscription id');
  }

  const updateData: any = {};
  
  if (status) {
    updateData.status = status;
  }
  if (current_period_start) {
    updateData.currentPeriodStart = new Date(current_period_start);
  }
  if (current_period_end) {
    updateData.currentPeriodEnd = new Date(current_period_end);
  }

  if (Object.keys(updateData).length === 0) {
    return; // Nothing to update
  }

  await db.update(subscriptionsTable)
    .set(updateData)
    .where(eq(subscriptionsTable.id, id))
    .execute();
}

async function handleSubscriptionCanceled(data: Record<string, any>): Promise<void> {
  const { id } = data;

  if (!id) {
    throw new Error('Missing subscription id');
  }

  await db.update(subscriptionsTable)
    .set({ status: 'canceled' })
    .where(eq(subscriptionsTable.id, id))
    .execute();
}

async function handlePaymentSucceeded(data: Record<string, any>): Promise<void> {
  const { subscription_id } = data;

  if (!subscription_id) {
    return; // Not a subscription payment, nothing to update
  }

  // Ensure subscription is active after successful payment
  await db.update(subscriptionsTable)
    .set({ status: 'active' })
    .where(eq(subscriptionsTable.id, subscription_id))
    .execute();
}

async function handlePaymentFailed(data: Record<string, any>): Promise<void> {
  const { subscription_id } = data;

  if (!subscription_id) {
    return; // Not a subscription payment, nothing to update
  }

  // Mark subscription as past due after failed payment
  await db.update(subscriptionsTable)
    .set({ status: 'past_due' })
    .where(eq(subscriptionsTable.id, subscription_id))
    .execute();
}
