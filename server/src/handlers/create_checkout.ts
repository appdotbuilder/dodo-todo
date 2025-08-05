
import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type CreateCheckoutInput } from '../schema';

export async function createCheckout(
  input: CreateCheckoutInput,
  userId: string
): Promise<{ checkoutUrl: string }> {
  try {
    // Verify user exists
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (users.length === 0) {
      throw new Error('User not found');
    }

    const user = users[0];

    // In a real implementation, this would integrate with Dodo Payments API
    // For now, we'll create a mock checkout session URL
    // The URL would typically come from calling the Dodo Payments checkout API
    // with the priceId, successUrl, cancelUrl, and customer information
    
    // Generate a unique session ID for the checkout
    const sessionId = `cs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Construct checkout URL with proper query parameters
    const checkoutUrl = `https://checkout.dodopayments.com/pay/${sessionId}` +
      `?price_id=${encodeURIComponent(input.priceId)}` +
      `&success_url=${encodeURIComponent(input.successUrl)}` +
      `&cancel_url=${encodeURIComponent(input.cancelUrl)}` +
      `&customer_email=${encodeURIComponent(user.email)}` +
      `&customer_name=${encodeURIComponent(user.name)}`;

    return {
      checkoutUrl,
    };
  } catch (error) {
    console.error('Checkout creation failed:', error);
    throw error;
  }
}
