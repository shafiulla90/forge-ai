import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature')!;

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error(`[Stripe Webhook] Error: ${err.message}`);
    return NextResponse.json({ error: 'Webhook Error' }, { status: 400 });
  }

  const supabase = await createClient();

  // Handle different event types
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as any;
      // Update user's subscription status in Supabase
      // You might need a 'subscriptions' table
      await supabase.from('user_configs').upsert({
        user_id: session.metadata.userId,
        stripe_customer_id: session.customer,
        subscription_status: 'active',
        subscription_tier: 'pro', // Map priceId to tier
      });
      break;

    case 'customer.subscription.deleted':
      const subscription = event.data.object as any;
      // Mark subscription as inactive
      await supabase.from('user_configs').update({
        subscription_status: 'canceled',
      }).eq('stripe_customer_id', subscription.customer);
      break;

    default:
      console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
